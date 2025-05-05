/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    config.module.rules.push({
      test: /worker\.(js|ts)$/,
      use: {
        loader: "worker-loader",
        options: {
          inline: "no-fallback",
          publicPath: "/_next/static/workers/",
          outputPath: "static/workers/",
        },
      },
    });
    return config;
  },
  // La CSP se maneja en el backend, pero puedes incluirla aquí para desarrollo local
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "script-src 'self'; worker-src 'self';",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
