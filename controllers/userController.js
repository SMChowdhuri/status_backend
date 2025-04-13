const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'yourSecretKey';

const loginUser = async (req, res) => {
    const { email, password } = req.body;
    console.log("In the backend ",req.body)
    try {
        // Check if email is admin domain
        // if (email.endsWith('@service.admin.com')) {
        //     return res.status(401).json({ 
        //         message: 'Please use admin login for admin accounts' 
        //     });
        // }

        // Find user
        console.log("In the backend ")
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Create token
        const token = jwt.sign(
            { id: user._id, email: user.email, role: 'user' },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                role: 'user'
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

const registerUser = async (req, res) => {
    const { email, password } = req.body;
    console.log("In the backend register")
    try {
        // Check if email is admin domain
        if (email.endsWith('@service.admin.com')) {
            return res.status(400).json({ 
                message: 'Cannot register with admin email domain' 
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = new User({
            email,
            passwordHash: hashedPassword
        });

        await user.save();

        res.status(201).json({ message: 'User registered successfully' });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            message: 'Error registering user', 
            error: error.message 
        });
    }
};

module.exports = {
    loginUser,
    registerUser
};