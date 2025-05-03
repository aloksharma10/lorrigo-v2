import cron from 'node-cron';

// Example: Runs every minute
cron.schedule('* * * * *', () => {
  console.log('Cron job running every minute');
});

console.log('Worker started. Cron jobs are scheduled.');
