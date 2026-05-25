/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@icpfinder/core", "@icpfinder/providers"],
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
};

export default nextConfig;
