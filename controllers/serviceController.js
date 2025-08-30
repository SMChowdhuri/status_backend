const Service = require('../models/Service');
const StatusLog = require('../models/StatusLog');

const getAllServices = async (req, res) => {
  const services = await Service.find();
  res.json(services);
};

const createService = async (req, res) => {
  try {
    const { name, url } = req.body;
    const newService = new Service({ 
      name,
      url,
      status: 'UNKNOWN',
      lastUpdated: Date.now(),
    });
    await newService.save();
    
    // Emit WebSocket event
    req.app.get('io').emit('newServiceRegistered', newService);
    res.status(201).json(newService);
  } catch (error) {
    res.status(500).json({ message: 'Failed to register service', error });
  }
};

const updateServiceStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const updated = await Service.findByIdAndUpdate(
    id,
    {
      status,
      lastUpdated: Date.now(),
    }, 
    { new: true }
  );

  // Emit WebSocket event
  req.app.get('io').emit('serviceUpdated', updated);
  res.json(updated);
};

const deleteService = async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await Service.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    // Emit WebSocket event
    req.app.get('io').emit('serviceDeleted', id);
    res.status(200).json({ message: 'Service deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting service', error: err });
  }
};

const getServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const latestLog = await StatusLog.findOne({ service: id }).sort({ timestamp: -1 });
    if (!latestLog) {
      return res.status(404).json({ message: 'No status logs found for this service.' });
    }
    res.json(latestLog);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching service status', error });
  }
};

const getServiceLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await StatusLog.find({ service: id }).sort({ timestamp: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching service logs', error });
  }
};

const getServiceUptime = async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await StatusLog.find({ service: id });
    if (logs.length === 0) {
      return res.json({ uptime: 'N/A' });
    }
    const upCount = logs.filter(log => log.status === 'UP').length;
    const uptimePercentage = (upCount / logs.length) * 100;
    res.json({ uptime: `${uptimePercentage.toFixed(2)}%` });
  } catch (error) {
    res.status(500).json({ message: 'Error calculating uptime', error });
  }
};

// Get service incidents
const getServiceIncidents = async (req, res) => {
  try {
    const { id } = req.params;
    const Incident = require('../models/Incident');
    
    const incidents = await Incident.find({ service: id })
      .populate('service', 'name url')
      .sort({ createdAt: -1 });
    
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching service incidents', error });
  }
};

// Get service analytics (downtime patterns, etc.)
const getServiceAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;
    
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Get logs for the specified period
    const logs = await StatusLog.find({
      service: id,
      timestamp: { $gte: startDate }
    }).sort({ timestamp: 1 });

    if (logs.length === 0) {
      return res.json({
        message: 'No data available for the specified period',
        analytics: null
      });
    }

    // Calculate analytics
    const upCount = logs.filter(log => log.status === 'UP').length;
    const downCount = logs.filter(log => log.status === 'DOWN').length;
    const totalChecks = logs.length;
    
    const uptimePercentage = (upCount / totalChecks) * 100;
    const downtimePercentage = (downCount / totalChecks) * 100;
    
    // Calculate average latency
    const validLatencies = logs.filter(log => log.latency != null);
    const avgLatency = validLatencies.length > 0 
      ? validLatencies.reduce((sum, log) => sum + log.latency, 0) / validLatencies.length 
      : 0;

    // Find longest downtime streak
    let maxDowntimeStreak = 0;
    let currentDowntimeStreak = 0;
    
    logs.forEach(log => {
      if (log.status === 'DOWN') {
        currentDowntimeStreak++;
        maxDowntimeStreak = Math.max(maxDowntimeStreak, currentDowntimeStreak);
      } else {
        currentDowntimeStreak = 0;
      }
    });

    // Group by day for trend analysis
    const dailyStats = {};
    logs.forEach(log => {
      const day = log.timestamp.toISOString().split('T')[0];
      if (!dailyStats[day]) {
        dailyStats[day] = { up: 0, down: 0, totalLatency: 0, latencyCount: 0 };
      }
      
      if (log.status === 'UP') dailyStats[day].up++;
      else dailyStats[day].down++;
      
      if (log.latency != null) {
        dailyStats[day].totalLatency += log.latency;
        dailyStats[day].latencyCount++;
      }
    });

    const trendData = Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      uptime: stats.up + stats.down > 0 ? (stats.up / (stats.up + stats.down)) * 100 : 0,
      avgLatency: stats.latencyCount > 0 ? stats.totalLatency / stats.latencyCount : 0,
      totalChecks: stats.up + stats.down
    }));

    res.json({
      period: `${days} days`,
      totalChecks,
      uptimePercentage: uptimePercentage.toFixed(2),
      downtimePercentage: downtimePercentage.toFixed(2),
      averageLatency: avgLatency.toFixed(2),
      maxDowntimeStreak,
      trendData: trendData.slice(-30) // Return last 30 days max
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Error fetching service analytics', error });
  }
};

module.exports = {
  getAllServices,
  createService,
  updateServiceStatus,
  deleteService,
  getServiceStatus,
  getServiceLogs,
  getServiceUptime,
  getServiceIncidents,
  getServiceAnalytics,
};