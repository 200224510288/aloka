/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["playwright-core", "pdf-parse", "tesseract.js"],
  experimental: {
    // any experimental flags
  },
};

export default nextConfig;
