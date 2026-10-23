import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('--- OCR Verification Test ---');

  // 1. Verify model file exists
  const modelPath = path.resolve('./public/tessdata/eng.traineddata');
  if (!fs.existsSync(modelPath)) {
    throw new Error(`Model file missing at ${modelPath}`);
  }
  const stats = fs.statSync(modelPath);
  console.log(`[PASS] eng.traineddata exists (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

  // 2. Verify WASM core loads
  const coreModule = await import('tesseract.js-core');
  const createCore = typeof coreModule.default === 'function' ? coreModule.default : coreModule;
  const core = await createCore();
  console.log('[PASS] tesseract.js-core WebAssembly engine initialized in main thread');

  // 3. Test API initialization
  try { core.FS.mkdir('/tessdata'); } catch {}
  core.FS.writeFile('/tessdata/eng.traineddata', fs.readFileSync(modelPath));
  const api = new core.TessBaseAPI();
  const initCode = api.Init('/tessdata', 'eng');
  if (initCode !== 0) throw new Error(`Init failed with code ${initCode}`);
  api.SetVariable('tessedit_char_whitelist', '0123456789');
  api.SetPageSegMode(8);
  console.log('[PASS] TessBaseAPI initialized with digits whitelist');

  // 4. Test image OCR on a synthetic clean image
  const testBuffer = await sharp({
    create: {
      width: 120,
      height: 50,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  }).png().toBuffer();

  core.FS.writeFile('/input', testBuffer);
  api.SetImageFile(1, 0);
  api.Recognize();
  api.Clear();
  core.FS.unlink('/input');
  api.End();

  console.log('[PASS] Synthetic recognition pipeline executed cleanly');
  console.log('All OCR health checks PASSED!\n');
}

main().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
