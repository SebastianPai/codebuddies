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
};

module.exports = nextConfig;
