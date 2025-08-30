const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { cleanupOldStatusLogs } = require('../cron/heartbeat');

const JWT_SECRET = process.env.JWT_SECRET || 'yourSecretKey';

// Admin Registration
const registerAdmin = async (req, res) => {
    const { email, password } = req.body;
    
    try {
        // Check email domain
        if (!email.endsWith('@service.admin.com')) {
            return res.status(400).json({ 
                message: 'Email must end with @service.admin.com' 
            });
        }

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ 
                message: 'Admin already exists' 
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new admin
        const admin = new Admin({
            email,
            passwordHash: hashedPassword
        });

        await admin.save();

        // Create token
        const token = jwt.sign(
            { id: admin._id, email: admin.email, role: 'admin' },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(201).json({
            message: 'Admin registered successfully',
            token,
            user: {
                id: admin._id,
                email: admin.email,
                role: 'admin'
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            message: 'Error registering admin', 
            error: error.message 
        });
    }
};

// Admin Login
const loginAdmin = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check email domain
        if (!email.endsWith('@service.admin.com')) {
            return res.status(401).json({ 
                message: 'Unauthorized domain' 
            });
        }

        // Find admin
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(401).json({ 
                message: 'Invalid credentials' 
            });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, admin.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ 
                message: 'Invalid credentials' 
            });
        }

        // Create token
        const token = jwt.sign(
            { id: admin._id, email: admin.email, role: 'admin' },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: admin._id,
                email: admin.email,
                role: 'admin'
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Manual Status Logs Cleanup
const manualCleanupStatusLogs = async (req, res) => {
    try {
        const result = await cleanupOldStatusLogs();
        
        if (result.success) {
            res.json({
                message: 'Status logs cleanup completed successfully',
                deletedCount: result.deletedCount,
                cutoffDate: result.cutoffDate
            });
        } else {
            res.status(500).json({
                message: 'Cleanup failed',
                error: result.error
            });
        }
    } catch (error) {
        console.error('Manual cleanup error:', error);
        res.status(500).json({ 
            message: 'Error during manual cleanup', 
            error: error.message 
        });
    }
};

module.exports = {
    registerAdmin,
    loginAdmin,
    manualCleanupStatusLogs
};