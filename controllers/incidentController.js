const Incident = require('../models/Incident');
const Service = require('../models/Service');
const StatusLog = require('../models/StatusLog');
const aiService = require('../services/aiService');

// Get all incidents
const getAllIncidents = async (req, res) => {
  try {
    const incidents = await Incident.find()
      .populate('service', 'name url')
      .sort({ createdAt: -1 });
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching incidents', error });
  }
};

// Create a new incident
const createIncident = async (req, res) => {
  try {
    const { serviceId, title, description, severity, startTime, endTime } = req.body;
    
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const newIncident = new Incident({
      service: serviceId,
      title,
      description,
      severity,
      startTime,
      endTime,
    });

    await newIncident.save();
    await newIncident.populate('service', 'name url');

    // Emit WebSocket event
    req.app.get('io').emit('newIncident', newIncident);
    
    res.status(201).json(newIncident);
  } catch (error) {
    res.status(500).json({ message: 'Error creating incident', error });
  }
};

// Get incident by ID
const getIncidentById = async (req, res) => {
  try {
    const { id } = req.params;
    const incident = await Incident.findById(id)
      .populate('service', 'name url')
      .populate('affectedLogs');
    
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }
    
    res.json(incident);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching incident', error });
  }
};

// Update incident
const updateIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const updatedIncident = await Incident.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: Date.now() },
      { new: true }
    ).populate('service', 'name url');

    if (!updatedIncident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    // Emit WebSocket event
    req.app.get('io').emit('incidentUpdated', updatedIncident);
    
    res.json(updatedIncident);
  } catch (error) {
    res.status(500).json({ message: 'Error updating incident', error });
  }
};

// Delete incident
const deleteIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedIncident = await Incident.findByIdAndDelete(id);
    
    if (!deletedIncident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    // Emit WebSocket event
    req.app.get('io').emit('incidentDeleted', id);
    
    res.json({ message: 'Incident deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting incident', error });
  }
};

// Generate AI summary for an incident
const generateIncidentSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const incident = await Incident.findById(id).populate('service');
    
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    // Get related status logs for the incident timeframe
    const startTime = incident.startTime;
    const endTime = incident.endTime || new Date();
    
    const statusLogs = await StatusLog.find({
      service: incident.service._id,
      timestamp: {
        $gte: startTime,
        $lte: endTime
      }
    }).sort({ timestamp: 1 });

    // Generate AI summary
    const aiSummary = await aiService.generateIncidentSummary(incident, statusLogs);
    
    // Update incident with AI summary
    incident.aiSummary = aiSummary;
    incident.aiSummaryGeneratedAt = new Date();
    await incident.save();

    // Emit WebSocket event
    req.app.get('io').emit('incidentSummaryGenerated', {
      incidentId: id,
      summary: aiSummary
    });

    res.json({
      message: 'AI summary generated successfully',
      summary: aiSummary,
      generatedAt: incident.aiSummaryGeneratedAt
    });

  } catch (error) {
    console.error('Error generating incident summary:', error);
    res.status(500).json({ 
      message: 'Error generating AI summary', 
      error: error.message 
    });
  }
};

// Generate service health summary
const generateServiceHealthSummary = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { days = 7 } = req.query; // Default to last 7 days
    
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Get recent logs
    const recentLogs = await StatusLog.find({
      service: serviceId,
      timestamp: {
        $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      }
    }).sort({ timestamp: -1 });

    if (recentLogs.length === 0) {
      return res.status(400).json({ 
        message: 'No recent data available for health analysis' 
      });
    }

    // Generate health summary
    const healthSummary = await aiService.generateServiceHealthSummary(service, recentLogs);

    res.json({
      message: 'Service health summary generated successfully',
      service: {
        id: service._id,
        name: service.name,
        url: service.url
      },
      summary: healthSummary,
      dataPoints: recentLogs.length,
      periodDays: days,
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Error generating service health summary:', error);
    res.status(500).json({ 
      message: 'Error generating service health summary', 
      error: error.message 
    });
  }
};

// Auto-detect and create incidents based on service downtime
const autoDetectIncidents = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { thresholdMinutes = 5 } = req.query; // Default threshold: 5 minutes of downtime
    
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Get recent DOWN status logs
    const recentDownLogs = await StatusLog.find({
      service: serviceId,
      status: 'DOWN',
      timestamp: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    }).sort({ timestamp: 1 });

    if (recentDownLogs.length === 0) {
      return res.json({ message: 'No recent downtime detected', incidents: [] });
    }

    // Group consecutive DOWN logs into potential incidents
    const incidents = [];
    let currentIncident = null;
    
    for (const log of recentDownLogs) {
      if (!currentIncident) {
        currentIncident = {
          startTime: log.timestamp,
          endTime: log.timestamp,
          logs: [log]
        };
      } else {
        const timeDiff = (log.timestamp - currentIncident.endTime) / (1000 * 60); // minutes
        
        if (timeDiff <= 2) { // If logs are within 2 minutes, consider them part of same incident
          currentIncident.endTime = log.timestamp;
          currentIncident.logs.push(log);
        } else {
          // Check if previous incident meets threshold
          const duration = (currentIncident.endTime - currentIncident.startTime) / (1000 * 60);
          if (duration >= thresholdMinutes) {
            incidents.push(currentIncident);
          }
          
          // Start new incident
          currentIncident = {
            startTime: log.timestamp,
            endTime: log.timestamp,
            logs: [log]
          };
        }
      }
    }
    
    // Don't forget the last incident
    if (currentIncident) {
      const duration = (currentIncident.endTime - currentIncident.startTime) / (1000 * 60);
      if (duration >= thresholdMinutes) {
        incidents.push(currentIncident);
      }
    }

    // Create incident records for significant outages
    const createdIncidents = [];
    for (const incident of incidents) {
      const duration = (incident.endTime - incident.startTime) / (1000 * 60);
      
      // Check if incident already exists
      const existingIncident = await Incident.findOne({
        service: serviceId,
        startTime: {
          $gte: new Date(incident.startTime.getTime() - 60000), // 1 minute tolerance
          $lte: new Date(incident.startTime.getTime() + 60000)
        }
      });

      if (!existingIncident) {
        const newIncident = new Incident({
          service: serviceId,
          title: `Service Downtime Detected`,
          description: `Automated incident detection: Service was down for ${duration.toFixed(1)} minutes`,
          severity: duration > 30 ? 'HIGH' : duration > 10 ? 'MEDIUM' : 'LOW',
          startTime: incident.startTime,
          endTime: incident.endTime,
          affectedLogs: incident.logs.map(log => log._id),
          status: 'OPEN'
        });

        await newIncident.save();
        await newIncident.populate('service', 'name url');
        createdIncidents.push(newIncident);

        // Emit WebSocket event
        req.app.get('io').emit('autoIncidentDetected', newIncident);
      }
    }

    res.json({
      message: `Auto-detection completed. Found ${incidents.length} potential incidents, created ${createdIncidents.length} new incident records.`,
      detectedIncidents: incidents.length,
      createdIncidents: createdIncidents.length,
      incidents: createdIncidents
    });

  } catch (error) {
    console.error('Error in auto-detect incidents:', error);
    res.status(500).json({ 
      message: 'Error in auto-detection', 
      error: error.message 
    });
  }
};

module.exports = {
  getAllIncidents,
  createIncident,
  getIncidentById,
  updateIncident,
  deleteIncident,
  generateIncidentSummary,
  generateServiceHealthSummary,
  autoDetectIncidents
};
