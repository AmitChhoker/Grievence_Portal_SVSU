const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models/user');
const Teacher = require('../models/teacher');
const HOD = require('../models/hod');
const Dean = require('../models/dean');

// JWT Configuration with fallback
const JWT_CONFIG = {
    secret: process.env.JWT_SECRET || 'your-fallback-secret-key-for-development-only',
    expiresIn: '7d'
};

// Validate JWT secret on module load
if (!process.env.JWT_SECRET) {
    console.warn('⚠️  WARNING: JWT_SECRET not found in environment variables. Using fallback key.');
    console.warn('⚠️  For production, set JWT_SECRET in your .env file');
} else {
    console.log('✅ JWT_SECRET loaded successfully');
}

// Helper function to generate JWT token
const generateToken = (payload) => {
    try {
        return jwt.sign(
            {
                userId: payload.userId,
                role: payload.role,
                email: payload.email,
                name: payload.name
            },
            JWT_CONFIG.secret,
            { expiresIn: JWT_CONFIG.expiresIn }
        );
    } catch (error) {
        console.error('❌ JWT Token generation error:', error);
        throw new Error('Token generation failed');
    }
};

// Student Registration
const studentRegister = async (req, res) => {
    try {
        console.log('Received registration data:', req.body);

        const { name, courseName, emailId, password, rollno, department, phoneNumber, semester, year } = req.body;

        // Basic validation
        if (!name || !emailId || !password || !rollno || !courseName || !department) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be provided'
            });
        }

        const existingUser = await User.findOne({ 
            $or: [{ emailId }, { rollno }] 
        });
        
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email or roll number already exists'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = new User({
            Name: name,
            Course_Name: courseName,
            emailId: emailId.toLowerCase().trim(),
            password: hashedPassword,
            rollno: rollno,
            Department: department,
            phoneNumber: phoneNumber || '',
            semester: semester || '',
            year: year || '',
            role: 'student'
        });

        await user.save();
        console.log('Student saved successfully:', user._id);

        // Generate token using helper function
        const token = generateToken({
            userId: user._id,
            role: user.role,
            email: user.emailId,
            name: user.Name
        });

        res.status(201).json({
            success: true,
            message: 'Student registered successfully',
            token,
            user: {
                id: user._id,
                name: user.Name,
                email: user.emailId,
                role: user.role,
                rollno: user.rollno,
                courseName: user.Course_Name,
                department: user.Department,
                semester: user.semester,
                year: user.year
            }
        });

    } catch (error) {
        console.error('Student registration error in backend:', error);
        res.status(400).json({
            success: false,
            message: error.message,
            error: error.name
        });
    }
};

