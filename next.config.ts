import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fontes embutidas e dados lidos com fs precisam ir junto para as funções na Vercel.
  outputFileTracingIncludes: {
    "/api/render/[postId]": ["./assets/fonts/**"],
    "/api/admin/virais": ["./data/virais/**"],
  },
};

export default nextConfig;
