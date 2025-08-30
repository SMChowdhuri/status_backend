const express = require('express');
const router = express.Router();
const {
  getAllIncidents,
  createIncident,
  getIncidentById,
  updateIncident,
  deleteIncident,
  generateIncidentSummary,
  generateServiceHealthSummary,
  autoDetectIncidents
} = require('../controllers/incidentController');

// Basic CRUD operations
router.get('/', getAllIncidents);
router.post('/', createIncident);
router.get('/:id', getIncidentById);
router.put('/:id', updateIncident);
router.delete('/:id', deleteIncident);

// AI-powered endpoints
router.post('/:id/generate-summary', generateIncidentSummary);
router.get('/service/:serviceId/health-summary', generateServiceHealthSummary);
router.post('/service/:serviceId/auto-detect', autoDetectIncidents);

module.exports = router;
