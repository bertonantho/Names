const fs = require('fs');
const path = require('path');

// Function to split the large JSON file into smaller chunks
async function splitJsonData() {
  console.log('Starting JSON data splitting...');
  
  // Paths
  const inputPath = path.join(__dirname, '../public/data/processed_names.json');
  const outputDir = path.join(__dirname, '../public/data');
  const manifestPath = path.join(outputDir, 'manifest.json');
  
  // Check if split data already exists (for production builds)
  if (fs.existsSync(manifestPath)) {
    console.log('Split data already exists, skipping generation...');
    return;
  }
  
  // Check if source file exists
  if (!fs.existsSync(inputPath)) {
    console.error('Source file processed_names.json not found. Please run "npm run process-csv" first or ensure split files are committed.');
    process.exit(1);
  }
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  try {
    // Load the main processed data
    console.log('Loading processed_names.json...');
    const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    
    console.log(`Loaded ${data.names.length} names`);
    console.log(`Total file size: ${(fs.statSync(inputPath).size / 1024 / 1024).toFixed(2)} MB`);
    
    // 1. Summary data (for homepage)
    const summary = {
      ...data.summary,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    
    const summaryPath = path.join(outputDir, 'summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`✅ Summary saved: ${(fs.statSync(summaryPath).size / 1024).toFixed(0)} KB`);
    
    // 2. Split by gender
    const boysNames = data.names.filter(name => name.sex === 'M');
    const girlsNames = data.names.filter(name => name.sex === 'F');
    
    const boysData = {
      summary: {
        totalNames: boysNames.length,
        totalBirths: boysNames.reduce((sum, name) => sum + name.totalCount, 0),
        yearRange: data.summary.yearRange,
        gender: 'M'
      },
      names: boysNames
    };
    
    const girlsData = {
      summary: {
        totalNames: girlsNames.length,
        totalBirths: girlsNames.reduce((sum, name) => sum + name.totalCount, 0),
        yearRange: data.summary.yearRange,
        gender: 'F'
      },
      names: girlsNames
    };
    
    const boysPath = path.join(outputDir, 'boys_names.json');
    const girlsPath = path.join(outputDir, 'girls_names.json');
    
    fs.writeFileSync(boysPath, JSON.stringify(boysData, null, 2));
    fs.writeFileSync(girlsPath, JSON.stringify(girlsData, null, 2));
    
    console.log(`✅ Boys names saved: ${(fs.statSync(boysPath).size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`✅ Girls names saved: ${(fs.statSync(girlsPath).size / 1024 / 1024).toFixed(2)} MB`);
    
    // 3. Popular names by year (for quick access)
    const currentYear = new Date().getFullYear();
    const recentYears = [currentYear, currentYear - 1, currentYear - 2];
    
    const popularNames = {};
    
    recentYears.forEach(year => {
      const yearKey = year.toString();
      
      // Get top names for this year
      const topBoys = boysNames
        .filter(name => name.yearlyData[yearKey] && name.yearlyData[yearKey] > 0)
        .sort((a, b) => (b.yearlyData[yearKey] || 0) - (a.yearlyData[yearKey] || 0))
        .slice(0, 50)
        .map(name => ({
          name: name.name,
          sex: name.sex,
          births: name.yearlyData[yearKey],
          totalCount: name.totalCount
        }));
        
      const topGirls = girlsNames
        .filter(name => name.yearlyData[yearKey] && name.yearlyData[yearKey] > 0)
        .sort((a, b) => (b.yearlyData[yearKey] || 0) - (a.yearlyData[yearKey] || 0))
        .slice(0, 50)
        .map(name => ({
          name: name.name,
          sex: name.sex,
          births: name.yearlyData[yearKey],
          totalCount: name.totalCount
        }));
      
      popularNames[year] = {
        boys: topBoys,
        girls: topGirls
      };
    });
    
    const popularPath = path.join(outputDir, 'popular_by_year.json');
    fs.writeFileSync(popularPath, JSON.stringify(popularNames, null, 2));
    console.log(`✅ Popular names by year saved: ${(fs.statSync(popularPath).size / 1024).toFixed(0)} KB`);
    
    // 4. Trending names (names with significant growth)
    const trendingNames = {
      boys: [],
      girls: []
    };
    
    [boysNames, girlsNames].forEach((namesList, index) => {
      const genderKey = index === 0 ? 'boys' : 'girls';
      
      const trending = namesList
        .map(name => {
          const count2024 = name.yearlyData['2024'] || 0;
          const count2023 = name.yearlyData['2023'] || 0;
          const count2022 = name.yearlyData['2022'] || 0;
          
          // Calculate growth rate
          const avgOlder = (count2023 + count2022) / 2;
          const growthRate = avgOlder > 0 ? (count2024 - avgOlder) / avgOlder : 0;
          
          return {
            name: name.name,
            sex: name.sex,
            current: count2024,
            previous: count2023,
            growthRate: growthRate,
            totalCount: name.totalCount
          };
        })
        .filter(name => name.current >= 10 && name.growthRate > 0.1) // At least 10 births and 10% growth
        .sort((a, b) => b.growthRate - a.growthRate)
        .slice(0, 30);
      
      trendingNames[genderKey] = trending;
    });
    
    const trendingPath = path.join(outputDir, 'trending_names.json');
    fs.writeFileSync(trendingPath, JSON.stringify(trendingNames, null, 2));
    console.log(`✅ Trending names saved: ${(fs.statSync(trendingPath).size / 1024).toFixed(0)} KB`);
    
    // 5. Search index (lightweight version for quick search)
    const searchIndex = data.names.map(name => ({
      name: name.name,
      sex: name.sex,
      totalCount: name.totalCount,
      recent: name.yearlyData['2024'] || name.yearlyData['2023'] || 0,
      firstYear: name.firstYear,
      lastYear: name.lastYear
    }));
    
    const searchIndexPath = path.join(outputDir, 'search_index.json');
    fs.writeFileSync(searchIndexPath, JSON.stringify(searchIndex, null, 2));
    console.log(`✅ Search index saved: ${(fs.statSync(searchIndexPath).size / 1024 / 1024).toFixed(2)} MB`);
    
    // 6. Split popular names into chunks for lazy loading
    const CHUNK_SIZE = 1000;
    
    // Boys chunks
    for (let i = 0; i < boysNames.length; i += CHUNK_SIZE) {
      const chunk = boysNames.slice(i, i + CHUNK_SIZE);
      const chunkPath = path.join(outputDir, `boys_chunk_${Math.floor(i / CHUNK_SIZE)}.json`);
      fs.writeFileSync(chunkPath, JSON.stringify(chunk, null, 2));
    }
    
    // Girls chunks
    for (let i = 0; i < girlsNames.length; i += CHUNK_SIZE) {
      const chunk = girlsNames.slice(i, i + CHUNK_SIZE);
      const chunkPath = path.join(outputDir, `girls_chunk_${Math.floor(i / CHUNK_SIZE)}.json`);
      fs.writeFileSync(chunkPath, JSON.stringify(chunk, null, 2));
    }
    
    const boysChunks = Math.ceil(boysNames.length / CHUNK_SIZE);
    const girlsChunks = Math.ceil(girlsNames.length / CHUNK_SIZE);
    
    console.log(`✅ Created ${boysChunks} boys chunks and ${girlsChunks} girls chunks`);
    
    // 7. Create manifest file
    const manifest = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      files: {
        summary: 'summary.json',
        boys: 'boys_names.json',
        girls: 'girls_names.json',
        popular: 'popular_by_year.json',
        trending: 'trending_names.json',
        searchIndex: 'search_index.json'
      },
      chunks: {
        boys: {
          count: boysChunks,
          pattern: 'boys_chunk_{index}.json'
        },
        girls: {
          count: girlsChunks,
          pattern: 'girls_chunk_{index}.json'
        }
      },
      stats: {
        originalSize: fs.statSync(inputPath).size,
        totalNames: data.names.length,
        boysNames: boysNames.length,
        girlsNames: girlsNames.length
      }
    };
    
    const manifestPath = path.join(outputDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`✅ Manifest saved: ${(fs.statSync(manifestPath).size / 1024).toFixed(0)} KB`);
    
    // Summary
    console.log('\n📊 Splitting Summary:');
    console.log(`Original file: ${(fs.statSync(inputPath).size / 1024 / 1024).toFixed(2)} MB`);
    
    const totalSplit = fs.readdirSync(outputDir)
      .filter(file => file.endsWith('.json') && file !== 'processed_names.json')
      .reduce((total, file) => {
        return total + fs.statSync(path.join(outputDir, file)).size;
      }, 0);
    
    console.log(`Split files total: ${(totalSplit / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Compression achieved: ${(((fs.statSync(inputPath).size - totalSplit) / fs.statSync(inputPath).size) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Files created:');
    console.log('- summary.json (homepage data)');
    console.log('- boys_names.json (all boy names)');
    console.log('- girls_names.json (all girl names)');
    console.log('- popular_by_year.json (recent popular names)');
    console.log('- trending_names.json (trending names)');
    console.log('- search_index.json (lightweight search)');
    console.log(`- ${boysChunks + girlsChunks} chunk files (lazy loading)`);
    console.log('- manifest.json (file inventory)');
    
  } catch (error) {
    console.error('Error splitting JSON data:', error);
  }
}

// Run if called directly
if (require.main === module) {
  splitJsonData();
}

module.exports = { splitJsonData }; 