module.exports = {
  apps: [
    {
      name: 'lorrigo-workers',
      script: 'dist/index.js',
      instances: 2,
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
      out_file: '../logs/workers-out.log',
      error_file: '../logs/workers-error.log',
      merge_logs: true,
    },
  ],
};
