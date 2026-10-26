/**
 * Singlish (Sinhala Phonetic) Transliteration Utility
 * 
 * Accurately transliterates phonetic Romanized English ("Singlish") into
 * authentic Sinhala Unicode, matching Sri Lankan lottery announcement conventions.
 * 
 * Supports:
 * - Vowels (Independent & Dependent / Pillam)
 * - Consonants (Sanyaka, Mahaprana, Murdhaja, Danta)
 * - Conjuncts (Rakaranshaya e.g. ක්‍ර, Yanshaya e.g. ක්‍ය, Bandi akuru)
 * - Common lottery terms (ලක්ෂ, රු., කෝටි, දිනුම්, ඔස්මන් ද සිල්වා, etc.)
 * - Mixed Sinhala/English/Digits preservation
 */

// Vowel signs (pillam) following a consonant
const VOWEL_SIGNS: { eng: string; uni: string }[] = [
  { eng: 'aae', uni: 'ෑ' },
  { eng: 'aa', uni: 'ා' },
  { eng: 'ae', uni: 'ැ' },
  { eng: 'ii', uni: 'ී' },
  { eng: 'ee', uni: 'ී' }, // 'ee' in Sinhala phonetic transliteration is commonly ී (shree -> ශ්‍රී)
  { eng: 'ea', uni: 'ේ' },
  { eng: 'ei', uni: 'ේ' },
  { eng: 'uu', uni: 'ූ' },
  { eng: 'oo', uni: 'ෝ' },
  { eng: 'oe', uni: 'ෝ' },
  { eng: 'ai', uni: 'ෛ' },
  { eng: 'au', uni: 'ෞ' },
  { eng: 'ou', uni: 'ෞ' },
  { eng: 'ruu', uni: 'ෲ' },
  { eng: 'ru', uni: 'ෘ' },
  { eng: 'a', uni: '' }, // inherent vowel (no extra sign)
  { eng: 'A', uni: 'ා' },
  { eng: 'i', uni: 'ි' },
  { eng: 'I', uni: 'ී' },
  { eng: 'u', uni: 'ු' },
  { eng: 'U', uni: 'ූ' },
  { eng: 'e', uni: 'ෙ' },
  { eng: 'E', uni: 'ේ' },
  { eng: 'o', uni: 'ො' },
  { eng: 'O', uni: 'ෝ' },
];

// Independent vowels (start of word or following another vowel)
const INDEPENDENT_VOWELS: { eng: string; uni: string }[] = [
  { eng: 'aae', uni: 'ඈ' },
  { eng: 'aa', uni: 'ආ' },
  { eng: 'ae', uni: 'ඇ' },
  { eng: 'ii', uni: 'ඊ' },
  { eng: 'ee', uni: 'ඊ' },
  { eng: 'ea', uni: 'ඒ' },
  { eng: 'ei', uni: 'ඒ' },
  { eng: 'uu', uni: 'ඌ' },
  { eng: 'oo', uni: 'ඕ' },
  { eng: 'oe', uni: 'ඕ' },
  { eng: 'ai', uni: 'ඓ' },
  { eng: 'au', uni: 'ඖ' },
  { eng: 'ou', uni: 'ඖ' },
  { eng: 'a', uni: 'අ' },
  { eng: 'A', uni: 'ආ' },
  { eng: 'i', uni: 'ඉ' },
  { eng: 'I', uni: 'ඊ' },
  { eng: 'u', uni: 'උ' },
  { eng: 'U', uni: 'ඌ' },
  { eng: 'e', uni: 'එ' },
  { eng: 'E', uni: 'ඒ' },
  { eng: 'o', uni: 'ඔ' },
  { eng: 'O', uni: 'ඕ' },
];

