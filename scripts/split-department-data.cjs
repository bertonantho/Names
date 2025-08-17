const fs = require('fs');
const path = require('path');

/**
 * Split department data into smaller chunks for Vercel deployment
 * Large files (>25MB) can't be served as static files on Vercel
 */

function splitDepartmentData() {
  const inputFile = path.join(__dirname, '../public/data/department_data.json');
  const outputDir = path.join(__dirname, '../public/data/departments');
  
  console.log('Loading department data...');
  
  if (!fs.existsSync(inputFile)) {
    console.log('Department data file not found. Run process-department-data.cjs first.');
    return;
  }

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Load the full dataset
  const fullData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  
  console.log('Processing names...');
  
  // Create an index file to track available data
  const index = {
    names: Object.keys(fullData),
    totalNames: Object.keys(fullData).length,
    chunksCreated: 0,
    lastUpdated: new Date().toISOString()
  };

  let filesCreated = 0;
  
  // Split data by name (each name gets its own file)
  for (const [name, nameData] of Object.entries(fullData)) {
    const filename = `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
    const filePath = path.join(outputDir, filename);
    
    // Write individual name data
    fs.writeFileSync(filePath, JSON.stringify(nameData, null, 2));
    filesCreated++;
    
    if (filesCreated % 100 === 0) {
      console.log(`Created ${filesCreated} files...`);
    }
  }

  // Write index file
  index.chunksCreated = filesCreated;
  fs.writeFileSync(
    path.join(outputDir, 'index.json'), 
    JSON.stringify(index, null, 2)
  );

  // Write a manifest for the service to use
  const manifest = {
    type: 'split_by_name',
    baseUrl: '/data/departments/',
    totalFiles: filesCreated,
    indexFile: 'index.json'
  };
  
  fs.writeFileSync(
    path.join(__dirname, '../public/data/department_manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log(`✅ Department data split complete!`);
  console.log(`📁 Created ${filesCreated} individual name files`);
  console.log(`📋 Created index and manifest files`);
  console.log(`🗂️ Files saved to: ${outputDir}`);
  
  // Calculate total size reduction
  const originalSize = fs.statSync(inputFile).size;
  const newTotalSize = fs.readdirSync(outputDir)
    .reduce((total, file) => {
      return total + fs.statSync(path.join(outputDir, file)).size;
    }, 0);
  
  console.log(`💾 Original size: ${(originalSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`💾 New total size: ${(newTotalSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`⚡ Individual files are much smaller and Vercel-compatible`);
}

if (require.main === module) {
  splitDepartmentData();
}

module.exports = { splitDepartmentData };