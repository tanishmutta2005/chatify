/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // ── Only whitelist trusted image sources — never use hostname: "**"
      { protocol: "https", hostname: "api.dicebear.com" }, // avatars
      { protocol: "https", hostname: "res.cloudinary.com" }, // future: user uploads
    ],
  },
};

module.exports = nextConfig;