// Consonants (longest matches first)
const CONSONANTS: { eng: string; uni: string }[] = [
  { eng: 'ksh', uni: 'ක්ෂ' },
  { eng: 'nndh', uni: 'ඳ' },
  { eng: 'nnd', uni: 'ඬ' },
  { eng: 'nng', uni: 'ඞ' },
  { eng: 'n-g', uni: 'ඞ' },
  { eng: 'jny', uni: 'ඥ' },
  { eng: 'th', uni: 'ත' },
  { eng: 'Th', uni: 'ථ' },
  { eng: 'dh', uni: 'ධ' },
  { eng: 'Dh', uni: 'ඪ' },
  { eng: 'shh', uni: 'ෂ' },
  { eng: 'Sh', uni: 'ෂ' },
  { eng: 'sh', uni: 'ශ' },
  { eng: 'ch', uni: 'ච' },
  { eng: 'Ch', uni: 'ඡ' },
  { eng: 'kh', uni: 'ඛ' },
  { eng: 'Kh', uni: 'ඛ' },
  { eng: 'gh', uni: 'ඝ' },
  { eng: 'Gh', uni: 'ඝ' },
  { eng: 'ph', uni: 'ඵ' },
  { eng: 'bh', uni: 'භ' },
  { eng: 'Bh', uni: 'භ' },
  { eng: 'jh', uni: 'ඣ' },
  { eng: 'ny', uni: 'ඤ' },
  { eng: 'gn', uni: 'ඥ' },
  { eng: 'kn', uni: 'ඤ' },
  { eng: 'mb', uni: 'ඹ' },
  { eng: 'nd', uni: 'ඳ' },
  { eng: 'Nd', uni: 'ඬ' },
  { eng: 'ng', uni: 'ඟ' },
  { eng: 'k', uni: 'ක' },
  { eng: 'K', uni: 'ඛ' },
  { eng: 'g', uni: 'ග' },
  { eng: 'G', uni: 'ඝ' },
  { eng: 'c', uni: 'ච' },
  { eng: 'C', uni: 'ඡ' },
  { eng: 'j', uni: 'ජ' },
  { eng: 'J', uni: 'ඣ' },
  { eng: 't', uni: 'ට' },
  { eng: 'T', uni: 'ඨ' },
  { eng: 'd', uni: 'ද' },
  { eng: 'D', uni: 'ඩ' },
  { eng: 'n', uni: 'න' },
  { eng: 'N', uni: 'ණ' },
  { eng: 'p', uni: 'ප' },
  { eng: 'P', uni: 'ඵ' },
  { eng: 'b', uni: 'බ' },
  { eng: 'B', uni: 'භ' },
  { eng: 'm', uni: 'ම' },
  { eng: 'y', uni: 'ය' },
  { eng: 'Y', uni: '‍ය' },
  { eng: 'r', uni: 'ර' },
  { eng: 'l', uni: 'ල' },
  { eng: 'L', uni: 'ළ' },
  { eng: 'v', uni: 'ව' },
  { eng: 'w', uni: 'ව' },
  { eng: 's', uni: 'ස' },
  { eng: 'S', uni: 'ස' },
  { eng: 'h', uni: 'හ' },
  { eng: 'H', uni: 'හ' },
  { eng: 'f', uni: 'ෆ' },
  { eng: 'F', uni: 'ෆ' },
  { eng: 'q', uni: 'ං' },
  { eng: 'x', uni: 'ං' },
];

/**
 * Transliterates an entire Singlish text string into Sinhala Unicode.
 */
