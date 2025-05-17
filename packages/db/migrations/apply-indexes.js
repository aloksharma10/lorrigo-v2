#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

/**
 * Script to apply custom GIN indexes for text search
 * 
 * Usage:
 * node migrations/apply-indexes.js
 */

const SCHEMA_PATH = path.join(__dirname, '..', 'schema');
const GIN_INDEXES_SQL = path.join(__dirname, 'gin_indexes.sql');

console.log('Applying custom GIN indexes...');

try {
  // Execute the SQL against the database
  execSync(`npx prisma db execute --file=${GIN_INDEXES_SQL} --schema=${SCHEMA_PATH}`, { stdio: 'inherit' });
  console.log('Custom GIN indexes applied successfully.');
} catch (error) {
  console.error('Failed to apply custom GIN indexes:', error.message);
  process.exit(1);
} 