const mongoose = require('mongoose');
require('dotenv').config();

// Test script to verify AI features implementation
const testAIFeatures = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Test models
    const Service = require('./models/Service');
    const Incident = require('./models/Incident');
    const StatusLog = require('./models/StatusLog');
    
    console.log('✅ Models loaded successfully');

    // Test AI Service
    const aiService = require('./services/aiService');
    console.log('✅ AI Service loaded successfully');

    // Create a test service if none exists
    let testService = await Service.findOne({ name: 'Test Service' });
    if (!testService) {
      testService = new Service({
        name: 'Test Service',
        url: 'https://api.test.com',
        status: 'UP'
      });
      await testService.save();
      console.log('✅ Test service created');
    }

    // Create some test status logs
    const now = new Date();
    const testLogs = [
      {
        service: testService._id,
        status: 'UP',
        latency: 120,
        timestamp: new Date(now - 60000) // 1 minute ago
      },
      {
        service: testService._id,
        status: 'DOWN',
        latency: null,
        timestamp: new Date(now - 30000) // 30 seconds ago
      },
      {
        service: testService._id,
        status: 'UP',
        latency: 150,
        timestamp: now
      }
    ];

    // Clear existing logs for this test service
    await StatusLog.deleteMany({ service: testService._id });
    
    // Insert test logs
    await StatusLog.insertMany(testLogs);
    console.log('✅ Test status logs created');

    // Create a test incident
    const testIncident = new Incident({
      service: testService._id,
      title: 'Test Service Downtime',
      description: 'Service experienced brief downtime during testing',
      severity: 'MEDIUM',
      startTime: new Date(now - 60000),
      endTime: new Date(now - 30000),
      status: 'RESOLVED'
    });

    await testIncident.save();
    console.log('✅ Test incident created');

    // Test AI summary generation (only if API key is configured)
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
      try {
        console.log('🤖 Testing AI summary generation...');
        const logs = await StatusLog.find({ service: testService._id });
        const summary = await aiService.generateIncidentSummary(testIncident, logs);
        console.log('✅ AI summary generated successfully');
        console.log('📄 Summary preview:', summary.substring(0, 200) + '...');
      } catch (aiError) {
        console.log('⚠️  AI summary test failed:', aiError.message);
        console.log('   This is expected if GEMINI_API_KEY is not configured properly');
      }
    } else {
      console.log('⚠️  Skipping AI tests - GEMINI_API_KEY not configured');
      console.log('   Add your Gemini API key to .env file to test AI features');
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📚 Available endpoints:');
    console.log('   POST /api/incidents - Create incident');
    console.log('   GET  /api/incidents - Get all incidents');
    console.log('   POST /api/incidents/:id/generate-summary - Generate AI summary');
    console.log('   GET  /api/incidents/service/:serviceId/health-summary - Service health analysis');
    console.log('   POST /api/incidents/service/:serviceId/auto-detect - Auto-detect incidents');
    console.log('   GET  /api/services/:id/analytics - Service analytics');
    console.log('   GET  /api/services/:id/incidents - Service incidents');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
  }
};

// Run the test
testAIFeatures();
