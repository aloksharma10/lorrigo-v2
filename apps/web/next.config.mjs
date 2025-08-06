import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';

/** ESM workaround for __dirname */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Transpile only essential client-side monorepo packages
  transpilePackages: ['@lorrigo/ui', '@lorrigo/utils'],

  // Exclude server-only packages from client bundles
  serverExternalPackages: ['@prisma/client', '@prisma/client/runtime/library', 'bcrypt', '@auth/prisma-adapter'],

  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  outputFileTracingIncludes: {
    '/': ['./public/**/*'],
    '/seller/*': ['./public/**/*'],
    '/admin/*': ['./public/**/*'],
  },

  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.lorrigo.com' }],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
  },

  compress: true,

  async headers() {
    return [
      {
        source: '/:all*(css|js|png|jpg|jpeg|gif|svg|woff|woff2|avif|webp)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer-when-downgrade' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/',
        destination: '/seller/dashboard',
        permanent: false,
      },
      {
        source: '/admin',
        destination: '/admin/home',
        permanent: false,
      },
    ];
  },

  webpack: (config, { webpack, isServer }) => {
    if (isServer) {
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp:
            /(^@google-cloud\/spanner|^@mongodb-js\/zstd|^aws-crt|^aws4$|^pg-native$|^mongodb-client-encryption$|^@sap\/hana-client$|^@sap\/hana-client\/extension\/Stream$|^snappy$|^react-native-sqlite-storage$|^bson-ext$|^cardinal$|^kerberos$|^hdb-pool$|^sql.js$|^sqlite3$|^better-sqlite3$|^ioredis$|^typeorm-aurora-data-api-driver$|^pg-query-stream$|^oracledb$|^mysql$|^snappy\/package\.json$|^cloudflare:sockets$)/,
        }),
        new PrismaPlugin({
          clientPath: path.resolve(__dirname, '../../packages/db'),
        })
      );
    }

    config.module = {
      ...config.module,
      exprContextCritical: false,
    };

    return config;
  },
};

export default nextConfig;
