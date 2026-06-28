/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverExternalPackages: ["tesseract.js", "pdf-parse", "pdf2pic"],
  },
};

export default nextConfig;