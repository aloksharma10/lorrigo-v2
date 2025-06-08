import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

/** ESM workaround for __dirname */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // transpilePackages: ["@lorrigo/auth", "@lorrigo/db", "@lorrigo/ui"],
  // serverExternalPackages: ["@prisma/client", "@prisma/client/runtime/library", "bcrypt", "@auth/prisma-adapter"],
  // output: 'standalone',
  // outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default nextConfig;
