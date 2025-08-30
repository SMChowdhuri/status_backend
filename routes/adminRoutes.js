const express = require('express');
const router = express.Router();
const { loginAdmin, registerAdmin, manualCleanupStatusLogs } = require('../controllers/adminController');


//Route for admin registration
router.post('/register',registerAdmin);
// Login route for admins
router.post('/login', loginAdmin);
// Manual cleanup route for admins
router.post('/cleanup-logs', manualCleanupStatusLogs);

// (Optionally, we could add a POST /signup route here)

module.exports = router;
