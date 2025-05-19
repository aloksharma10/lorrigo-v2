module.exports = {
  apps: [
    {
      name: 'lorrigo-api',
      script: 'dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
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
      out_file: '../logs/api-out.log',
      error_file: '../logs/api-error.log',
      merge_logs: true,
    },
  ],
};
