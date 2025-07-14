#!/usr/bin/env node

/**
 * Test script to verify environment variables are loaded correctly
 * Run with: node scripts/test-env.js
 */

import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
console.log('🔍 Loading environment variables from .env.local...');
const envPath = path.join(__dirname, '../.env.local');
console.log('📂 Looking for env file at:', envPath);

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Error loading .env.local:', result.error);
  console.log('\n💡 Please make sure you have:');
  console.log('1. Created a .env.local file in the project root');
  console.log('2. Added your Supabase credentials to it');
  console.log('\nExample .env.local content:');
  console.log('VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.log('VITE_SUPABASE_ANON_KEY=your_anon_key_here');
  console.log('SUPABASE_SERVICE_KEY=your_service_key_here');
  process.exit(1);
}

console.log('✅ Environment file loaded successfully');

// Check required variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log('\n🔑 Environment Variables Status:');
console.log('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log(
  '   VITE_SUPABASE_ANON_KEY:',
  SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'
);
console.log(
  '   SUPABASE_SERVICE_KEY:',
  SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing'
);

if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_KEY) {
  console.log('\n🎉 All required environment variables are set!');
  console.log('You can now run: node scripts/migrate-to-supabase.js');
} else {
  console.log('\n❌ Some environment variables are missing.');
  console.log('\nPlease add the missing variables to your .env.local file:');

  if (!SUPABASE_URL) {
    console.log('VITE_SUPABASE_URL=https://your-project.supabase.co');
  }
  if (!SUPABASE_ANON_KEY) {
    console.log('VITE_SUPABASE_ANON_KEY=your_anon_key_here');
  }
  if (!SUPABASE_SERVICE_KEY) {
    console.log('SUPABASE_SERVICE_KEY=your_service_key_here');
  }
}
