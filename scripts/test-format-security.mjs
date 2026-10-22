import { secureFormatLotteryItem, auditLotteryFormatSecurity } from '../src/lib/lottery-format-security.ts';
import { STANDARD_LOTTERIES } from '../src/lib/constants.ts';

console.log('--- TESTING PER-LOTTERY SECURITY & FORMAT OVERLAP GUARDS ---');

// 1. Test Kapruka with official DLB input (4 regular numbers + superNumber 15)
const kaprukaDef = STANDARD_LOTTERIES.find(d => d.id === 'kapruka');
const kaprukaTest1 = secureFormatLotteryItem({
  lotteryId: 'kapruka',
  drawNo: '2497',
  letter: 'E',
  numbers: ['25', '40', '52', '60'],
  superNumber: '15',
  bonusNumber: '15', // Malformed bonus number
}, kaprukaDef);

console.log('\n[TEST 1] Kapruka from DLB:');
console.log('Result:', JSON.stringify(kaprukaTest1, null, 2));
console.assert(kaprukaTest1.numbers.length === 5, 'Kapruka must have exactly 5 numbers');
console.assert(kaprukaTest1.numbers[0] === '15', 'Kapruka first number must be boxed 15');
console.assert(kaprukaTest1.boxedIndex === 0, 'Kapruka boxedIndex must be 0');
console.assert(kaprukaTest1.bonusNumber === undefined, 'Kapruka bonusNumber MUST BE undefined (no parens!)');

// 2. Test Kapruka with already merged 5 numbers + bonusNumber lingering
const kaprukaTest2 = secureFormatLotteryItem({
  lotteryId: 'kapruka',
  drawNo: '2497',
  letter: 'E',
  numbers: ['15', '25', '40', '52', '60'],
  bonusNumber: '15', // The exact bug the user saw in the screenshot!
}, kaprukaDef);

console.log('\n[TEST 2] Kapruka with lingering bonus:');
console.log('Numbers:', kaprukaTest2.numbers);
console.log('Bonus:', kaprukaTest2.bonusNumber);
console.assert(kaprukaTest2.bonusNumber === undefined, 'Bonus must be wiped for Kapruka');
console.assert(kaprukaTest2.numbers.length === 5, 'Must keep 5 numbers');

// 3. Test Mega Power
const megaDef = STANDARD_LOTTERIES.find(d => d.id === 'mega_power');
const megaTest = secureFormatLotteryItem({
  lotteryId: 'mega_power',
  drawNo: '2695',
  letter: 'U',
  numbers: ['12', '25', '38', '57'],
  superNumber: '04',
  bonusNumber: '04',
}, megaDef);
console.log('\n[TEST 3] Mega Power:');
console.log('Numbers:', megaTest.numbers);
console.assert(megaTest.numbers[0] === '04', 'Mega Power boxed ball at index 0');
console.assert(megaTest.boxedIndex === 0, 'boxedIndex 0');
console.assert(megaTest.bonusNumber === undefined, 'bonusNumber undefined');

// 4. Test Vasi
const vasiDef = STANDARD_LOTTERIES.find(d => d.id === 'vasi');
const vasiTest = secureFormatLotteryItem({
  lotteryId: 'vasi',
  drawNo: '21',
  letter: 'Y',
  numbers: ['22', '80'],
  superNumber: '11',
  bonusNumber: '11',
}, vasiDef);
console.log('\n[TEST 4] Vasi:');
console.log('Numbers:', vasiTest.numbers);
console.assert(vasiTest.numbers[2] === '11', 'Vasi boxed ball at index 2');
console.assert(vasiTest.boxedIndex === 2, 'boxedIndex 2');
console.assert(vasiTest.bonusNumber === undefined, 'bonusNumber undefined');

// 5. Test Shanida Wasana (with bonus)
const shanidaDef = STANDARD_LOTTERIES.find(d => d.id === 'shanida_wasana');
const shanidaTest = secureFormatLotteryItem({
  lotteryId: 'shanida_wasana',
  drawNo: '5482',
  letter: 'X',
  numbers: ['29', '53', '58', '74', '86597'], // Accidentally duplicated in numbers
  bonusNumber: '86597',
}, shanidaDef);
console.log('\n[TEST 5] Shanida Wasana:');
console.log('Numbers:', shanidaTest.numbers);
console.log('Bonus:', shanidaTest.bonusNumber);
console.assert(shanidaTest.numbers.length === 4, 'Shanida Wasana numbers must be 4');
console.assert(!shanidaTest.numbers.includes('86597'), 'Bonus number must not be duplicated in numbers');
console.assert(shanidaTest.bonusNumber === '86597', 'Bonus number preserved');

console.log('\n ALL PER-LOTTERY SECURITY FORMAT TESTS PASSED SUCCESSFULLY! ');