// Teacher Registration
const registerTeacher = async (req, res) => {
    try {
        console.log('👨‍🏫 Teacher registration request:', req.body);
        
        const { name, emailId, password, department, role } = req.body;

        if (!name || !emailId || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required'
            });
        }

        const existingTeacher = await Teacher.findOne({ emailId: emailId.toLowerCase().trim() });
                
        if (existingTeacher) {
            return res.status(400).json({
                success: false,
                message: 'Teacher already exists with this email'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const teacher = new Teacher({
            Name: name,
            emailId: emailId.toLowerCase().trim(),
            password: hashedPassword,
            Department: department || 'CSE',
            role: role || 'coordinator',
            isFirstLogin: false
        });
        
        await teacher.save();

        res.status(201).json({
            success: true,
            message: 'Teacher registered successfully',
            teacher: {
                id: teacher._id,
                name: teacher.Name,
                email: teacher.emailId,
                role: teacher.role,
                department: teacher.Department
            }
        });

    } catch (error) {
        console.error('Teacher registration error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// HOD Registration
const registerHOD = async (req, res) => {
    try {
        console.log('👨‍💼 HOD registration request:', req.body);
        
        const { name, emailId, password, department } = req.body;

        if (!name || !emailId || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required'
            });
        }

        const existingHOD = await HOD.findOne({ emailId: emailId.toLowerCase().trim() });
                
        if (existingHOD) {
            return res.status(400).json({
                success: false,
                message: 'HOD already exists with this email'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const hod = new HOD({
            Name: name,
            emailId: emailId.toLowerCase().trim(),
            password: hashedPassword,
            Department: department || 'CSE',
            isFirstLogin: false
        });

        await hod.save();

        res.status(201).json({
            success: true,
            message: 'HOD registered successfully',
            hod: {
                id: hod._id,
                name: hod.Name,
                email: hod.emailId,
                role: hod.role,
                department: hod.Department
            }
        });

    } catch (error) {
        console.error('HOD registration error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Dean Registration
const registerDean = async (req, res) => {
    try {
        console.log('🎓 Dean registration request:', req.body);
        
        const { name, emailId, password } = req.body;

        if (!name || !emailId || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required'
            });
        }

        const existingDean = await Dean.findOne({ emailId: emailId.toLowerCase().trim() });
                
        if (existingDean) {
            return res.status(400).json({
                success: false,
                message: 'Dean already exists with this email'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const dean = new Dean({
            Name: name,
            emailId: emailId.toLowerCase().trim(),
            password: hashedPassword,
            isFirstLogin: false
        });

        await dean.save();

        res.status(201).json({
            success: true,
            message: 'Dean registered successfully',
            dean: {
                id: dean._id,
                name: dean.Name,
                email: dean.emailId,
                role: dean.role
            }
        });

    } catch (error) {
        console.error('Dean registration error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Student Login
const login = async (req, res) => {
    try {
        console.log('🔐 Student login attempt:', req.body);

        const { emailId, password } = req.body;

        if (!emailId || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const cleanEmail = emailId.toLowerCase().trim();

        const user = await User.findOne({ emailId: cleanEmail });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Student not found. Please register as student.'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials - Wrong password'
            });
        }

        // Generate token using helper function
        const token = generateToken({
            userId: user._id,
            role: user.role,
            email: user.emailId,
            name: user.Name
        });

        console.log('Student login successful for:', user.emailId, 'Role:', user.role);

        const userResponse = {
            id: user._id,
            name: user.Name,
            email: user.emailId,
            role: user.role,
            department: user.Department,
            courseName: user.Course_Name,
            rollno: user.rollno,
            semester: user.semester,
            year: user.year,
            isFirstLogin: user.isFirstLogin
        };

        res.json({
            success: true,
            message: 'Student login successful',
            token,
            user: userResponse
        });

    } catch (error) {
        console.error('Student login error in backend:', error);
        res.status(400).json({
            success: false,
            message: error.message,
            error: error.name
        });
    }
};

// Teacher Login
const teacherLogin = async (req, res) => {
    try {
        console.log('👨‍🏫 Teacher login attempt:', req.body);

        const { emailId, password } = req.body;

        if (!emailId || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const cleanEmail = emailId.toLowerCase().trim();

        const teacher = await Teacher.findOne({ emailId: cleanEmail });
        
        if (!teacher) {
            console.log('❌ Teacher not found for email:', cleanEmail);
            return res.status(400).json({
                success: false,
                message: 'Teacher account not found. Please contact administration to register as a teacher.'
            });
        }

        // Check if user is a teacher (coordinator)
        if (teacher.role !== 'coordinator') {
            console.log('❌ User is not a teacher:', teacher.role);
            return res.status(400).json({
                success: false,
                message: 'This account is not authorized for teacher access.'
            });
        }

        console.log('✅ Teacher found:', teacher.emailId, 'Role:', teacher.role);

        const isPasswordValid = await bcrypt.compare(password, teacher.password);
        
        if (!isPasswordValid) {
            console.log('❌ Invalid password for teacher:', teacher.emailId);
            return res.status(400).json({
                success: false,
                message: 'Invalid password. Please try again.'
            });
        }

        // Generate token using helper function
        const token = generateToken({
            userId: teacher._id,
            role: teacher.role,
            email: teacher.emailId,
            name: teacher.Name
        });

        console.log('✅ Teacher login successful for:', teacher.emailId);

        const teacherResponse = {
            id: teacher._id,
            name: teacher.Name,
            email: teacher.emailId,
            role: teacher.role,
            department: teacher.Department,
            isFirstLogin: teacher.isFirstLogin
        };

        res.json({
            success: true,
            message: 'Teacher login successful!',
            token,
            teacher: teacherResponse
        });

    } catch (error) {
        console.error('Teacher login error in backend:', error);
        res.status(400).json({
            success: false,
            message: error.message,
            error: error.name
        });
    }
};

// HOD Login
const hodLogin = async (req, res) => {
    try {
        console.log('👨‍💼 HOD login request received:', req.body);

        const { emailId, password } = req.body;

        if (!emailId || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const cleanEmail = emailId.toLowerCase().trim();
        console.log('🔍 Looking for HOD with email:', cleanEmail);

        const hod = await HOD.findOne({ emailId: cleanEmail });
        
        if (!hod) {
            console.log('❌ HOD not found for email:', cleanEmail);
            return res.status(400).json({
                success: false,
                message: 'HOD account not found. Please contact administration.'
            });
        }

        console.log('✅ HOD found:', hod.emailId, 'Role:', hod.role);

        const isPasswordValid = await bcrypt.compare(password, hod.password);
        
        if (!isPasswordValid) {
            console.log('❌ Invalid password for HOD:', hod.emailId);
            return res.status(400).json({
                success: false,
                message: 'Invalid password. Please try again.'
            });
        }

        // Generate token using helper function
        const token = generateToken({
            userId: hod._id,
            role: hod.role,
            email: hod.emailId,
            name: hod.Name
        });

        console.log('✅ HOD login successful for:', hod.emailId);

        const hodResponse = {
            id: hod._id,
            name: hod.Name,
            email: hod.emailId,
            role: hod.role,
            department: hod.Department,
            isFirstLogin: hod.isFirstLogin
        };

        res.json({
            success: true,
            message: 'HOD login successful!',
            token,
            hod: hodResponse
        });

    } catch (error) {
        console.error('HOD login error in backend:', error);
        res.status(400).json({
            success: false,
            message: error.message,
            error: error.name
        });
    }
};

// Dean Login
const deanLogin = async (req, res) => {
    try {
        console.log('🎓 Dean login request received:', req.body);

        const { emailId, password } = req.body;

        if (!emailId || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const cleanEmail = emailId.toLowerCase().trim();
        console.log('🔍 Looking for Dean with email:', cleanEmail);

        const dean = await Dean.findOne({ emailId: cleanEmail });
        
        if (!dean) {
            console.log('❌ Dean not found for email:', cleanEmail);
            return res.status(400).json({
                success: false,
                message: 'Dean account not found. Please contact administration.'
            });
        }

        console.log('✅ Dean found:', dean.emailId, 'Role:', dean.role);

        const isPasswordValid = await bcrypt.compare(password, dean.password);
        
        if (!isPasswordValid) {
            console.log('❌ Invalid password for Dean:', dean.emailId);
            return res.status(400).json({
                success: false,
                message: 'Invalid password. Please try again.'
            });
        }

        // Generate token using helper function
        const token = generateToken({
            userId: dean._id,
            role: dean.role,
            email: dean.emailId,
            name: dean.Name
        });

        console.log('✅ Dean login successful for:', dean.emailId);

        const deanResponse = {
            id: dean._id,
            name: dean.Name,
            email: dean.emailId,
            role: dean.role,
            isFirstLogin: dean.isFirstLogin
        };

        res.json({
            success: true,
            message: 'Dean login successful!',
            token,
            dean: deanResponse
        });

    } catch (error) {
        console.error('Dean login error in backend:', error);
        res.status(400).json({
            success: false,
            message: error.message,
            error: error.name
        });
    }
};

// Token verification endpoint
const verifyToken = async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.json({ 
                valid: false, 
                message: 'No token provided' 
            });
        }

        const decoded = jwt.verify(token, JWT_CONFIG.secret);
        
        // Check if user still exists based on role
        let user;
        if (decoded.role === 'student') {
            user = await User.findById(decoded.userId);
        } else if (decoded.role === 'coordinator') {
            user = await Teacher.findById(decoded.userId);
        } else if (decoded.role === 'hod') {
            user = await HOD.findById(decoded.userId);
        } else if (decoded.role === 'dean') {
            user = await Dean.findById(decoded.userId);
        }

        if (!user) {
            return res.json({ 
                valid: false, 
                message: 'User not found' 
            });
        }

        res.json({ 
            valid: true, 
            user: {
                id: user._id,
                name: user.Name,
                email: user.emailId,
                role: decoded.role
            }
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.json({ 
            valid: false, 
            message: 'Invalid token' 
        });
    }
};

// ... (Keep all other functions like getAllTeachers, getAllStudents, etc. the same)

module.exports = {
    studentRegister,
    login,
    teacherLogin,
    hodLogin,
    deanLogin,
    logout,
    getProfile,
    registerTeacher,
    registerHOD,
    registerDean,
    getAllTeachers,
    getAllStudents,
    getAllHODs,
    getDashboardStats,
    updatePasswordTeacher,
    updatePasswordHOD,
    updatePasswordDean,
    verifyToken, // Add the new verifyToken function
    generateToken // Export for testing if needed
};