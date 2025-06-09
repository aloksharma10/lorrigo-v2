module.exports = {
  apps: [
    {
      name: 'lorrigo-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 'max',
      exec_mode: 'cluster',
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
      out_file: '../logs/web-out.log',
      error_file: '../logs/web-error.log',
      merge_logs: true,
    },
  ],
};
