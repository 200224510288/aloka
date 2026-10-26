/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["sharp", "playwright-core", "pdf-parse", "tesseract.js", "tesseract.js-core", "pdfjs-dist"],
  outputFileTracingIncludes: {
    '/api/**/*': [
      './public/tessdata/**/*',
      './node_modules/tesseract.js/**/*',
      './node_modules/tesseract.js-core/**/*',
      './eng.traineddata',
      './scripts/**/*',
    ],
  },
  experimental: {
    // any experimental flags
  },
};

export default nextConfig;
