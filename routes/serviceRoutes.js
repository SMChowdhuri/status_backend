const express = require('express');
const router = express.Router();
const {
  getAllServices,
  createService,
  updateServiceStatus,
  deleteService
} = require('../controllers/serviceController');


router.get('/', getAllServices);
router.post('/', createService);
router.put('/:id', updateServiceStatus);
router.delete('/:id', deleteService);

module.exports = router;