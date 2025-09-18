/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // JANGAN pakai: output: 'export'
  // optional bila perlu Node runtime di Vercel:
  // output: 'standalone',
};

module.exports = nextConfig;
