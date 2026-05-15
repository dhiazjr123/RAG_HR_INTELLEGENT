/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Jangan bundle paket native/berat di server — hindari error pdf-parse & rantai gm/debug
  serverExternalPackages: [
    "pdf-parse",
    "pdf2pic",
    "gm",
    "debug",
    "supports-color",
  ],
}

export default nextConfig
