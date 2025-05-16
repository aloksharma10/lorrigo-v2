#!/usr/bin/env node

/**
 * Script to apply all pending migrations including the global search view
 * 
 * Usage:
 * node scripts/apply-migrations.js
 */

const { spawn } = require('child_process');
const path = require('path');

// Execute Prisma Migrate
console.log('Applying database migrations...');

const prismaBin = path.resolve(__dirname, '../node_modules/.bin/prisma');
const migrate = spawn(prismaBin, ['migrate', 'deploy'], {
  stdio: 'inherit',
  shell: true
});

migrate.on('close', (code) => {
  if (code !== 0) {
    console.error('Migration failed with code:', code);
    process.exit(code);
  }
  
  console.log('Migrations applied successfully!');
  console.log('The global_search view is now available for use.');
  
  // Tip for developers
  console.log('\nYou can query the global search view with:');
  console.log('SELECT * FROM global_search WHERE search_key LIKE \'%search_term%\';');
});