const jwt = require('jsonwebtoken');
const { User } = require('../models/user');

const auth = async (req, res, next) => {
    try {
        // Multiple sources se token check karo
        const token = req.header('Authorization')?.replace('Bearer ', '') || 
                     req.headers.authorization?.replace('Bearer ', '') ||
                     req.cookies?.token;

        console.log('🔐 Token check:', {
            hasAuthHeader: !!req.header('Authorization'),
            hasHeadersAuth: !!req.headers.authorization,
            hasCookies: !!req.cookies?.token,
            tokenPresent: !!token
        });

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        console.log('✅ Token decoded:', { userId: decoded.userId, role: decoded.role });

        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. User not found.'
            });
        }

        req.user = {
            userId: user._id,
            name: user.Name,
            email: user.emailId,
            role: user.role
        };

        console.log('✅ User authenticated:', req.user.name);
        next();
    } catch (error) {
        console.error('❌ Auth error:', error.message);
        res.status(401).json({
            success: false,
            message: 'Invalid token.'
        });
    }
};

module.exports = { auth };