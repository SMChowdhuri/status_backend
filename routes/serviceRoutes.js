const express = require('express');
const router = express.Router();
const {
  getAllServices,
  createService,
  updateServiceStatus,
  deleteService,
  getServiceStatus,
  getServiceLogs,
  getServiceUptime,
  getServiceIncidents,
  getServiceAnalytics
} = require('../controllers/serviceController');

router.get('/', getAllServices);
router.post('/', createService);
router.put('/:id', updateServiceStatus);
router.delete('/:id', deleteService);
router.get('/:id/status', getServiceStatus);
router.get('/:id/logs', getServiceLogs);
router.get('/:id/uptime', getServiceUptime);
router.get('/:id/incidents', getServiceIncidents);
router.get('/:id/analytics', getServiceAnalytics);

module.exports = router;