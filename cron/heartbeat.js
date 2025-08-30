const cron = require('node-cron');
const axios = require('axios');
const Service = require('../models/Service');
const StatusLog = require('../models/StatusLog');

const startHeartbeat = (io) => {
  // Schedule a job to run every 5 minutes
  cron.schedule('* * * * *', async () => {
    console.log('Running heartbeat check...');
    const services = await Service.find();

    for (const service of services) {
      const startTime = Date.now();
      try {
        const response = await axios.get(service.url, { timeout: 5000 });
        const latency = Date.now() - startTime;
        const status = response.status === 200 ? 'UP' : 'DOWN';

        // Save to StatusLog
        await StatusLog.create({
          service: service._id,
          status,
          latency: status === 'UP' ? latency : null,
          timestamp: new Date()
        });

        // Calculate uptime
        const logs = await StatusLog.find({ service: service._id });
        const upLogs = logs.filter(log => log.status === 'UP');
        const uptime = logs.length > 0 ? (upLogs.length / logs.length) * 100 : 0;

        // Update service
        await Service.findByIdAndUpdate(service._id, {
          status,
          latency: status === 'UP' ? latency : null,
          lastChecked: new Date(),
          uptime: parseFloat(uptime.toFixed(2))
        });

        // Emit WebSocket event
        if (io) {
          io.emit('serviceStatusUpdate', {
            _id: service._id,
            status,
            latency: status === 'UP' ? latency : null,
            uptime: parseFloat(uptime.toFixed(2)),
            lastChecked: new Date(),
            name: service.name,
            url: service.url
          });
        }

      } catch (error) {
        const latency = Date.now() - startTime;
        
        // Service is down
        await StatusLog.create({
          service: service._id,
          status: 'DOWN',
          latency: null,
          timestamp: new Date()
        });

        // Calculate uptime
        const logs = await StatusLog.find({ service: service._id });
        const upLogs = logs.filter(log => log.status === 'UP');
        const uptime = logs.length > 0 ? (upLogs.length / logs.length) * 100 : 0;

        await Service.findByIdAndUpdate(service._id, {
          status: 'DOWN',
          latency: null,
          lastChecked: new Date(),
          uptime: parseFloat(uptime.toFixed(2))
        });

        // Emit WebSocket event
        if (io) {
          io.emit('serviceStatusUpdate', {
            _id: service._id,
            status: 'DOWN',
            latency: null,
            uptime: parseFloat(uptime.toFixed(2)),
            lastChecked: new Date(),
            name: service.name,
            url: service.url
          });
        }
      }
    }
  });

  // Schedule cleanup job to run daily at midnight to remove logs older than 7 days
  cron.schedule('0 0 * * *', async () => {
    console.log('Running status logs cleanup...');
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const deleteResult = await StatusLog.deleteMany({
        timestamp: { $lt: sevenDaysAgo }
      });
      
      console.log(`✅ Cleanup completed: Deleted ${deleteResult.deletedCount} old status logs`);
      
      // Emit cleanup event for monitoring
      if (io) {
        io.emit('statusLogsCleanup', {
          deletedCount: deleteResult.deletedCount,
          cleanupDate: new Date(),
          cutoffDate: sevenDaysAgo
        });
      }
    } catch (error) {
      console.error('❌ Error during status logs cleanup:', error);
    }
  });

  console.log('🚀 Heartbeat monitoring started (every 5 minutes)');
  console.log('🧹 Status logs cleanup scheduled (daily at midnight)');
};

// Function to manually trigger cleanup (useful for testing or manual maintenance)
const cleanupOldStatusLogs = async () => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const deleteResult = await StatusLog.deleteMany({
      timestamp: { $lt: sevenDaysAgo }
    });
    
    console.log(`Manual cleanup completed: Deleted ${deleteResult.deletedCount} old status logs`);
    return {
      success: true,
      deletedCount: deleteResult.deletedCount,
      cutoffDate: sevenDaysAgo
    };
  } catch (error) {
    console.error('Error during manual cleanup:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = { startHeartbeat, cleanupOldStatusLogs };
