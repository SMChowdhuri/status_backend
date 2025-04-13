const express = require('express');
const router = express.Router();
const { loginAdmin, registerAdmin } = require('../controllers/adminController');


//Route for admin registration
router.post('/register',registerAdmin);
// Login route for admins
router.post('/login', loginAdmin);

// (Optionally, you could add a POST /signup route here)

module.exports = router;
