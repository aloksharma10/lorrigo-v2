/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@lorrigo/auth", "@lorrigo/db"],
  serverExternalPackages: ["@prisma/client", "@prisma/client/runtime/library"],
};

export default nextConfig;