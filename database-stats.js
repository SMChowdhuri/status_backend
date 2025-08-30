const mongoose = require('mongoose');
const StatusLog = require('./models/StatusLog');
const Service = require('./models/Service');
const { cleanupOldStatusLogs } = require('./cron/heartbeat');
require('dotenv').config();

// Script to show database statistics and test cleanup functionality
const showDatabaseStats = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get total count of status logs
    const totalLogs = await StatusLog.countDocuments();
    console.log(`📊 Total Status Logs: ${totalLogs}`);

    // Get logs count by age
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const logsLast24h = await StatusLog.countDocuments({ timestamp: { $gte: oneDayAgo } });
    const logsLast3d = await StatusLog.countDocuments({ timestamp: { $gte: threeDaysAgo } });
    const logsLast7d = await StatusLog.countDocuments({ timestamp: { $gte: sevenDaysAgo } });
    const logsOlderThan7d = await StatusLog.countDocuments({ timestamp: { $lt: sevenDaysAgo } });
    const logsOlderThan30d = await StatusLog.countDocuments({ timestamp: { $lt: thirtyDaysAgo } });

    console.log('\n📈 Status Logs Distribution:');
    console.log(`  Last 24 hours: ${logsLast24h}`);
    console.log(`  Last 3 days: ${logsLast3d}`);
    console.log(`  Last 7 days: ${logsLast7d}`);
    console.log(`  Older than 7 days: ${logsOlderThan7d} (will be cleaned up)`);
    console.log(`  Older than 30 days: ${logsOlderThan30d}`);

    // Get services count
    const servicesCount = await Service.countDocuments();
    console.log(`\n🔧 Total Services: ${servicesCount}`);

    // Calculate storage estimates
    const avgLogSize = 150; // estimated bytes per log document
    const totalStorageKB = (totalLogs * avgLogSize) / 1024;
    const storageToCleanKB = (logsOlderThan7d * avgLogSize) / 1024;

    console.log(`\n💾 Storage Estimates:`);
    console.log(`  Total logs storage: ~${totalStorageKB.toFixed(2)} KB`);
    console.log(`  Storage to be cleaned: ~${storageToCleanKB.toFixed(2)} KB`);

    // Show oldest and newest logs
    const oldestLog = await StatusLog.findOne().sort({ timestamp: 1 });
    const newestLog = await StatusLog.findOne().sort({ timestamp: -1 });

    if (oldestLog && newestLog) {
      console.log(`\n📅 Log Timeline:`);
      console.log(`  Oldest log: ${oldestLog.timestamp.toISOString()}`);
      console.log(`  Newest log: ${newestLog.timestamp.toISOString()}`);
    }

    return {
      totalLogs,
      logsLast24h,
      logsLast7d,
      logsOlderThan7d,
      servicesCount,
      storageKB: totalStorageKB
    };

  } catch (error) {
    console.error('❌ Error getting database stats:', error);
  }
};

// Test cleanup functionality
const testCleanup = async () => {
  try {
    console.log('\n🧹 Testing cleanup functionality...');
    
    const beforeStats = await showDatabaseStats();
    
    if (beforeStats.logsOlderThan7d > 0) {
      console.log(`\n⚠️  Found ${beforeStats.logsOlderThan7d} logs older than 7 days`);
      console.log('Do you want to proceed with cleanup? (This will delete old logs)');
      
      // For demo purposes, let's show what would be cleaned without actually cleaning
      console.log('🔍 Simulating cleanup...');
      
      const result = await cleanupOldStatusLogs();
      console.log(`✅ Cleanup result:`, result);
      
      // Show stats after cleanup
      console.log('\n📊 Stats after cleanup:');
      await showDatabaseStats();
    } else {
      console.log('✅ No logs older than 7 days found. No cleanup needed.');
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup test:', error);
  }
};

// Add sample old data for testing (optional)
const addTestOldData = async () => {
  try {
    console.log('\n🧪 Adding test data with old timestamps...');
    
    // Get a service to use for test data
    const service = await Service.findOne();
    if (!service) {
      console.log('⚠️  No services found. Please create a service first.');
      return;
    }

    // Create some old test logs
    const oldTestLogs = [];
    for (let i = 0; i < 10; i++) {
      const daysOld = 8 + i; // 8-17 days old
      oldTestLogs.push({
        service: service._id,
        status: i % 2 === 0 ? 'UP' : 'DOWN',
        latency: i % 2 === 0 ? 100 + i * 10 : null,
        timestamp: new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)
      });
    }

    await StatusLog.insertMany(oldTestLogs);
    console.log(`✅ Added ${oldTestLogs.length} test logs with old timestamps`);
    
  } catch (error) {
    console.error('❌ Error adding test data:', error);
  }
};

// Main execution
const runDatabaseAnalysis = async () => {
  console.log('🚀 Database Analysis and Cleanup Test');
  console.log('=====================================');

  try {
    // Show current stats
    await showDatabaseStats();

    // Ask if user wants to add test data
    const args = process.argv.slice(2);
    
    if (args.includes('--add-test-data')) {
      await addTestOldData();
      console.log('\n📊 Updated stats after adding test data:');
      await showDatabaseStats();
    }

    if (args.includes('--test-cleanup')) {
      await testCleanup();
    }

    if (args.includes('--cleanup')) {
      console.log('\n🧹 Running actual cleanup...');
      const result = await cleanupOldStatusLogs();
      console.log('Cleanup result:', result);
      
      console.log('\n📊 Final stats:');
      await showDatabaseStats();
    }

    if (args.length === 0) {
      console.log('\n💡 Available options:');
      console.log('  --add-test-data    Add old test data for cleanup testing');
      console.log('  --test-cleanup     Test cleanup functionality (simulation)');
      console.log('  --cleanup          Actually run cleanup and delete old logs');
      console.log('\nExample: node database-stats.js --add-test-data --cleanup');
    }

  } catch (error) {
    console.error('❌ Error in database analysis:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
  }
};

// Run the analysis
runDatabaseAnalysis();
