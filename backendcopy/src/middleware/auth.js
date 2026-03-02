const jwt = require('jsonwebtoken');

// Use the EXACT same JWT secret as server.js from your .env
const JWT_SECRET = process.env.JWT_SECRET;

console.log('🛡️ Auth Middleware Loaded - JWT Secret:', JWT_SECRET ? `Set (${JWT_SECRET.length} chars)` : 'NOT SET - CHECK .env FILE');

const auth = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            console.log('❌ Auth Middleware: No token provided');
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        console.log('🔐 Auth Middleware: Verifying token...');
        
        if (!JWT_SECRET) {
            console.log('❌ Auth Middleware: JWT_SECRET is not configured');
            return res.status(500).json({
                success: false,
                message: 'Server configuration error'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('✅ Auth Middleware: Token verified for user:', decoded.email);
        
        req.user = decoded;
        next();
    } catch (error) {
        console.error('❌ Auth Middleware: Token verification failed:', error.message);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please login again.'
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. Please login again.'
            });
        } else {
            return res.status(401).jmson({
                success: false,
                message: 'Token verification failed. Please login again.'
            });
        }
    }
};

module.exports = { auth };