export function transliterateSinglish(input: string): string {
  if (!input) return '';

  let result = '';
  let i = 0;
  const len = input.length;

  while (i < len) {
    const ch = input[i];

    // 1. Preserve English abbreviations like "S.W.", "N.L.B.", "D.L.B."
    if (
      /[A-Z]/.test(ch) &&
      i + 1 < len &&
      input[i + 1] === '.' &&
      (i === 0 || !/[a-zA-Z]/.test(input[i - 1]))
    ) {
      result += ch + '.';
      i += 2;
      continue;
    }

    // 2. Specialized lottery phrases & common proper nouns
    if (input.startsWith('silva', i) && (i === 0 || /\s/.test(input[i - 1])) && (i + 5 >= len || /\s|[.,!?]/.test(input[i + 5]))) {
      result += 'සිල්වා';
      i += 5;
      continue;
    }
    if (input.startsWith('de silva', i) && (i === 0 || /\s/.test(input[i - 1]))) {
      result += 'ද සිල්වා';
      i += 8;
      continue;
    }
    if (input.startsWith('da silva', i) && (i === 0 || /\s/.test(input[i - 1]))) {
      result += 'ද සිල්වා';
      i += 8;
      continue;
    }
    if (input.startsWith('kapruka', i)) {
      result += 'කප්රුක';
      i += 7;
      continue;
    }
    if (input.startsWith('ru.', i) && (i === 0 || /\s/.test(input[i - 1]))) {
      result += 'රු.';
      i += 3;
      continue;
    }
    if (input.startsWith('Rs.', i) && (i === 0 || /\s/.test(input[i - 1]))) {
      result += 'රු.';
      i += 3;
      continue;
    }
    if (input.startsWith('laksha', i)) {
      result += 'ලක්ෂ';
      i += 6;
      continue;
    }
    if (input.startsWith('kotipathi', i)) {
      result += 'කෝටිපති';
      i += 9;
      continue;
    }

    // 3. Preserve already-Unicode Sinhala letters
    if (ch >= '\u0D80' && ch <= '\u0DFF') {
      result += ch;
      i++;
      continue;
    }

    // 4. Preserve digits, punctuation, whitespace
    if (!/[a-zA-Z]/.test(ch)) {
      result += ch;
      i++;
      continue;
    }

    // 5. Try matching a Consonant
    let matchedConsonant: { eng: string; uni: string } | null = null;
    let consLen = 0;

    for (const c of CONSONANTS) {
      if (input.startsWith(c.eng, i)) {
        matchedConsonant = c;
        consLen = c.eng.length;
        break;
      }
    }

    if (matchedConsonant) {
      let curIndex = i + consLen;

      // Special case: 'q' or 'x' (Anusvaraya / binduwa ං)
      if (matchedConsonant.eng === 'q' || matchedConsonant.eng === 'x') {
        result += matchedConsonant.uni;
        i = curIndex;
        continue;
      }

      // Check for Rakaranshaya (e.g. kra, pri, shree, thri)
      let hasRakaranshaya = false;
      let hasYanshaya = false;

      if (
        matchedConsonant.eng !== 'r' &&
        input[curIndex] === 'r' &&
        curIndex + 1 < len &&
        (input.slice(curIndex + 1, curIndex + 3) === 'ee' ||
          input[curIndex + 1] === 'i' ||
          input[curIndex + 1] === 'a' ||
          input[curIndex + 1] === 'o' ||
          input[curIndex + 1] === 'e')
      ) {
        hasRakaranshaya = true;
        curIndex++; // consume 'r'
      } else if (
        matchedConsonant.eng !== 'y' &&
        input[curIndex] === 'y' &&
        curIndex + 1 < len &&
        /[a-zA-Z]/.test(input[curIndex + 1])
      ) {
        hasYanshaya = true;
        curIndex++; // consume 'y'
      }

      // Check if a vowel follows the consonant (or rakaranshaya/yanshaya)
      let matchedVowel: { eng: string; uni: string } | null = null;
      let vowelLen = 0;

      for (const v of VOWEL_SIGNS) {
        if (input.startsWith(v.eng, curIndex)) {
          matchedVowel = v;
          vowelLen = v.eng.length;
          break;
        }
      }

      let baseChar = matchedConsonant.uni;
      if (hasRakaranshaya) {
        baseChar = baseChar + '්\u200Dර';
      } else if (hasYanshaya) {
        baseChar = baseChar + '්\u200Dය';
      }

      if (matchedVowel) {
        result += baseChar + matchedVowel.uni;
        i = curIndex + vowelLen;
      } else {
        // Consonant alone or before another consonant -> takes Hal ්
        result += baseChar + '්';
        i = curIndex;
      }
      continue;
    }

    // 6. Independent Vowels (e.g. at start of word or after whitespace/vowel)
    let matchedIndVowel: { eng: string; uni: string } | null = null;
    let indVowelLen = 0;

    for (const v of INDEPENDENT_VOWELS) {
      if (input.startsWith(v.eng, i)) {
        matchedIndVowel = v;
        indVowelLen = v.eng.length;
        break;
      }
    }

    if (matchedIndVowel) {
      result += matchedIndVowel.uni;
      i += indVowelLen;
      continue;
    }

    // Fallback: character as-is
    result += input[i];
    i++;
  }

  return result;
}

/**
 * Checks if a string contains any English alphabetical characters.
 */
export function hasEnglishLetters(text: string): boolean {
  return /[a-zA-Z]/.test(text);
}

/**
 * Smart transliteration for names with English initials.
 * Preserves English initials at the start (e.g. "S. W.", "W. M.", "K. G.", "A. B.", "S . W")
 * and transliterates the remaining Sinhala/Singlish name (e.g. "dinesh" -> "දිනේෂ්").
 */
export function smartTransliterateName(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();

  // Match sequence of single English letters followed by dot or space:
  // e.g. "S. W.", "S.W.", "S . W ", "s. w.", "S W ", "K. G. ", "S. "
  const initialsMatch = trimmed.match(/^((?:[A-Za-z](?:\s*\.\s*|\s+))+)(.*)$/);
  if (initialsMatch) {
    const rawInitials = initialsMatch[1];
    const rest = initialsMatch[2].trim();

    // Check that initials aren't just a 1-letter word if rest is empty and has no dots
    if (!rest && !rawInitials.includes('.')) {
      return transliterateSinglish(trimmed);
    }

    // Clean and normalize initials to standard "S. W. " format
    const cleanInitials = rawInitials
      .replace(/\./g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(ch => ch.toUpperCase() + '.')
      .join(' ') + ' ';

    if (!rest) return cleanInitials.trim();
    return cleanInitials + (hasEnglishLetters(rest) ? transliterateSinglish(rest) : rest);
  }

  return transliterateSinglish(trimmed);
}

