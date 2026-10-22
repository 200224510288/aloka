import { NextRequest, NextResponse } from 'next/server';
import { STANDARD_LOTTERIES } from '@/lib/constants';
import { LotteryResultItem, AiVerificationReport, AiLotteryAuditResult } from '@/types/lottery';
import { extractLotteryDataFromText } from '@/lib/extractor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Deterministic local verification engine comparing extracted sheet lotteries
 * against the raw text of the LK lottery source document.
 */
export function performLocalLkSheetVerification(
  lotteries: LotteryResultItem[],
  rawText: string,
  date: string,
  sourceFileName?: string,
  isFallback: boolean = false
): AiVerificationReport {
  // If rawText is completely empty
  if (!rawText || !rawText.trim()) {
    return {
      timestamp: new Date().toISOString(),
      model: isFallback ? 'LK Sheet Verifier (Deterministic Fallback)' : 'LK Sheet Verifier (Deterministic Engine)',
      totalLotteries: STANDARD_LOTTERIES.length,
      verifiedCount: 0,
      mismatchCount: 0,
      missingCount: STANDARD_LOTTERIES.length,
      dateCheck: {
        sheetDate: date || '',
        detectedDateInSource: '',
        isDateMatch: true,
      },
      overallStatus: 'inconclusive',
      summary: 'No source document text was found to audit against. Please upload the raw LK lottery sheet first.',
      results: STANDARD_LOTTERIES.map(def => {
        const extractedItem = lotteries.find(l => l.lotteryId === def.id);
        return {
          lotteryId: def.id,
          nameSi: def.nameSi,
          nameEn: def.nameEn,
          board: def.board,
          status: 'unverified' as const,
          confidence: 50,
          extracted: {
            drawNo: extractedItem?.drawNo || '',
            letter: extractedItem?.letter || '',
            zodiac: extractedItem?.zodiac || '',
            numbers: extractedItem?.numbers || [],
            bonusNumber: extractedItem?.bonusNumber || '',
            isNoDraw: !!extractedItem?.isNoDraw,
          },
          discrepancies: ['No source text available to verify'],
        };
      }),
      tokenUsage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
      },
    };
  }

  // Parse using Sinhala lottery parser (targetDate, fileName)
  const parsed = extractLotteryDataFromText(rawText, date, sourceFileName || 'document.pdf');
  const matchedInDoc = parsed.matchedLotteries || [];

  const cleanNum = (n: string, isSingleDigit: boolean) => {
    const d = n.replace(/[^\d]/g, '');
    if (isSingleDigit) return d;
    return d.length === 1 ? `0${d}` : d;
  };

  const cleanDraw = (d?: string) => (d || '').replace(/[^\d]/g, '').trim();
  const cleanLet = (l?: string) => (l || '').replace(/[^A-Za-z]/g, '').trim().toUpperCase();
  const cleanZod = (z?: string) => (z || '').replace(/[\s\t\u0000\u200b-\u200d]/g, '').trim();

  const enrichedResults: AiLotteryAuditResult[] = STANDARD_LOTTERIES.map(def => {
    const sheetItem = lotteries.find(l => l.lotteryId === def.id);
    const docItem = matchedInDoc.find(m => m.lotteryId === def.id);

    const extractedState = {
      drawNo: sheetItem?.drawNo || '',
      letter: sheetItem?.letter || '',
      zodiac: sheetItem?.zodiac || '',
      numbers: sheetItem?.numbers || [],
      bonusNumber: sheetItem?.bonusNumber || '',
      isNoDraw: !!sheetItem?.isNoDraw,
    };

    if (!docItem) {
      if (sheetItem?.isNoDraw) {
        return {
          lotteryId: def.id,
          nameSi: def.nameSi,
          nameEn: def.nameEn,
          board: def.board,
          status: 'verified' as const,
          confidence: 99,
          extracted: extractedState,
          notes: 'Marked as No Draw',
          discrepancies: [],
        };
      }
      return {
        lotteryId: def.id,
        nameSi: def.nameSi,
        nameEn: def.nameEn,
        board: def.board,
        status: 'missing_in_source' as const,
        confidence: 70,
        extracted: extractedState,
        discrepancies: ['Not detected in LK lottery raw sheet'],
      };
    }

    const verifiedInSource = {
      drawNo: docItem.drawNo || '',
      letter: docItem.letter || '',
      zodiac: docItem.zodiac || '',
      numbers: docItem.numbers || [],
      bonusNumber: docItem.bonusNumber || '',
    };

    const discrepancies: string[] = [];

    // 1. Draw number comparison
    if (cleanDraw(sheetItem?.drawNo) !== cleanDraw(docItem.drawNo)) {
      if (sheetItem?.drawNo || docItem.drawNo) {
        discrepancies.push(`Draw number mismatch: sheet has "${sheetItem?.drawNo || ''}" but source has "${docItem.drawNo || ''}"`);
      }
    }

    // 2. Letter comparison
    if (def.requiresLetter) {
      if (cleanLet(sheetItem?.letter) !== cleanLet(docItem.letter)) {
        discrepancies.push(`Letter mismatch: sheet has "${sheetItem?.letter || ''}" but source has "${docItem.letter || ''}"`);
      }
    }

    // 3. Zodiac comparison
    if (def.requiresZodiac) {
      const sheetZod = cleanZod(sheetItem?.zodiac);
      const docZod = cleanZod(docItem.zodiac);
      const normZ = (z: string) => z.replace('කනා', 'කන්‍යා').replace('ක‍නා', 'කන්‍යා');
      if (normZ(sheetZod) !== normZ(docZod)) {
        discrepancies.push(`Zodiac mismatch: sheet has "${sheetItem?.zodiac || ''}" but source has "${docItem.zodiac || ''}"`);
      }
    }

    // 4. Numbers comparison
    const isSingleDigits = def.fieldType === 'letter_and_digits';
    const sheetNumbers = (sheetItem?.numbers || []).map(n => cleanNum(n, isSingleDigits)).filter(Boolean);
    const docNumbers = (docItem.numbers || []).map(n => cleanNum(n, isSingleDigits)).filter(Boolean);

    if (isSingleDigits) {
      if (sheetNumbers.join('') !== docNumbers.join('')) {
        discrepancies.push(`Numbers mismatch: sheet has [${sheetNumbers.join(', ')}] but source has [${docNumbers.join(', ')}]`);
      }
    } else {
      const exactMatch = sheetNumbers.join(',') === docNumbers.join(',');
      const sortedMatch = [...sheetNumbers].sort().join(',') === [...docNumbers].sort().join(',');
      if (!exactMatch && !sortedMatch) {
        discrepancies.push(`Numbers mismatch: sheet has [${sheetNumbers.join(', ')}] but source has [${docNumbers.join(', ')}]`);
      }
    }

    // 5. Bonus number comparison
    if (def.hasBonusNumber) {
      const sheetBonus = (sheetItem?.bonusNumber || '').replace(/[^\d]/g, '').trim();
      const docBonus = (docItem.bonusNumber || '').replace(/[^\d]/g, '').trim();
      if (sheetBonus && docBonus && sheetBonus !== docBonus) {
        discrepancies.push(`Bonus number mismatch: sheet has "${sheetItem?.bonusNumber}" but source has "${docItem.bonusNumber}"`);
      }
    }

    const hasMismatch = discrepancies.length > 0;

    return {
      lotteryId: def.id,
      nameSi: def.nameSi,
      nameEn: def.nameEn,
      board: def.board,
      status: hasMismatch ? ('mismatch' as const) : ('verified' as const),
      confidence: hasMismatch ? 92 : 98,
      extracted: extractedState,
      verifiedInSource,
      discrepancies,
      suggestedFix: hasMismatch ? {
        drawNo: docItem.drawNo || sheetItem?.drawNo,
        letter: docItem.letter || sheetItem?.letter,
        zodiac: docItem.zodiac || sheetItem?.zodiac,
        numbers: (docItem.numbers && docItem.numbers.length > 0) ? docItem.numbers : sheetItem?.numbers,
        bonusNumber: docItem.bonusNumber || sheetItem?.bonusNumber,
      } : undefined,
    };
  });

  const verifiedCount = enrichedResults.filter(r => r.status === 'verified').length;
  const mismatchCount = enrichedResults.filter(r => r.status === 'mismatch').length;
  const missingCount = enrichedResults.filter(r => r.status === 'missing_in_source').length;

  const isDateMatch = !parsed.detectedDate || !date || parsed.detectedDate === date;
  const dateCheck = {
    sheetDate: date || '',
    detectedDateInSource: parsed.detectedDate || date || '',
    isDateMatch,
  };

  const footerAnnouncementCheck = parsed.detectedFooterAnnouncement ? {
    current: '',
    detectedInSource: parsed.detectedFooterAnnouncement,
  } : undefined;

  const overallStatus: 'perfect_match' | 'discrepancies_found' = mismatchCount > 0 ? 'discrepancies_found' : 'perfect_match';
  const summary = mismatchCount > 0
    ? `${mismatchCount} discrepancy flagged when verifying against raw LK lottery sheet.`
    : `All ${verifiedCount} lotteries verified matching raw LK lottery sheet perfectly (100% Match).`;

  return {
    timestamp: new Date().toISOString(),
    model: isFallback ? 'LK Sheet Verifier (Deterministic Fallback)' : 'LK Sheet Verifier (Deterministic Engine)',
    totalLotteries: enrichedResults.length,
    verifiedCount,
    mismatchCount,
    missingCount,
    dateCheck,
    footerAnnouncementCheck,
    overallStatus,
    summary,
    results: enrichedResults,
    tokenUsage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      remainingTokensPerMinute: null,
      limitTokensPerMinute: null,
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      date,
      lotteries,
      rawText,
      imageBase64,
      sourceFileName,
      filePath,
      apiKey: userApiKey,
    } = body;

    if (!lotteries || !Array.isArray(lotteries)) {
      return NextResponse.json(
        { success: false, error: 'No lottery data provided for verification' },
        { status: 400 }
      );
    }

    // Auto-resolve raw OCR text if missing from client request
    let finalRawText = (rawText && typeof rawText === 'string') ? rawText.trim() : '';

    if (!finalRawText && date) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        // 1. Try local data/sheets/${date}.json
        const localSheetPath = path.join(process.cwd(), 'data', 'sheets', `${date}.json`);
        if (fs.existsSync(localSheetPath)) {
          const fileData = JSON.parse(fs.readFileSync(localSheetPath, 'utf8'));
          if (fileData.sources && fileData.sources[0]?.extractedText) {
            finalRawText = fileData.sources[0].extractedText;
          }
        }

        // 2. Try file from filePath or public/uploads/${date}
        if (!finalRawText) {
          const uploadDir = path.join(process.cwd(), 'public', 'uploads', date);
          if (fs.existsSync(uploadDir)) {
            const pdfs = fs.readdirSync(uploadDir).filter(f => f.toLowerCase().endsWith('.pdf'));
            if (pdfs.length > 0) {
              const { extractTextFromPdfBuffer } = await import('@/lib/pdf-text-extractor');
              const extracted = await extractTextFromPdfBuffer(fs.readFileSync(path.join(uploadDir, pdfs[0])));
              if (extracted?.text) {
                finalRawText = extracted.text;
              }
            } else {
              const images = fs.readdirSync(uploadDir).filter(f => /\.(jpe?g|png)$/i.test(f));
              if (images.length > 0) {
                const { extractTextFromImageBuffer } = await import('@/lib/image-ocr-extractor');
                const extracted = await extractTextFromImageBuffer(fs.readFileSync(path.join(uploadDir, images[0])));
                if (extracted?.text) {
                  finalRawText = extracted.text;
                }
              }
            }
          }
        }
      } catch (diskErr) {
        console.warn('Could not auto-resolve raw text for verification:', diskErr);
      }
    }

    // Also check filePath if provided
    if (!finalRawText && filePath) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const filename = path.basename(filePath);
        const resolvedPath = path.isAbsolute(filePath)
          ? filePath
          : path.join(process.cwd(), 'public', 'uploads', filename);
        if (fs.existsSync(resolvedPath)) {
          if (resolvedPath.toLowerCase().endsWith('.pdf')) {
            const { extractTextFromPdfBuffer } = await import('@/lib/pdf-text-extractor');
            const extracted = await extractTextFromPdfBuffer(fs.readFileSync(resolvedPath));
            if (extracted?.text) {
              finalRawText = extracted.text;
            }
          } else if (/\.(jpe?g|png)$/i.test(resolvedPath)) {
            const { extractTextFromImageBuffer } = await import('@/lib/image-ocr-extractor');
            const extracted = await extractTextFromImageBuffer(fs.readFileSync(resolvedPath));
            if (extracted?.text) {
              finalRawText = extracted.text;
            }
          }
        }
      } catch (diskErr) {
        console.warn('Could not extract text from filePath:', diskErr);
      }
    }

    const rawApiKey = (userApiKey || process.env.OPENAI_API_KEY || '').trim();
    // Validate if the key looks like an actual OpenAI key (avoid known expired placeholder keys)
    const hasValidOpenAiKey = 
      rawApiKey.startsWith('sk-') && 
      rawApiKey.length > 25 && 
      !rawApiKey.includes('Rva3UCZ8');

    // If no valid OpenAI key is configured, perform deterministic LK lottery sheet verification immediately!
    if (!hasValidOpenAiKey) {
      const localReport = performLocalLkSheetVerification(
        lotteries,
        finalRawText,
        date,
        sourceFileName,
        false
      );
      return NextResponse.json({
        success: true,
        report: localReport,
      });
    }

    // Build lottery reference context for OpenAI auditor
    const lotteryContext = STANDARD_LOTTERIES.map(def => ({
      id: def.id,
      nameSi: def.nameSi,
      nameEn: def.nameEn,
      board: def.board,
      requiresLetter: def.requiresLetter,
      requiresZodiac: def.requiresZodiac,
      hasBonusNumber: !!def.hasBonusNumber,
      isTieredDigits: !!def.isTieredDigits,
      numberCount: def.numberCount,
    }));

    const systemPrompt = `You are an elite, meticulous Sri Lankan Lottery Result Verification Auditor.
Your job is to perform a strict "Second Verification" comparing raw source documents (image and/or OCR text) against extracted lottery numbers.

Reference of 18 Standard Lotteries:
${JSON.stringify(lotteryContext, null, 2)}

Sinhala Zodiac Signs (12):
මේෂ (Aries ♈), වෘෂභ (Taurus ♉), මිථුන (Gemini ♊), කටක (Cancer ♋), සිංහ (Leo ♌), කන්‍යා (Virgo ♍), තුලා (Libra ♎), වෘශ්චික (Scorpio ♏), ධනු (Sagittarius ♐), මකර (Capricorn ♑), කුම්භ (Aquarius ♒), මීන (Pisces ♓).
Note on OCR errors: "ක නා" or "ක\tන\u0000ා" or "කනා" is ALWAYS "කන්‍යා" (Virgo). Ligature spaces like "වෘ ෂභ" or "තු ලා" are identical to "වෘෂභ" and "තුලා".

CRITICAL LOTTERY-SPECIFIC NUMBER RULES:
1. Ada Sampatha (NLB): Winning numbers are TIERED in length:
   - Tier 1: 2 digits (e.g. "32")
   - Tier 2: 3 digits (e.g. "832") -> THIS IS NOT A TYPO! Do NOT suggest shortening "832" to "83"!
   - Tier 3: 4 digits (e.g. "6832") -> THIS IS NOT A TYPO! Do NOT suggest shortening!
   - Letter: 1 English letter (e.g. "V")
2. Jaya Sampatha (NLB): Also TIERED in length:
   - Tier 1: 2 digits (e.g. "23")
   - Tier 2: 3 digits (e.g. "323")
   - Tier 3: 4 digits (e.g. "7323")
   - Letter: 1 English letter (e.g. "A")
3. Mahajana Sampatha (DLB) & Supiri Dhana Sampatha (DLB): 6 single digits (e.g. ["1", "5", "6", "8", "3", "2"]).
4. Ayubo (NLB) & NLB Jaya (NLB): 4 single digits (e.g. ["9", "2", "6", "8"]).
5. Sasiri (NLB): 3 two-digit numbers (e.g. ["01", "04", "05"]).

STRICT RULES FOR AUDITING:
1. GROUND TRUTH RULE: If the sheet's extracted values (draw number, numbers, letter, zodiac, bonus) MATCH what is visible/detected in the source document, status MUST BE "verified".
   - NEVER invent a discrepancy or suggest a fix if the sheet already matches what is printed in the source document!
   - Look at your own "DETECTED IN SOURCE DOCUMENT": if it matches the sheet, it is 100% "verified".
2. Treat leading zeros (e.g. "02" vs "2") and cosmetic whitespace ("9 2 6 8" vs "9268") as matching.
3. Treat astrological glyphs (e.g. ♎) and Sinhala names ("තුලා") as matching.
4. ONLY mark status as "mismatch" if there is a REAL, UNAMBIGUOUS ERROR where the sheet has a completely different number/letter than what is clearly printed on the paper source.
5. If status is "verified", discrepancies MUST be empty array [] and suggestedFix MUST be empty object {}.

Output MUST be a pure JSON object conforming to this exact schema:
{
  "summary": "Concise summary of audit findings",
  "overallStatus": "perfect_match" | "discrepancies_found" | "inconclusive",
  "verifiedCount": number,
  "mismatchCount": number,
  "missingCount": number,
  "dateCheck": {
    "sheetDate": "YYYY-MM-DD",
    "detectedDateInSource": "YYYY-MM-DD or null",
    "isDateMatch": boolean
  },
  "footerAnnouncementCheck": {
    "current": "string or empty",
    "detectedInSource": "string or null"
  },
  "results": [
    {
      "lotteryId": "string (matching one of 18 ids)",
      "nameSi": "Sinhala name",
      "nameEn": "English name",
      "board": "DLB" | "NLB",
      "status": "verified" | "mismatch" | "missing_in_source" | "unverified",
      "confidence": number (80-100),
      "extracted": {
        "drawNo": "string",
        "letter": "string or empty",
        "zodiac": "string or empty",
        "numbers": ["string"],
        "bonusNumber": "string or empty",
        "isNoDraw": boolean
      },
      "verifiedInSource": {
        "drawNo": "string",
        "letter": "string or empty",
        "zodiac": "string or empty",
        "numbers": ["string"],
        "bonusNumber": "string or empty"
      },
      "discrepancies": ["specific difference description if any"],
      "suggestedFix": {
        "drawNo": "optional corrected",
        "letter": "optional corrected",
        "zodiac": "optional corrected",
        "numbers": ["optional corrected"],
        "bonusNumber": "optional corrected"
      },
      "notes": "short note"
    }
  ]
}`;

    const userPromptText = `Please audit the following extracted sheet for date ${date}:

Target Sheet Date: ${date}
Source File Name: ${sourceFileName || 'Uploaded source document'}

Extracted Rows in Sheet (${lotteries.length} lotteries):
${JSON.stringify(lotteries.map(l => ({
  lotteryId: l.lotteryId,
  drawNo: l.drawNo,
  letter: l.letter || '',
  zodiac: l.zodiac || '',
  numbers: l.numbers || [],
  bonusNumber: l.bonusNumber || '',
  isNoDraw: !!l.isNoDraw,
})), null, 2)}

${finalRawText ? `Raw Extracted OCR Text from Document:\n${finalRawText}` : ''}
`;

    const userContent: any[] = [];

    // If an image was passed, attach it for multimodal verification
    if (imageBase64 && imageBase64.startsWith('data:image/')) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: imageBase64,
          detail: 'high',
        },
      });
    }

    userContent.push({
      type: 'text',
      text: userPromptText,
    });

    // Attempt OpenAI verification audit with automatic fallback to deterministic LK sheet verification
    let openaiRes: Response | null = null;
    try {
      openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${rawApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      });
    } catch (fetchErr: any) {
      console.warn('OpenAI network fetch error, falling back to local LK verifier:', fetchErr?.message);
      const fallbackReport = performLocalLkSheetVerification(
        lotteries,
        finalRawText,
        date,
        sourceFileName,
        true
      );
      return NextResponse.json({ success: true, report: fallbackReport });
    }

    if (!openaiRes || !openaiRes.ok) {
      const errText = openaiRes ? await openaiRes.text() : 'No response';
      console.warn(`OpenAI API returned status ${openaiRes?.status || 'unknown'}: ${errText}. Using local LK sheet verifier fallback.`);
      const fallbackReport = performLocalLkSheetVerification(
        lotteries,
        finalRawText,
        date,
        sourceFileName,
        true
      );
      return NextResponse.json({ success: true, report: fallbackReport });
    }

    const rateLimitRemainingTokens = openaiRes.headers.get('x-ratelimit-remaining-tokens');
    const rateLimitLimitTokens = openaiRes.headers.get('x-ratelimit-limit-tokens');

    const aiData = await openaiRes.json();
    const rawContent = aiData.choices?.[0]?.message?.content;

    const promptTokens = aiData.usage?.prompt_tokens || 0;
    const completionTokens = aiData.usage?.completion_tokens || 0;
    const totalTokens = aiData.usage?.total_tokens || 0;
    // gpt-4o-mini pricing: $0.15/1M input, $0.60/1M output
    const estimatedCostUsd = Number(((promptTokens * 0.00000015) + (completionTokens * 0.0000006)).toFixed(6));

    if (!rawContent) {
      console.warn('Empty content from OpenAI, falling back to local verifier');
      const fallbackReport = performLocalLkSheetVerification(
        lotteries,
        finalRawText,
        date,
        sourceFileName,
        true
      );
      return NextResponse.json({ success: true, report: fallbackReport });
    }

    let parsedReport: any;
    try {
      parsedReport = JSON.parse(rawContent);
    } catch (parseErr) {
      console.warn('Failed to parse OpenAI JSON output, falling back to local verifier');
      const fallbackReport = performLocalLkSheetVerification(
        lotteries,
        finalRawText,
        date,
        sourceFileName,
        true
      );
      return NextResponse.json({ success: true, report: fallbackReport });
    }

    // Enrich report with standard lottery metadata if omitted by AI
    const enrichedResults: AiLotteryAuditResult[] = STANDARD_LOTTERIES.map(def => {
      const found = parsedReport.results?.find((r: any) => r.lotteryId === def.id);
      const extractedItem = lotteries.find(l => l.lotteryId === def.id);

      if (found) {
        const discrepancies = Array.isArray(found.discrepancies)
          ? found.discrepancies.filter((d: any) => typeof d === 'string' && d.trim().length > 0)
          : [];
        const hasActualDiscrepancy = discrepancies.length > 0;

        let normalizedStatus: 'verified' | 'mismatch' | 'missing_in_source' | 'unverified' = found.status;
        if (!hasActualDiscrepancy && (normalizedStatus === 'mismatch' || !normalizedStatus)) {
          normalizedStatus = 'verified';
        } else if (hasActualDiscrepancy) {
          normalizedStatus = 'mismatch';
        }

        return {
          ...found,
          status: normalizedStatus,
          discrepancies,
          nameSi: def.nameSi,
          nameEn: def.nameEn,
          board: def.board,
        };
      }

      return {
        lotteryId: def.id,
        nameSi: def.nameSi,
        nameEn: def.nameEn,
        board: def.board,
        status: 'unverified',
        confidence: 50,
        extracted: {
          drawNo: extractedItem?.drawNo || '',
          letter: extractedItem?.letter || '',
          zodiac: extractedItem?.zodiac || '',
          numbers: extractedItem?.numbers || [],
          bonusNumber: extractedItem?.bonusNumber || '',
          isNoDraw: !!extractedItem?.isNoDraw,
        },
        discrepancies: ['Not found in source document or extraction'],
      };
    });

    const report: AiVerificationReport = {
      timestamp: new Date().toISOString(),
      model: aiData.model || 'gpt-4o-mini',
      totalLotteries: enrichedResults.length,
      verifiedCount: enrichedResults.filter(r => r.status === 'verified').length,
      mismatchCount: enrichedResults.filter(r => r.status === 'mismatch').length,
      missingCount: enrichedResults.filter(r => r.status === 'missing_in_source').length,
      dateCheck: parsedReport.dateCheck || {
        sheetDate: date,
        detectedDateInSource: date,
        isDateMatch: true,
      },
      footerAnnouncementCheck: parsedReport.footerAnnouncementCheck,
      overallStatus:
        enrichedResults.some(r => r.status === 'mismatch')
          ? 'discrepancies_found'
          : 'perfect_match',
      summary:
        enrichedResults.some(r => r.status === 'mismatch')
          ? parsedReport.summary || 'Discrepancies detected during AI audit.'
          : 'All 18 lotteries verified matching raw source document perfectly (100% Match).',
      results: enrichedResults,
      tokenUsage: {
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCostUsd,
        remainingTokensPerMinute: rateLimitRemainingTokens,
        limitTokensPerMinute: rateLimitLimitTokens,
      },
    };

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('AI Verify handler error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Verification Error' },
      { status: 500 }
    );
  }
}
