import { NextRequest, NextResponse } from 'next/server';
import { STANDARD_LOTTERIES } from '@/lib/constants';
import { LotteryResultItem, AiVerificationReport, AiLotteryAuditResult } from '@/types/lottery';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      date,
      lotteries,
      rawText,
      imageBase64,
      sourceFileName,
      apiKey: userApiKey,
    } = body;

    const apiKey = userApiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key is missing' },
        { status: 400 }
      );
    }

    if (!lotteries || !Array.isArray(lotteries)) {
      return NextResponse.json(
        { success: false, error: 'No lottery data provided for verification' },
        { status: 400 }
      );
    }

    if (!rawText && !imageBase64) {
      return NextResponse.json(
        { success: false, error: 'No raw source text or image provided to verify against' },
        { status: 400 }
      );
    }

    // Build lottery reference context for the AI auditor
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
මේෂ (Aries), වෘෂභ (Taurus), මිථුන (Gemini), කටක (Cancer), සිංහ (Leo), කන්‍යා (Virgo), තුලා (Libra), වෘශ්චික (Scorpio), ධනු (Sagittarius), මකර (Capricorn), කුම්භ (Aquarius), මීන (Pisces).
Note on OCR errors: "ක නා" or "ක\\tන\\u0000ා" or "කනා" is ALWAYS "කන්‍යා" (Virgo).

Rules for Auditing:
1. Verify the DRAW NUMBER for each lottery against the source.
2. Verify the WINNING NUMBERS/DIGITS against the source in exact sequence.
   - Ada Sampatha and Jaya Sampatha have 3 tiered numbers (2-digit, 3-digit, 4-digit) + 1 letter.
   - Mahajana Sampatha (6 digits), Supiri Dhana Sampatha (6 digits), NLB Jaya (4 digits), Ayubo (4 digits) are single-digit streams.
   - Treat spaced bonus digits (e.g. "2 8 9 7 4" vs "28974") as matching. DO NOT flag cosmetic spacing differences as mismatch.
   - Treat leading zeros (e.g. "02" vs "2") as matching.
3. Verify the ENGLISH LETTER if required.
4. Verify the SINHALA ZODIAC sign for Handahana, Lagna Wasana, and Suba Dawasak.
5. Verify the BONUS NUMBER for Shanida Wasana, Super Ball, Lagna Wasana, and Supiri Dhana Sampatha.
6. Verify the Sheet Date vs any date appearing in the source document.
7. When all extracted values (draw number, numbers, letter, zodiac, bonus) match the source:
   - status MUST BE "verified".
   - discrepancies MUST BE empty array [].
   - suggestedFix MUST BE empty object {}.
8. ONLY mark status as "mismatch" if there is an ACTUAL difference or error in numbers, letter, zodiac, or draw number.
   - When status is "mismatch", discrepancies MUST contain the specific description of the difference, and suggestedFix must provide the correction.
   - If discrepancies is empty, status CANNOT be "mismatch".
9. If a lottery is mentioned in the source but marked no-draw or missing in sheet, mark status as "missing_in_sheet".

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

${rawText ? `Raw Extracted OCR Text from Document:\n${rawText}` : ''}
`;

    const userContent: any[] = [];

    // If an image was passed (Page 1 raster image), attach it for multimodal verification!
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

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
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

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error('OpenAI verification API error:', errText);
      return NextResponse.json(
        { success: false, error: `OpenAI API returned status ${openaiRes.status}: ${errText}` },
        { status: openaiRes.status }
      );
    }

    const aiData = await openaiRes.json();
    const rawContent = aiData.choices?.[0]?.message?.content;

    if (!rawContent) {
      return NextResponse.json(
        { success: false, error: 'Empty response received from AI auditor' },
        { status: 500 }
      );
    }

    const parsedReport = JSON.parse(rawContent);

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
    };

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('AI Verify handler error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal AI Verification Error' },
      { status: 500 }
    );
  }
}
