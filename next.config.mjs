/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["playwright-core", "pdf-parse", "tesseract.js", "pdfjs-dist"],
  experimental: {
    // any experimental flags
  },
};

export default nextConfig;
