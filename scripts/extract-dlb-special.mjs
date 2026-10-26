import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Parse CLI arguments: node extract-dlb-special.mjs <url> <lotteryId>
const url = process.argv[2];
const lotteryId = process.argv[3];

if (!url || !lotteryId) {
  console.log(JSON.stringify({ success: false, error: 'Missing url or lotteryId argument' }));
  process.exit(1);
}

let engineInstance = null;

async function getEngine() {
  if (!engineInstance) {
    const coreModule = await import('tesseract.js-core');
    const createCore = typeof coreModule.default === 'function' ? coreModule.default : coreModule;
    const core = await createCore();

    const localModelPath = path.resolve(process.cwd(), 'public', 'tessdata', 'eng.traineddata');
    const rootModelPath = path.resolve(process.cwd(), 'eng.traineddata');
    let modelBuf = null;
    if (fs.existsSync(localModelPath)) {
      modelBuf = fs.readFileSync(localModelPath);
    } else if (fs.existsSync(rootModelPath)) {
      modelBuf = fs.readFileSync(rootModelPath);
    } else {
      const res = await fetch('https://aloka-alpha.vercel.app/tessdata/eng.traineddata');
      if (res.ok) modelBuf = Buffer.from(await res.arrayBuffer());
    }

    if (!modelBuf) throw new Error('eng.traineddata model not found');

    try { core.FS.mkdir('/tessdata'); } catch {}
    core.FS.writeFile('/tessdata/eng.traineddata', modelBuf);

    const api = new core.TessBaseAPI();
    api.Init('/tessdata', 'eng');
    api.SetVariable('tessedit_char_whitelist', '0123456789');

    engineInstance = { core, api };
  }
  return engineInstance;
}

async function extract() {
  const fullUrl = url.startsWith('http') ? url : `https://www.dlb.lk/${url.replace(/^\//, '')}`;

  let res = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      res = await fetch(fullUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'https://www.dlb.lk/result/2/',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) break;
    } catch (e) {
      if (attempt === 1) throw e;
      await new Promise(r => setTimeout(r, 200));
    }
  }

  if (!res || !res.ok) {
    return { success: false, error: `HTTP error ${res?.status || 'network'}` };
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buf).metadata();
  const w = meta.width;
  const h = meta.height;

  if (!w || !h) {
    return { success: false, error: 'Invalid image dimensions' };
  }

  const { core, api } = await getEngine();

  let crops = [];
  if (lotteryId === 'lagna_wasana') {
    crops = [{
      box: {
        left: Math.round(w * 0.165),
        top: Math.round(h * 0.54),
        width: Math.round(w * 0.69),
        height: Math.round(h * 0.16),
      },
      expectedDigits: 5
    }];
  } else if (lotteryId === 'dhana_sampatha' || lotteryId === 'supiri_dhana_sampatha') {
    // Two boxes: top 3 digits, bottom 3 digits
    crops = [
      {
        box: {
          left: Math.round(w * 0.44),
          top: Math.round(h * 0.40),
          width: Math.round(w * 0.38),
          height: Math.round(h * 0.15),
        },
        expectedDigits: 3
      },
      {
        box: {
          left: Math.round(w * 0.44),
          top: Math.round(h * 0.76),
          width: Math.round(w * 0.38),
          height: Math.round(h * 0.16),
        },
        expectedDigits: 3
      }
    ];
  } else {
    // shanida_wasana, super_ball
    crops = [{
      box: {
        left: Math.round(w * 0.39),
        top: Math.round(h * 0.62),
        width: Math.round(w * 0.52),
        height: Math.round(h * 0.20),
      },
      expectedDigits: 5
    }];
  }

  const recognizedParts = [];
  for (let cIdx = 0; cIdx < crops.length; cIdx++) {
    const { box, expectedDigits } = crops[cIdx];
    const { data, info } = await sharp(buf).extract(box).raw().toBuffer({ resolveWithObject: true });
    const channels = info.channels;
    const outData = Buffer.alloc(info.width * info.height);

    for (let i = 0; i < info.width * info.height; i++) {
      const r = data[i * channels];
      const g = data[i * channels + 1];
      const b = data[i * channels + 2];
      outData[i] = (r < 75 && g < 75 && b < 75) ? 0 : 255;
    }

    const binarized = await sharp(outData, { raw: { width: info.width, height: info.height, channels: 1 } })
      .resize({ height: 120, fit: 'inside' })
      .extend({ top: 30, bottom: 30, left: 30, right: 30, background: { r: 255, g: 255, b: 255 } })
      .png().toBuffer();

    api.SetPageSegMode(7);
    core.FS.writeFile('/input', binarized);
    api.SetImageFile(1, 0);
    api.Recognize();
    let text = (api.GetUTF8Text() || '').replace(/[^0-9]/g, '');

    if (text.length !== expectedDigits) {
      api.SetPageSegMode(8);
      api.Recognize();
      const altText = (api.GetUTF8Text() || '').replace(/[^0-9]/g, '');
      if (altText.length === expectedDigits) text = altText;
    }

    api.Clear();
    try { core.FS.unlink('/input'); } catch {}

    recognizedParts.push(text);
  }

  let finalNumber = null;
  if (crops.length === 2) {
    const [top, bot] = recognizedParts;
    if (top && bot) finalNumber = `${top} / ${bot}`;
    else finalNumber = top || bot || null;
  } else {
    finalNumber = recognizedParts[0] || null;
  }

  return { success: !!finalNumber, result: finalNumber };
}

extract()
  .then(res => console.log(JSON.stringify(res)))
  .catch(err => console.log(JSON.stringify({ success: false, error: err?.message || String(err) })));
