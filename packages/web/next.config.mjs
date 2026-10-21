/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@icpfinder/core", "@icpfinder/providers"],
  // AgentReady AR-FIND-04: advertise the AI catalog to agents that read headers.
  async headers() {
    return [
      {
        source: "/",
        headers: [{ key: "Link", value: '</.well-known/ai-catalog.json>; rel="ai-catalog"' }],
      },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
};

export default nextConfig;
