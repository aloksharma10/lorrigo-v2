module.exports = {
  apps: [
    {
      name: 'lorrigo-notifications',
      script: 'dist/index.js',
      instances: 1,
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
      out_file: '../logs/notifications-out.log',
      error_file: '../logs/notifications-error.log',
      merge_logs: true,
    },
  ],
};
