import type { NextConfig } from "next";

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "codebuddies-assets.sfo3.cdn.digitaloceanspaces.com",
        pathname: "/items/**", // permite todas las imágenes dentro de /items/
      },
    ],
  },
};

module.exports = nextConfig;
export default nextConfig;
