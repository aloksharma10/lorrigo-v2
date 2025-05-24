/** @type {import('next').NextConfig} */
const nextConfig = {
  // transpilePackages: ["@lorrigo/auth", "@lorrigo/db", "@lorrigo/ui"],
  // serverExternalPackages: ["@prisma/client", "@prisma/client/runtime/library", "bcrypt", "@auth/prisma-adapter"],
  output: 'standalone',
};

export default nextConfig;
