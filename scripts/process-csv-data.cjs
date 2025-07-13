const fs = require('fs');
const path = require('path');
const { createReadStream } = require('fs');
const { pipeline } = require('stream/promises');
const { Transform } = require('stream');

// CSV parser function
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

// Function to normalize name by removing _1, _2, etc. suffixes
function normalizeName(name) {
  // Remove _1, _2, _3 etc. suffixes that appear in the data
  return name.replace(/_\d+$/, '').trim();
}

// Transform stream to process CSV data
class CSVProcessor extends Transform {
  constructor(options = {}) {
    super({ objectMode: true });
    this.isFirstLine = true;
    this.headers = [];
    this.processedCount = 0;
  }

  _transform(chunk, encoding, callback) {
    const lines = chunk.toString().split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      if (this.isFirstLine) {
        this.headers = parseCSVLine(line);
        console.log('Headers:', this.headers);
        this.isFirstLine = false;
        continue;
      }
      
      const values = parseCSVLine(line);
      if (values.length < 6) continue;
      
      // Parse the record according to the actual CSV format
      // "FIRST_NAME";"GEO";"GEO_OBJECT";"SEX";"TIME_PERIOD";"OBS_VALUE"
      const record = {
        firstName: values[0],
        geo: values[1],
        geoObject: values[2],
        sex: values[3],
        timePeriod: parseInt(values[4]),
        obsValue: parseInt(values[5]) || 0
      };
      
      // Skip invalid records or non-France data
      if (!record.firstName || !record.sex || !record.timePeriod || record.obsValue <= 0) {
        continue;
      }
      
      // Only process France-level data to avoid duplicates
      if (record.geoObject !== 'FRANCE') {
        continue;
      }
      
      // Normalize the name by removing suffixes
      const normalizedName = normalizeName(record.firstName);
      
      const cleanRecord = {
        sex: record.sex,
        firstName: normalizedName,
        timePeriod: record.timePeriod,
        obsValue: record.obsValue
      };
      
      this.processedCount++;
      this.push(cleanRecord);
    }
    
    // Progress logging
    if (this.processedCount % 100000 === 0) {
      console.log(`Processed ${this.processedCount} records...`);
    }
    
    callback();
  }
}

// Main processing function
async function processCSVData() {
  console.log('Starting CSV data processing...');
  
  const dataPath = path.join(__dirname, '../data/DS_PRENOM_2024_data.csv');
  const outputPath = path.join(__dirname, '../public/data/processed_names.json');
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const nameStats = new Map();
  const yearStats = new Map();
  
  try {
    await pipeline(
      createReadStream(dataPath),
      new CSVProcessor(),
      new Transform({
        objectMode: true,
        transform(record, encoding, callback) {
          // Aggregate data by normalized name
          const nameKey = `${record.firstName}_${record.sex}`;
          
          if (!nameStats.has(nameKey)) {
            nameStats.set(nameKey, {
              name: record.firstName,
              sex: record.sex,
              totalCount: 0,
              yearlyData: new Map(),
              firstYear: record.timePeriod,
              lastYear: record.timePeriod
            });
          }
          
          const nameData = nameStats.get(nameKey);
          nameData.totalCount += record.obsValue;
          nameData.firstYear = Math.min(nameData.firstYear, record.timePeriod);
          nameData.lastYear = Math.max(nameData.lastYear, record.timePeriod);
          
          // Store yearly data
          if (!nameData.yearlyData.has(record.timePeriod)) {
            nameData.yearlyData.set(record.timePeriod, 0);
          }
          nameData.yearlyData.set(record.timePeriod, 
            nameData.yearlyData.get(record.timePeriod) + record.obsValue);
          
          // Year statistics
          if (!yearStats.has(record.timePeriod)) {
            yearStats.set(record.timePeriod, { total: 0, names: new Set() });
          }
          yearStats.get(record.timePeriod).total += record.obsValue;
          yearStats.get(record.timePeriod).names.add(nameKey);
          
          callback();
        }
      })
    );
    
    console.log('Processing complete. Generating output...');
    
    // Convert to arrays and sort
    const processedNames = Array.from(nameStats.values()).map(name => ({
      name: name.name,
      sex: name.sex,
      totalCount: name.totalCount,
      firstYear: name.firstYear,
      lastYear: name.lastYear,
      yearlyData: Object.fromEntries(name.yearlyData)
    })).sort((a, b) => b.totalCount - a.totalCount);
    
    // Generate summary statistics
    const summary = {
      totalNames: processedNames.length,
      totalBirths: Array.from(nameStats.values()).reduce((sum, name) => sum + name.totalCount, 0),
      yearRange: {
        min: Math.min(...Array.from(yearStats.keys())),
        max: Math.max(...Array.from(yearStats.keys()))
      },
      topNames: {
        boys: processedNames.filter(n => n.sex === 'M').slice(0, 100),
        girls: processedNames.filter(n => n.sex === 'F').slice(0, 100)
      }
    };
    
    // Save processed data
    const output = {
      summary,
      names: processedNames
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`Data processing complete!`);
    console.log(`- Total names: ${summary.totalNames}`);
    console.log(`- Total births: ${summary.totalBirths.toLocaleString()}`);
    console.log(`- Year range: ${summary.yearRange.min} - ${summary.yearRange.max}`);
    console.log(`- Output saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('Error processing CSV data:', error);
  }
}

// Run if called directly
if (require.main === module) {
  processCSVData();
}

module.exports = { processCSVData }; 