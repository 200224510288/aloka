// Prototype script to test Singlish (Sinhala phonetic) transliterator

export function transliterateSinglish(input) {
  if (!input) return '';

  // Vowel signs (pillam) when following a consonant
  const VOWEL_SIGNS = [
    { eng: 'aae', uni: 'ෑ' },
    { eng: 'aa', uni: 'ා' },
    { eng: 'ae', uni: 'ැ' },
    { eng: 'ii', uni: 'ී' },
    { eng: 'ee', uni: 'ී' }, // 'ee' in Singlish is predominantly ී (e.g. shree -> ශ්‍රී)
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
    { eng: 'a', uni: '' }, // inherent vowel
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

  // Independent vowels at word start or after another vowel
  const INDEPENDENT_VOWELS = [
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
  const CONSONANTS = [
    { eng: 'ksh', uni: 'ක්ෂ' },
    { eng: 'nndh', uni: 'ඳ' },
    { eng: 'nnd', uni: 'ඬ' },
    { eng: 'nng', uni: 'ඞ' },
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

  let result = '';
  let i = 0;
  const len = input.length;

  while (i < len) {
    // 1. Check special punctuation / symbols / digits / non-ASCII
    const ch = input[i];

    // Preserve English initials like S.W. or A.B.C.
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

    // Common words / abbreviations override
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

    // If it's already Sinhala or whitespace or digit or special symbol
    if (ch >= '\u0D80' && ch <= '\u0DFF') {
      result += ch;
      i++;
      continue;
    }

    if (!/[a-zA-Z]/.test(ch)) {
      result += ch;
      i++;
      continue;
    }

    // 2. Try matching a Consonant
    let matchedConsonant = null;
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

      // Special case: 'q' or 'x' (Anusvaraya / binduwa)
      if (matchedConsonant.eng === 'q' || matchedConsonant.eng === 'x') {
        result += matchedConsonant.uni;
        i = curIndex;
        continue;
      }

      // Check for Rakaranshaya (e.g. kra, pri, shree, thri, etc.)
      let hasRakaranshaya = false;
      let hasYanshaya = false;

      if (
        matchedConsonant.eng !== 'r' &&
        input[curIndex] === 'r' &&
        curIndex + 1 < len &&
        // make sure it's not 'ru' which is simple ෘ or රු
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
      let matchedVowel = null;
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
        result += baseChar + '්';
        i = curIndex;
      }
      continue;
    }

    // 3. Independent Vowels (e.g. at start of word or after whitespace/vowel)
    let matchedIndVowel = null;
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

    // Fallback: character as is
    result += input[i];
    i++;
  }

  return result;
}

// Tests
const testCases = [
  'govi setha ru. laksha dekahamaarak k osman da silva gen',
  'govi setha ru. laksha dekahamaarak k osman de silva gen',
  'jaya sampatha ru. 50 000 k osman da silva gen',
  'ada sampatha ru. 50 000 k osman da silva gen',
  'mahajana sampatha / kapruka ru. laksha 01 02 k S.W.osman da silva gen',
  'obata suba dawasak !',
  'shree lankaa',
  'kotipathi shanida ru. 200 000 k',
  'miliona pahak dinuma',
  'visheshitha dinum aedheema',
];

for (const tc of testCases) {
  console.log(`Input:  ${tc}`);
  console.log(`Output: ${transliterateSinglish(tc)}\n`);
}
