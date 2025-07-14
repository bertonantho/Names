#!/usr/bin/env node

/**
 * Migration script to upload French names data from CSV to Supabase
 * Run with: node scripts/migrate-to-supabase.js
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Service key for admin operations
const CSV_FILE_PATH = path.join(__dirname, '../data/DS_PRENOM_2024_DATA.CSV');
const BATCH_SIZE = 1000; // Insert in batches to avoid timeouts

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? '✅' : '❌');
  console.error('');
  console.error('Please set these in your .env file or environment');
  process.exit(1);
}

// Create Supabase client with service key for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Parse CSV line (handles quoted fields separated by semicolons)
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      values.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim().replace(/^"|"$/g, ''));
  return values;
}

// Normalize name by removing _1, _2, etc. suffixes
function normalizeName(name) {
  return name.replace(/_\d+$/, '');
}

// Department mapping (will be inserted into departments table)
const DEPARTMENTS = {
  '01': 'Ain',
  '02': 'Aisne',
  '03': 'Allier',
  '04': 'Alpes-de-Haute-Provence',
  '05': 'Hautes-Alpes',
  '06': 'Alpes-Maritimes',
  '07': 'Ardèche',
  '08': 'Ardennes',
  '09': 'Ariège',
  10: 'Aube',
  11: 'Aude',
  12: 'Aveyron',
  13: 'Bouches-du-Rhône',
  14: 'Calvados',
  15: 'Cantal',
  16: 'Charente',
  17: 'Charente-Maritime',
  18: 'Cher',
  19: 'Corrèze',
  21: "Côte-d'Or",
  22: "Côtes-d'Armor",
  23: 'Creuse',
  24: 'Dordogne',
  25: 'Doubs',
  26: 'Drôme',
  27: 'Eure',
  28: 'Eure-et-Loir',
  29: 'Finistère',
  30: 'Gard',
  31: 'Haute-Garonne',
  32: 'Gers',
  33: 'Gironde',
  34: 'Hérault',
  35: 'Ille-et-Vilaine',
  36: 'Indre',
  37: 'Indre-et-Loire',
  38: 'Isère',
  39: 'Jura',
  40: 'Landes',
  41: 'Loir-et-Cher',
  42: 'Loire',
  43: 'Haute-Loire',
  44: 'Loire-Atlantique',
  45: 'Loiret',
  46: 'Lot',
  47: 'Lot-et-Garonne',
  48: 'Lozère',
  49: 'Maine-et-Loire',
  50: 'Manche',
  51: 'Marne',
  52: 'Haute-Marne',
  53: 'Mayenne',
  54: 'Meurthe-et-Moselle',
  55: 'Meuse',
  56: 'Morbihan',
  57: 'Moselle',
  58: 'Nièvre',
  59: 'Nord',
  60: 'Oise',
  61: 'Orne',
  62: 'Pas-de-Calais',
  63: 'Puy-de-Dôme',
  64: 'Pyrénées-Atlantiques',
  65: 'Hautes-Pyrénées',
  66: 'Pyrénées-Orientales',
  67: 'Bas-Rhin',
  68: 'Haut-Rhin',
  69: 'Rhône',
  70: 'Haute-Saône',
  71: 'Saône-et-Loire',
  72: 'Sarthe',
  73: 'Savoie',
  74: 'Haute-Savoie',
  75: 'Paris',
  76: 'Seine-Maritime',
  77: 'Seine-et-Marne',
  78: 'Yvelines',
  79: 'Deux-Sèvres',
  80: 'Somme',
  81: 'Tarn',
  82: 'Tarn-et-Garonne',
  83: 'Var',
  84: 'Vaucluse',
  85: 'Vendée',
  86: 'Vienne',
  87: 'Haute-Vienne',
  88: 'Vosges',
  89: 'Yonne',
  90: 'Territoire de Belfort',
  91: 'Essonne',
  92: 'Hauts-de-Seine',
  93: 'Seine-Saint-Denis',
  94: 'Val-de-Marne',
  95: "Val-d'Oise",
};

async function insertInBatches(
  table,
  data,
  batchSize = BATCH_SIZE,
  useUpsert = false
) {
  console.log(
    `📦 Inserting ${data.length} records into ${table} in batches of ${batchSize}...`
  );

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);

    let query = supabase.from(table);

    if (useUpsert) {
      // Use upsert to handle duplicates
      const { error } = await query.upsert(batch, { onConflict: 'code' });
      if (error) {
        console.error(
          `❌ Error upserting batch ${Math.floor(i / batchSize) + 1}:`,
          error
        );
        throw error;
      }
    } else {
      // Regular insert
      const { error } = await query.insert(batch);
      if (error) {
        console.error(
          `❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`,
          error
        );
        throw error;
      }
    }

    console.log(
      `✅ Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(data.length / batchSize)} processed`
    );
  }
}

async function migrateDepartments() {
  console.log('🏢 Migrating departments data...');

  const departmentsData = Object.entries(DEPARTMENTS).map(([code, name]) => ({
    code,
    name,
    region_name: null, // Will be populated later if needed
  }));

  try {
    // Check if departments already exist
    const { count } = await supabase
      .from('departments')
      .select('*', { count: 'exact', head: true });

    if (count > 0) {
      console.log(
        `📄 Found ${count} existing departments, using upsert to update...`
      );
      await insertInBatches('departments', departmentsData, BATCH_SIZE, true);
    } else {
      console.log('📄 No existing departments found, inserting new ones...');
      await insertInBatches('departments', departmentsData);
    }

    console.log('✅ Departments migration completed');
  } catch (error) {
    console.error('❌ Departments migration failed:', error);
    throw error;
  }
}

async function migrateNamesData() {
  console.log('📚 Reading CSV file...');

  if (!fs.existsSync(CSV_FILE_PATH)) {
    throw new Error(`CSV file not found: ${CSV_FILE_PATH}`);
  }

  const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf8');
  const lines = csvContent.split('\n');

  console.log(`📄 Found ${lines.length} lines in CSV file`);

  // Skip header line
  const dataLines = lines.slice(1).filter((line) => line.trim());

  console.log('🔄 Processing CSV data...');

  const nameRecords = [];
  let processed = 0;
  let skipped = 0;

  for (const line of dataLines) {
    try {
      const [firstName, geo, geoObject, sex, timePeriod, obsValue] =
        parseCSVLine(line);

      // Skip invalid records
      if (
        !firstName ||
        !geo ||
        !geoObject ||
        !sex ||
        !timePeriod ||
        !obsValue
      ) {
        skipped++;
        continue;
      }

      // Normalize the name
      const normalizedName = normalizeName(firstName);

      // Parse numeric values
      const year = parseInt(timePeriod);
      const births = parseInt(obsValue);

      // Skip if parsing failed
      if (isNaN(year) || isNaN(births) || year < 2000 || year > 2024) {
        skipped++;
        continue;
      }

      // Validate sex
      if (sex !== 'M' && sex !== 'F') {
        skipped++;
        continue;
      }

      // Validate geo_object
      if (!['FRANCE', 'REG', 'DEP'].includes(geoObject)) {
        skipped++;
        continue;
      }

      nameRecords.push({
        first_name: normalizedName,
        geo: geo,
        geo_object: geoObject,
        sex: sex,
        time_period: year,
        obs_value: births,
      });

      processed++;

      // Progress indicator
      if (processed % 10000 === 0) {
        console.log(`📊 Processed ${processed.toLocaleString()} records...`);
      }
    } catch (error) {
      console.warn(`⚠️  Error processing line: ${line.slice(0, 100)}...`);
      skipped++;
    }
  }

  console.log(`✅ Processed ${processed.toLocaleString()} records`);
  console.log(`⚠️  Skipped ${skipped.toLocaleString()} invalid records`);

  // Insert data in batches
  try {
    // Check if data already exists
    const { count } = await supabase
      .from('french_names')
      .select('*', { count: 'exact', head: true });

    if (count > 0) {
      console.log(`📄 Found ${count} existing records in french_names`);
      console.log(
        '⚠️  Database already contains data. Skipping names migration to avoid duplicates.'
      );
      console.log(
        '💡 If you want to refresh the data, please truncate the table first in Supabase.'
      );
      return { processed, skipped };
    }

    await insertInBatches('french_names', nameRecords);
    console.log('✅ Names data migration completed');
  } catch (error) {
    console.error('❌ Names data migration failed:', error);
    throw error;
  }

  return { processed, skipped };
}

async function generateStatistics() {
  console.log('📊 Generating name statistics...');

  try {
    // This query will aggregate the data to create statistics
    const { data, error } = await supabase.rpc('sql', {
      query: `
        INSERT INTO name_statistics (first_name, sex, total_births, first_year, last_year, peak_year, peak_births, current_rank, trend_direction)
        SELECT 
          fn.first_name,
          fn.sex,
          SUM(fn.obs_value) as total_births,
          MIN(fn.time_period) as first_year,
          MAX(fn.time_period) as last_year,
          (SELECT time_period FROM french_names fn2 
           WHERE fn2.first_name = fn.first_name AND fn2.sex = fn.sex AND fn2.geo_object = 'FRANCE'
           ORDER BY obs_value DESC LIMIT 1) as peak_year,
          MAX(fn.obs_value) as peak_births,
          ROW_NUMBER() OVER (PARTITION BY fn.sex ORDER BY SUM(fn.obs_value) DESC) as current_rank,
          CASE 
            WHEN AVG(CASE WHEN fn.time_period >= 2020 THEN fn.obs_value END) > 
                 AVG(CASE WHEN fn.time_period < 2020 THEN fn.obs_value END) THEN 'rising'
            WHEN AVG(CASE WHEN fn.time_period >= 2020 THEN fn.obs_value END) < 
                 AVG(CASE WHEN fn.time_period < 2020 THEN fn.obs_value END) THEN 'falling'
            ELSE 'stable'
          END as trend_direction
        FROM french_names fn
        WHERE fn.geo_object = 'FRANCE'
        GROUP BY fn.first_name, fn.sex
        ON CONFLICT (first_name, sex) DO UPDATE SET
          total_births = EXCLUDED.total_births,
          first_year = EXCLUDED.first_year,
          last_year = EXCLUDED.last_year,
          peak_year = EXCLUDED.peak_year,
          peak_births = EXCLUDED.peak_births,
          current_rank = EXCLUDED.current_rank,
          trend_direction = EXCLUDED.trend_direction
      `,
    });

    if (error) {
      console.error('❌ Statistics generation failed:', error);
      throw error;
    }

    console.log('✅ Statistics generation completed');
  } catch (error) {
    console.error('❌ Statistics generation failed:', error);
    // This is not critical, so we don't throw
  }
}

async function main() {
  console.log('🚀 Starting French Names Data Migration to Supabase');
  console.log('================================================');

  try {
    // Test connection
    console.log('🔍 Testing Supabase connection...');
    const { data, error } = await supabase
      .from('departments')
      .select('count')
      .limit(1);
    if (error) throw error;
    console.log('✅ Supabase connection successful');

    // Step 1: Migrate departments
    await migrateDepartments();

    // Step 2: Migrate names data
    const { processed, skipped } = await migrateNamesData();

    // Step 3: Generate statistics (optional)
    await generateStatistics();

    console.log('');
    console.log('🎉 Migration completed successfully!');
    console.log('=======================================');
    console.log(`📊 Total records processed: ${processed.toLocaleString()}`);
    console.log(`⚠️  Total records skipped: ${skipped.toLocaleString()}`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Update your app to use Supabase client');
    console.log('2. Deploy to Vercel with environment variables');
    console.log('3. Test the application');
  } catch (error) {
    console.error('');
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('Make sure you have:');
    console.error('1. Created a Supabase project');
    console.error('2. Run the schema SQL in your Supabase SQL editor');
    console.error('3. Set the correct environment variables');
    process.exit(1);
  }
}

// Run the migration
main();
