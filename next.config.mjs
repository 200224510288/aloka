/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["playwright-core", "pdf-parse", "tesseract.js", "pdfjs-dist"],
  outputFileTracingIncludes: {
    '/api/**/*': ['./public/tessdata/**/*', './eng.traineddata'],
  },
  experimental: {
    // any experimental flags
  },
};

export default nextConfig;
