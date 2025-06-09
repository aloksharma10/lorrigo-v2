module.exports = {
  apps: [
    // API Service
    {
      name: 'lorrigo-api',
      script: 'dist/index.js',
      cwd: './apps/api',
      instances: 1,         // changed from 'max'
      exec_mode: 'fork',    // changed from 'cluster'
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: './logs/api-out.log',
      error_file: './logs/api-error.log',
      merge_logs: true,
    },

    // Notifications Service
    {
      name: 'lorrigo-notifications',
      script: 'dist/index.js',
      cwd: './apps/notifications',
      instances: 1,
      exec_mode: 'fork',    // added for clarity, although default is fork
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: './logs/notifications-out.log',
      error_file: './logs/notifications-error.log',
      merge_logs: true,
    },

    // Workers Service
    {
      name: 'lorrigo-workers',
      script: 'dist/index.js',
      cwd: './apps/workers',
      instances: 1,         // changed from 2
      exec_mode: 'fork',    // changed from cluster
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: './logs/workers-out.log',
      error_file: './logs/workers-error.log',
      merge_logs: true,
    },

    // Web Service
    {
      name: 'lorrigo-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: './apps/web',
      instances: 1,         // changed from 'max'
      exec_mode: 'fork',    // changed from cluster
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: './logs/web-out.log',
      error_file: './logs/web-error.log',
      merge_logs: true,
    },
  ],
};