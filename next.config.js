/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'mc-heads.net' },
    ],
  },
};

module.exports = nextConfig;
