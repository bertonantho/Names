const fs = require('fs');
const path = require('path');

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
  return name.replace(/_\d+$/, '').trim();
}

// Main processing function for department data
async function processDepartmentData() {
  console.log('Starting department data processing...');

  const dataPath = path.join(__dirname, '../data/DS_PRENOM_2024_data.csv');
  const outputPath = path.join(__dirname, '../public/data/department_data.json');

  // Check if CSV file exists
  if (!fs.existsSync(dataPath)) {
    console.error(`CSV file not found at: ${dataPath}`);
    console.log('Please ensure the DS_PRENOM_2024_data.csv file is in the data/ directory');
    return;
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    console.log('Reading CSV file...');
    const csvContent = fs.readFileSync(dataPath, 'utf8');
    const lines = csvContent.split('\n');

    // Skip header line
    const dataLines = lines.slice(1);
    
    // Structure: { name_sex_year: { departmentCode: births } }
    const departmentData = new Map();
    let processedCount = 0;

    console.log('Processing department-level records...');
    
    for (const line of dataLines) {
      if (!line.trim()) continue;

      const values = parseCSVLine(line);
      if (values.length < 6) continue;

      // Parse the record: "FIRST_NAME";"GEO";"GEO_OBJECT";"SEX";"TIME_PERIOD";"OBS_VALUE"
      const record = {
        firstName: values[0],
        geo: values[1],
        geoObject: values[2],
        sex: values[3],
        timePeriod: parseInt(values[4]),
        obsValue: parseInt(values[5]) || 0,
      };

      // Skip invalid records
      if (
        !record.firstName ||
        !record.sex ||
        !record.timePeriod ||
        record.obsValue <= 0
      ) {
        continue;
      }

      // Only process department-level data
      if (record.geoObject !== 'DEP') {
        continue;
      }

      // Only include metropolitan departments (01-95)
      const deptCode = record.geo;
      if (!/^[0-9]{2}$/.test(deptCode)) {
        continue;
      }
      
      const deptNum = parseInt(deptCode);
      if (deptNum < 1 || deptNum > 95) {
        continue;
      }

      // Normalize the name
      const normalizedName = normalizeName(record.firstName);
      
      // Create key for this name/sex/year combination
      const key = `${normalizedName}_${record.sex}_${record.timePeriod}`;
      
      if (!departmentData.has(key)) {
        departmentData.set(key, {});
      }
      
      const yearData = departmentData.get(key);
      yearData[deptCode] = (yearData[deptCode] || 0) + record.obsValue;
      
      processedCount++;
      
      if (processedCount % 50000 === 0) {
        console.log(`Processed ${processedCount} department records...`);
      }
    }

    console.log('Converting data structure...');
    
    // Convert to a more organized structure
    const organizedData = {};
    
    for (const [key, deptData] of departmentData.entries()) {
      const [name, sex, year] = key.split('_');
      
      if (!organizedData[name]) {
        organizedData[name] = {};
      }
      
      if (!organizedData[name][sex]) {
        organizedData[name][sex] = {};
      }
      
      organizedData[name][sex][year] = deptData;
    }

    // Save the processed data
    console.log('Saving department data...');
    fs.writeFileSync(outputPath, JSON.stringify(organizedData, null, 2));
    
    const fileSize = fs.statSync(outputPath).size;
    console.log(`✅ Department data processing complete!`);
    console.log(`- Total records processed: ${processedCount}`);
    console.log(`- Names with department data: ${Object.keys(organizedData).length}`);
    console.log(`- Output file size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`- Output saved to: ${outputPath}`);
    
    // Create a summary for debugging
    const sampleNames = Object.keys(organizedData).slice(0, 5);
    console.log('\n📊 Sample data structure:');
    sampleNames.forEach(name => {
      const genders = Object.keys(organizedData[name]);
      console.log(`- ${name}: ${genders.join(', ')}`);
      
      genders.forEach(gender => {
        const years = Object.keys(organizedData[name][gender]);
        console.log(`  ${gender}: years ${Math.min(...years)} - ${Math.max(...years)}`);
      });
    });

  } catch (error) {
    console.error('Error processing department data:', error);
  }
}

// Run if called directly
if (require.main === module) {
  processDepartmentData();
}

module.exports = { processDepartmentData };