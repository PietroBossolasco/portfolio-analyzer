/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse usa moduli Node lato server: lo escludiamo dal bundling webpack
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"],
  },
};

export default nextConfig;
