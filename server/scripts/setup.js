/**
 * Setup Script - Start MongoDB and Seed Data
 */

const { spawn } = require('child_process');
const { seedDatabase } = require('./seedData');

async function setup() {
  console.log('🚀 Starting setup process...');
  
  try {
    // Try to seed the database (assumes MongoDB is running)
    console.log('📊 Attempting to seed database...');
    await seedDatabase();
    console.log('✅ Setup completed successfully!');
    
    console.log('\n🎯 Next steps:');
    console.log('1. Start the backend server: npm start');
    console.log('2. Start the frontend: cd ../client && npm start');
    console.log('3. Open http://localhost:3000 in your browser');
    console.log('\n📋 Available studies:');
    console.log('- PAT001: CT Chest (John Doe)');
    console.log('- PAT_PALAK_57F5AE30: MRI Brain (Palak Sharma)');
    console.log('- PAT_VIKASH_7F64CCAA: CT Abdomen (Vikash Kumar)');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure MongoDB is running:');
    console.log('   - Windows: Start MongoDB service or run mongod.exe');
    console.log('   - Mac: brew services start mongodb-community');
    console.log('   - Linux: sudo systemctl start mongod');
    console.log('2. Check if MongoDB is accessible at mongodb://localhost:27017');
    console.log('3. Try running the setup again');
    process.exit(1);
  }
}

if (require.main === module) {
  setup();
}

module.exports = { setup };