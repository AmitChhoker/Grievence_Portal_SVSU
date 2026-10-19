const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models/user');
const Teacher = require('../models/teacher');
const HOD = require('../models/hod');
const Dean = require('../models/dean');

// ==================== JWT CONFIG ====================
const JWT_CONFIG = {
    secret: process.env.JWT_SECRET,
    expiresIn: '30d'
};

if (!process.env.JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET is not set. Auth will fail.');
} else {
    console.log('✅ JWT_SECRET loaded successfully (' + process.env.JWT_SECRET.length + ' chars)');
}

// Helper function to generate JWT token
const generateToken = (payload) => {
    if (!JWT_CONFIG.secret) {
        throw new Error('JWT_SECRET missing — cannot generate token');
    }
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

// ==================== STUDENT REGISTRATION ====================
const studentRegister = async (req, res) => {
    try {
        console.log('Received registration data:', req.body);

        const { name, courseName, emailId, password, rollno, department, phoneNumber, semester, year } = req.body;

        if (!name || !emailId || !password || !rollno || !courseName || !department) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be provided'
            });
        }

        const existingUser = await User.findOne({
            $or: [{ emailId: emailId.toLowerCase().trim() }, { rollno }]
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

// ==================== TEACHER REGISTRATION ====================
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

// ==================== HOD REGISTRATION ====================
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

// ==================== DEAN REGISTRATION ====================
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

// ==================== STUDENT LOGIN ====================
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

// ==================== TEACHER LOGIN ====================
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
            return res.status(400).json({
                success: false,
                message: 'Teacher account not found. Please contact administration.'
            });
        }

        if (teacher.role !== 'coordinator') {
            return res.status(400).json({
                success: false,
                message: 'This account is not authorized for teacher access.'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, teacher.password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid password. Please try again.'
            });
        }

        const token = generateToken({
            userId: teacher._id,
            role: teacher.role,
            email: teacher.emailId,
            name: teacher.Name
        });

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

// ==================== HOD LOGIN ====================
const hodLogin = async (req, res) => {
    try {
        console.log('👨‍💼 HOD login request:', req.body);

        const { emailId, password } = req.body;

        if (!emailId || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const cleanEmail = emailId.toLowerCase().trim();
        const hod = await HOD.findOne({ emailId: cleanEmail });

        if (!hod) {
            return res.status(400).json({
                success: false,
                message: 'HOD account not found. Please contact administration.'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, hod.password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid password. Please try again.'
            });
        }

        const token = generateToken({
            userId: hod._id,
            role: hod.role,
            email: hod.emailId,
            name: hod.Name
        });

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

// ==================== DEAN LOGIN ====================
const deanLogin = async (req, res) => {
    try {
        console.log('🎓 Dean login request:', req.body);

        const { emailId, password } = req.body;

        if (!emailId || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const cleanEmail = emailId.toLowerCase().trim();
        const dean = await Dean.findOne({ emailId: cleanEmail });

        if (!dean) {
            return res.status(400).json({
                success: false,
                message: 'Dean account not found. Please contact administration.'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, dean.password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid password. Please try again.'
            });
        }

        const token = generateToken({
            userId: dean._id,
            role: 'dean',
            email: dean.emailId,
            name: dean.Name
        });

        const deanResponse = {
            id: dean._id,
            name: dean.Name,
            email: dean.emailId,
            role: 'dean',
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

// ==================== LOGOUT (stateless JWT — client clears token) ====================
const logout = async (req, res) => {
    try {
        // JWT is stateless — client must delete the token from localStorage
        res.json({
            success: true,
            message: 'Logged out successfully. Please clear the token on client side.'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during logout'
        });
    }
};

// ==================== GET PROFILE ====================
const getProfile = async (req, res) => {
    try {
        const { userId, role } = req.user || {};

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }

        let user;
        if (role === 'student') {
            user = await User.findById(userId).select('-password');
        } else if (role === 'coordinator') {
            user = await Teacher.findById(userId).select('-password');
        } else if (role === 'hod') {
            user = await HOD.findById(userId).select('-password');
        } else if (role === 'dean') {
            user = await Dean.findById(userId).select('-password');
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.Name,
                email: user.emailId,
                role: role,
                department: user.Department,
                isFirstLogin: user.isFirstLogin
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching profile'
        });
    }
};

// ==================== GET ALL TEACHERS ====================
const getAllTeachers = async (req, res) => {
    try {
        const teachers = await Teacher.find({})
            .select('Name emailId role Department isFirstLogin');
        res.json({ success: true, teachers });
    } catch (error) {
        console.error('Error fetching teachers:', error);
        res.status(500).json({ success: false, message: 'Error fetching teachers' });
    }
};

// ==================== GET ALL STUDENTS ====================
const getAllStudents = async (req, res) => {
    try {
        const students = await User.find({ role: 'student' })
            .select('Name emailId rollno Department Course_Name semester year phoneNumber createdAt')
            .sort({ createdAt: -1 });
        res.json({ success: true, students, count: students.length });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ success: false, message: 'Error fetching students' });
    }
};

// ==================== GET ALL HODs ====================
const getAllHODs = async (req, res) => {
    try {
        const hods = await HOD.find({})
            .select('Name emailId Department isFirstLogin createdAt');
        res.json({ success: true, hods });
    } catch (error) {
        console.error('Error fetching HODs:', error);
        res.status(500).json({ success: false, message: 'Error fetching HODs' });
    }
};

// ==================== GET DASHBOARD STATS ====================
const getDashboardStats = async (req, res) => {
    try {
        const totalTeachers = await Teacher.countDocuments({ role: 'coordinator' });
        const totalStudents = await User.countDocuments({ role: 'student' });
        const totalHODs = await HOD.countDocuments();
        const totalDeans = await Dean.countDocuments();

        const departments = await User.distinct('Department');
        const departmentStats = await User.aggregate([
            { $match: { role: 'student' } },
            { $group: { _id: '$Department', count: { $sum: 1 } } }
        ]);

        res.json({
            success: true,
            stats: {
                totalTeachers,
                totalStudents,
                totalHODs,
                totalDeans,
                totalDepartments: departments.length,
                departmentStats
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard statistics'
        });
    }
};

// ==================== UPDATE PASSWORD - TEACHER ====================
const updatePasswordTeacher = async (req, res) => {
    try {
        const { emailId, currentPassword, newPassword } = req.body;

        const teacher = await Teacher.findOne({ emailId: emailId.toLowerCase().trim() });
        if (!teacher) {
            return res.status(400).json({ success: false, message: 'Teacher not found' });
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, teacher.password);
        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }

        teacher.password = await bcrypt.hash(newPassword, 12);
        teacher.isFirstLogin = false;
        await teacher.save();

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Teacher password update error:', error);
        res.status(500).json({ success: false, message: 'Error updating password' });
    }
};

// ==================== UPDATE PASSWORD - HOD ====================
const updatePasswordHOD = async (req, res) => {
    try {
        const { emailId, currentPassword, newPassword } = req.body;

        const hod = await HOD.findOne({ emailId: emailId.toLowerCase().trim() });
        if (!hod) {
            return res.status(400).json({ success: false, message: 'HOD not found' });
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, hod.password);
        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }

        hod.password = await bcrypt.hash(newPassword, 12);
        hod.isFirstLogin = false;
        await hod.save();

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('HOD password update error:', error);
        res.status(500).json({ success: false, message: 'Error updating password' });
    }
};

// ==================== UPDATE PASSWORD - DEAN ====================
const updatePasswordDean = async (req, res) => {
    try {
        const { emailId, currentPassword, newPassword } = req.body;

        const dean = await Dean.findOne({ emailId: emailId.toLowerCase().trim() });
        if (!dean) {
            return res.status(400).json({ success: false, message: 'Dean not found' });
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, dean.password);
        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }

        dean.password = await bcrypt.hash(newPassword, 12);
        dean.isFirstLogin = false;
        await dean.save();

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Dean password update error:', error);
        res.status(500).json({ success: false, message: 'Error updating password' });
    }
};

// ==================== VERIFY TOKEN ====================
const verifyToken = async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.json({ valid: false, message: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_CONFIG.secret);

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
            return res.json({ valid: false, message: 'User not found' });
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
        res.json({ valid: false, message: 'Invalid token' });
    }
};

// ==================== EXPORTS ====================
// ✅ All exports now properly defined — no ReferenceError possible
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
    verifyToken,
    generateToken
};