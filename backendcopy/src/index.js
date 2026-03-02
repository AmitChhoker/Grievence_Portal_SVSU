const express = require('express');
const mongoose = require('mongoose');
const app = express();
require('dotenv').config();
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import Models
const { User } = require('./models/user');
const Teacher = require('./models/teacher');
const HOD = require('./models/hod');
const Dean = require('./models/dean');
const Complaint = require('./models/complaint');
const { auth } = require('./middleware/auth');
require('./cron');

// Middleware
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => console.log('❌ MongoDB Connection Error:', err));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/complaints/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 400 * 1024 // 400KB limit
    },
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|pdf|doc|docx/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images and documents are allowed'));
        }
    }
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}
if (!fs.existsSync('uploads/complaints')) {
    fs.mkdirSync('uploads/complaints', { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// ==================== AUTHENTICATION ROUTES ====================

// Student Registration Route
app.post('/api/auth/register/student', async (req, res) => {
    try {
        console.log('📝 Student registration request:', req.body);
        
        const { name, emailId, password, rollno, courseName, department, phoneNumber, semester, year } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ 
            $or: [{ emailId }, { rollno }] 
        });
        
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email or roll number'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create new student
        const user = new User({
            Name: name,
            emailId: emailId.toLowerCase().trim(),
            password: hashedPassword,
            rollno: rollno,
            Course_Name: courseName,
            Department: department,
            phoneNumber: phoneNumber || '',
            semester: semester || '',
            year: year || '',
            role: 'student'
        });

        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.emailId, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '30d' }
        );

        res.status(201).json({
            success: true,
            message: 'Student registered successfully',
            token,
            user: {
                id: user._id,
                name: user.Name,
                email: user.emailId,
                rollno: user.rollno,
                courseName: user.Course_Name,
                department: user.Department,
                semester: user.semester,
                year: user.year,
                role: user.role
            }
        });

    } catch (error) {
        console.error('❌ Student registration error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Teacher Registration Route
app.post('/api/auth/register/teacher', async (req, res) => {
    try {
        console.log('👨‍🏫 Teacher registration request:', req.body);
        
        const { name, emailId, password, department, role } = req.body;

        // Validate required fields
        if (!name || !emailId || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required'
            });
        }

        // Check if teacher exists in Teacher collection
        const existingTeacher = await Teacher.findOne({ emailId: emailId.toLowerCase().trim() });
        
        if (existingTeacher) {
            return res.status(400).json({
                success: false,
                message: 'Teacher already exists with this email'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create new teacher in Teacher collection
        const teacher = new Teacher({
            Name: name,
            emailId: emailId.toLowerCase().trim(),
            password: hashedPassword,
            Department: department || 'CSE',
            role: role || 'coordinator' || 'teacher',
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
        console.error('❌ Teacher registration error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// HOD Registration Route
app.post('/api/auth/register/hod', async (req, res) => {
    try {
        console.log('👨‍💼 HOD registration request:', req.body);
        
        const { name, emailId, password, department } = req.body;

        // Validate required fields
        if (!name || !emailId || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required'
            });
        }

        // Check if HOD exists in HOD collection
        const existingHOD = await HOD.findOne({ emailId: emailId.toLowerCase().trim() });
        
        if (existingHOD) {
            return res.status(400).json({
                success: false,
                message: 'HOD already exists with this email'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create new HOD in HOD collection
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
        console.error('❌ HOD registration error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Dean Registration Route
app.post('/api/auth/register/dean', async (req, res) => {
    try {
        console.log('🎓 Dean registration request:', req.body);
        
        const { name, emailId, password } = req.body;

        // Validate required fields
        if (!name || !emailId || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required'
            });
        }

        // Check if Dean exists in Dean collection
        const existingDean = await Dean.findOne({ emailId: emailId.toLowerCase().trim() });
        
        if (existingDean) {
            return res.status(400).json({
                success: false,
                message: 'Dean already exists with this email'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create new Dean in Dean collection
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
        console.error('❌ Dean registration error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Student Login Route
app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('🔐 Student login request received:', req.body);
        
        const { emailId, password } = req.body;

        // Basic validation
        if (!emailId || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const cleanEmail = emailId.toLowerCase().trim();
        console.log('🔍 Looking for student with email:', cleanEmail);

        // Find user by email in User collection
        const user = await User.findOne({ emailId: cleanEmail });
        
        // If user not found
        if (!user) {
            console.log('❌ Student not found for email:', cleanEmail);
            return res.status(400).json({
                success: false,
                message: 'Student not found. Please check your email or register as student.'
            });
        }

        console.log('✅ Student found:', user.emailId, 'Role:', user.role);

        // Check password
        console.log('🔑 Checking password...');
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            console.log('❌ Invalid password for student:', user.emailId);
            return res.status(400).json({
                success: false,
                message: 'Invalid password. Please try again.'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.emailId, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '30d' }
        );

        console.log('✅ Student login successful for:', user.emailId);

        // Prepare student response
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
            message: 'Student login successful!',
            token,
            user: userResponse
        });

    } catch (error) {
        console.error('❌ Student login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login: ' + error.message
        });
    }
});

// Teacher Login Route
app.post('/api/auth/login/teacher', async (req, res) => {
    try {
        console.log('👨‍🏫 Teacher login request received:', req.body);
        
        const { emailId, password } = req.body;

        // Basic validation
        if (!emailId || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const cleanEmail = emailId.toLowerCase().trim();
        console.log('🔍 Looking for teacher with email:', cleanEmail);

        // Find teacher by email in Teacher collection
        const teacher = await Teacher.findOne({ emailId: cleanEmail });
        
        // If teacher not found
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

        // Check password
        const isPasswordValid = await bcrypt.compare(password, teacher.password);
        
        if (!isPasswordValid) {
            console.log('❌ Invalid password for teacher:', teacher.emailId);
            return res.status(400).json({
                success: false,
                message: 'Invalid password. Please try again.'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: teacher._id, email: teacher.emailId, role: teacher.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '30d' }
        );

        console.log('✅ Teacher login successful for:', teacher.emailId);

        // Prepare teacher response
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
        console.error('❌ Teacher login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during teacher login: ' + error.message
        });
    }
});

// HOD Login Route
app.post('/api/auth/login/hod', async (req, res) => {
    try {
        console.log('👨‍💼 HOD login request received:', req.body);
        
        const { emailId, password } = req.body;

        // Basic validation
        if (!emailId || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const cleanEmail = emailId.toLowerCase().trim();
        console.log('🔍 Looking for HOD with email:', cleanEmail);

        // Find HOD by email in HOD collection
        const hod = await HOD.findOne({ emailId: cleanEmail });
        
        // If HOD not found
        if (!hod) {
            console.log('❌ HOD not found for email:', cleanEmail);
            return res.status(400).json({
                success: false,
                message: 'HOD account not found. Please contact administration.'
            });
        }

        console.log('✅ HOD found:', hod.emailId, 'Role:', hod.role);

        // Check password
        const isPasswordValid = await bcrypt.compare(password, hod.password);
        
        if (!isPasswordValid) {
            console.log('❌ Invalid password for HOD:', hod.emailId);
            return res.status(400).json({
                success: false,
                message: 'Invalid password. Please try again.'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: hod._id, email: hod.emailId, role: hod.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '30d' }
        );

        console.log('✅ HOD login successful for:', hod.emailId);

        // Prepare HOD response
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
        console.error('❌ HOD login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during HOD login: ' + error.message
        });
    }
});

// Dean Login Route
app.post('/api/auth/login/dean', async (req, res) => {
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

        // Find Dean by email in Dean collection
        const dean = await Dean.findOne({ emailId: cleanEmail });
        
        if (!dean) {
            console.log('❌ Dean not found for email:', cleanEmail);
            return res.status(400).json({
                success: false,
                message: 'Dean account not found. Please contact administration.'
            });
        }

        console.log('✅ Dean found:', dean.emailId);

        // Check password
        const isPasswordValid = await bcrypt.compare(password, dean.password);
        
        if (!isPasswordValid) {
            console.log('❌ Invalid password for Dean:', dean.emailId);
            return res.status(400).json({
                success: false,
                message: 'Invalid password. Please try again.'
            });
        }

        // ✅ CRITICAL FIX: Generate Dean-specific token
        const tokenPayload = {
            userId: dean._id.toString(),
            email: dean.emailId,
            role: 'dean', // ✅ Hardcoded dean role
            name: dean.Name
        };

        console.log('🔐 Dean token payload:', tokenPayload);

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '30d' }
        );

        console.log('✅ Dean login successful for:', dean.emailId);

        // Prepare Dean response
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
        console.error('❌ Dean login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during Dean login: ' + error.message
        });
    }
});

// Enhanced token verification
app.get('/api/auth/verify-dean-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.json({ 
        valid: false, 
        message: 'No token provided',
        role: null 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    console.log('🔐 Dean Token verification - Decoded:', decoded);

    // ✅ CRITICAL: Only accept dean role
    if (decoded.role !== 'dean') {
      return res.json({ 
        valid: false, 
        message: 'Invalid role. Dean access required.',
        role: decoded.role 
      });
    }

    // Check if dean exists
    const dean = await Dean.findById(decoded.userId);
    if (!dean) {
      return res.json({ 
        valid: false, 
        message: 'Dean account not found',
        role: null 
      });
    }

    res.json({ 
      valid: true, 
      user: {
        id: dean._id,
        name: dean.Name,
        email: dean.emailId,
        role: 'dean'
      },
      message: 'Dean token valid'
    });
  } catch (error) {
    console.error('❌ Dean token verification error:', error);
    res.json({ 
      valid: false, 
      message: 'Invalid dean token',
      role: null 
    });
  }
});

// ==================== TEACHER COMPLAINTS ROUTES ====================

// Get complaints for teacher (coordinator) - shows ALL complaints (both public and private)
app.get('/api/complaints/teacher-complaints', auth, async (req, res) => {
  try {
    console.log('📋 Fetching teacher complaints for role:', req.user.role);
    
    if (req.user.role !== 'coordinator') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Coordinator role required.'
      });
    }

    const complaints = await Complaint.find({ 
      currentHandler: 'coordinator' 
    }).sort({ filedDate: -1 });

    // Update time left for each complaint
    const updatedComplaints = complaints.map(complaint => {
      const timeLeft = complaint.calculateTimeLeft();
      return {
        ...complaint.toObject(),
        timeLeft
      };
    });

    console.log(`✅ Found ${updatedComplaints.length} complaints for coordinator`);

    res.json({
      success: true,
      complaints: updatedComplaints
    });

  } catch (error) {
    console.error('❌ Get teacher complaints error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching complaints'
    });
  }
});

// Get teacher complaints by category
app.get('/api/complaints/teacher-complaints/:category', auth, async (req, res) => {
  try {
    const { category } = req.params;
    
    if (req.user.role !== 'coordinator') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Coordinator role required.'
      });
    }

    let query = { currentHandler: 'coordinator' };
    
    // Filter by category
    if (category !== 'all') {
      query.problemType = category;
    }

    const complaints = await Complaint.find(query).sort({ filedDate: -1 });

    // Update time left for each complaint
    const updatedComplaints = complaints.map(complaint => {
      const timeLeft = complaint.calculateTimeLeft();
      return {
        ...complaint.toObject(),
        timeLeft
      };
    });

    console.log(`✅ Found ${updatedComplaints.length} complaints for category: ${category}`);

    res.json({
      success: true,
      complaints: updatedComplaints
    });

  } catch (error) {
    console.error('❌ Get teacher complaints by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching complaints by category'
    });
  }
});

// ==================== HOD COMPLAINTS ROUTES ====================

// Get HOD stats
app.get('/api/complaints/hod-stats', auth, async (req, res) => {
    try {
        if (req.user.role !== 'hod') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. HOD role required.'
            });
        }

        const query = { currentHandler: 'hod' };

        const total = await Complaint.countDocuments(query);
        const pending = await Complaint.countDocuments({ 
            ...query,
            status: 'pending' 
        });
        const inProgress = await Complaint.countDocuments({ 
            ...query,
            status: 'in-progress' 
        });
        const resolved = await Complaint.countDocuments({ 
            ...query,
            status: 'resolved' 
        });

        res.json({
            success: true,
            stats: {
                total,
                pending,
                inProgress,
                resolved
            }
        });

    } catch (error) {
        console.error('Get HOD stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching stats'
        });
    }
});

// Get complaints for HOD - shows complaints shared by coordinator
app.get('/api/complaints/hod-complaints', auth, async (req, res) => {
    try {
        console.log('📋 Fetching HOD complaints');
        
        if (req.user.role !== 'hod') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. HOD role required.'
            });
        }

        const complaints = await Complaint.find({ 
            currentHandler: 'hod'
        })
        .sort({ filedDate: -1 });

        // Update time left for each complaint
        const updatedComplaints = complaints.map(complaint => {
            const timeLeft = complaint.calculateTimeLeft();
            return {
                ...complaint.toObject(),
                timeLeft
            };
        });

        console.log(`✅ Found ${updatedComplaints.length} complaints for HOD`);

        res.json({
            success: true,
            complaints: updatedComplaints
        });

    } catch (error) {
        console.error('❌ Get HOD complaints error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching HOD complaints'
        });
    }
});

// Get HOD complaints by category
app.get('/api/complaints/hod-complaints/:category', auth, async (req, res) => {
    try {
        const { category } = req.params;
        
        if (req.user.role !== 'hod') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. HOD role required.'
            });
        }

        let query = { currentHandler: 'hod' };
        
        // Filter by category
        if (category !== 'all') {
            query.problemType = category;
        }

        const complaints = await Complaint.find(query).sort({ filedDate: -1 });

        // Update time left for each complaint
        const updatedComplaints = complaints.map(complaint => {
            const timeLeft = complaint.calculateTimeLeft();
            return {
                ...complaint.toObject(),
                timeLeft
            };
        });

        console.log(`✅ Found ${updatedComplaints.length} HOD complaints for category: ${category}`);

        res.json({
            success: true,
            complaints: updatedComplaints
        });

    } catch (error) {
        console.error('❌ Get HOD complaints by category error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching HOD complaints by category'
        });
    }
});

// ==================== DEAN COMPLAINTS ROUTES ====================

// Get complaints for Dean
app.get('/api/complaints/dean-complaints', auth, async (req, res) => {
    try {
        console.log('📋 Fetching Dean complaints for user:', req.user);
        
        if (req.user.role !== 'dean') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Dean role required.'
            });
        }

        const complaints = await Complaint.find({ 
            currentHandler: 'dean'
        })
        .sort({ filedDate: -1 });

        console.log(`✅ Found ${complaints.length} complaints for Dean`);

        // Update time left for each complaint
        const updatedComplaints = complaints.map(complaint => {
            const timeLeft = complaint.calculateTimeLeft();
            return {
                ...complaint.toObject(),
                timeLeft
            };
        });

        res.json({
            success: true,
            complaints: updatedComplaints
        });

    } catch (error) {
        console.error('❌ Get Dean complaints error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching Dean complaints: ' + error.message
        });
    }
});

// Get Dean complaints by category
app.get('/api/complaints/dean-complaints/:category', auth, async (req, res) => {
    try {
        const { category } = req.params;
        
        if (req.user.role !== 'dean') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Dean role required.'
            });
        }

        let query = { currentHandler: 'dean' };
        
        // Filter by category
        if (category !== 'all') {
            query.problemType = category;
        }

        const complaints = await Complaint.find(query).sort({ filedDate: -1 });

        // Update time left for each complaint
        const updatedComplaints = complaints.map(complaint => {
            const timeLeft = complaint.calculateTimeLeft();
            return {
                ...complaint.toObject(),
                timeLeft
            };
        });

        console.log(`✅ Found ${updatedComplaints.length} Dean complaints for category: ${category}`);

        res.json({
            success: true,
            complaints: updatedComplaints
        });

    } catch (error) {
        console.error('❌ Get Dean complaints by category error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching Dean complaints by category: ' + error.message
        });
    }
});

// Get Dean stats
app.get('/api/complaints/dean-stats', auth, async (req, res) => {
    try {
        console.log('📊 Fetching Dean stats for user:', req.user);
        
        if (req.user.role !== 'dean') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Dean role required.'
            });
        }

        const query = { currentHandler: 'dean' };

        const total = await Complaint.countDocuments(query);
        const pending = await Complaint.countDocuments({ 
            ...query,
            status: 'pending' 
        });
        const inProgress = await Complaint.countDocuments({ 
            ...query,
            status: 'in-progress' 
        });
        const resolved = await Complaint.countDocuments({ 
            ...query,
            status: 'resolved' 
        });

        console.log(`✅ Dean stats - Total: ${total}, Pending: ${pending}, In Progress: ${inProgress}, Resolved: ${resolved}`);

        res.json({
            success: true,
            stats: {
                total,
                pending,
                inProgress,
                resolved
            }
        });

    } catch (error) {
        console.error('❌ Get Dean stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching Dean stats: ' + error.message
        });
    }
});

// Resolve complaint by Dean
app.put('/api/complaints/resolve/:complaintId', auth, async (req, res) => {
    try {
        const { complaintId } = req.params;
        const { resolvedBy } = req.body;

        console.log(`🎯 Dean resolving complaint: ${complaintId} by: ${resolvedBy}`);

        if (req.user.role !== 'dean') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Dean role required.'
            });
        }

        const complaint = await Complaint.findOne({ complaintId });
        
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        // Check if complaint is with Dean
        if (complaint.currentHandler !== 'dean') {
            return res.status(400).json({
                success: false,
                message: 'Complaint is not currently with Dean'
            });
        }

        complaint.status = 'resolved';
        complaint.currentHandler = 'resolved';
        complaint.resolvedBy = resolvedBy;
        complaint.resolvedDate = new Date();
        complaint.lastUpdated = new Date();
        
        await complaint.save();

        console.log(`✅ Complaint ${complaintId} resolved by Dean: ${resolvedBy}`);

        res.json({
            success: true,
            message: 'Complaint resolved successfully',
            complaint
        });

    } catch (error) {
        console.error('❌ Resolve complaint error:', error);
        res.status(500).json({
            success: false,
            message: 'Error resolving complaint: ' + error.message
        });
    }
});

// Update complaint status
app.put('/api/complaints/update-status/:complaintId', auth, async (req, res) => {
    try {
        const { complaintId } = req.params;
        const { status } = req.body;

        if (!['coordinator', 'hod', 'dean', 'admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Teacher role required.'
            });
        }

        const complaint = await Complaint.findOne({ complaintId });
        
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        complaint.status = status;
        complaint.lastUpdated = new Date();
        await complaint.save();

        console.log(`✅ Status updated for complaint ${complaintId}: ${status}`);

        res.json({
            success: true,
            message: 'Status updated successfully',
            complaint
        });

    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating status'
        });
    }
});

// Share complaint with next authority
app.put('/api/complaints/share-next/:complaintId', auth, async (req, res) => {
    try {
        const { complaintId } = req.params;

        if (!['coordinator', 'hod', 'dean', 'admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Teacher role required.'
            });
        }

        const complaint = await Complaint.findOne({ complaintId });
        
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        // Check if current user has permission to share this complaint
        if (complaint.currentHandler !== req.user.role) {
            return res.status(403).json({
                success: false,
                message: `You cannot share complaints that are not currently with ${req.user.role}`
            });
        }

        let nextHandler = '';
        let nextRole = '';
        let message = '';

        if (complaint.currentHandler === 'coordinator') {
            complaint.currentHandler = 'hod';
            complaint.assignedTo = 'HOD';
            complaint.status = 'in-progress';
            // Reset time to 7 days when sharing to next level
            complaint.escalationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            complaint.daysLeft = 7;
            complaint.timeLeft = '7 days left';
            nextHandler = 'HOD';
            nextRole = 'hod';
            message = 'Complaint shared with HOD and status updated to In Progress. Time reset to 7 days.';
        } else if (complaint.currentHandler === 'hod') {
            complaint.currentHandler = 'dean';
            complaint.assignedTo = 'Dean';
            complaint.status = 'in-progress';
            // Reset time to 7 days when sharing to next level
            complaint.escalationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            complaint.daysLeft = 7;
            complaint.timeLeft = '7 days left';
            nextHandler = 'Dean';
            nextRole = 'dean';
            message = 'Complaint shared with Dean and status updated to In Progress. Time reset to 7 days.';
        } else if (complaint.currentHandler === 'dean') {
            return res.status(400).json({
                success: false,
                message: 'Complaint already at highest level (Dean)'
            });
        }

        complaint.lastUpdated = new Date();
        await complaint.save();

        console.log(`✅ Complaint ${complaintId} shared with ${nextHandler} by ${req.user.role}. Time reset to 7 days.`);

        res.json({
            success: true,
            message: message,
            complaint,
            nextHandler: nextRole
        });

    } catch (error) {
        console.error('Share complaint error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sharing complaint'
        });
    }
});

// ==================== COMPLAINTS SYSTEM ROUTES ====================

// File complaint with enhanced features
app.post('/api/complaints/file-complaint', auth, upload.single('file'), async (req, res) => {
    try {
        console.log('📝 Complaint submission by:', req.user.name);
        
        const {
            complaintDescription,
            priority,
            isPublic = true,
            problemType,
            subCategory,
            coordinatorName,
            teacherName,
            directToHOD = false,
            assignToAllTeachers = false
        } = req.body;

        const student = await User.findById(req.user.userId);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        // Function to generate complaint ID with retry logic
        const createComplaintWithUniqueId = async (retryCount = 0) => {
            const maxRetries = 3;
            
            // Generate ID with timestamp + random component
            const timestamp = Date.now().toString();
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const complaintId = `COMP${timestamp.slice(-6)}${random}`;

            try {
                // Determine initial handler based on directToHOD flag
                let initialHandler = 'coordinator';
                let initialAssignedTo = 'Coordinator';
                
                if (directToHOD === 'true' || directToHOD === true) {
                    initialHandler = 'hod';
                    initialAssignedTo = 'HOD';
                }

                const complaint = new Complaint({
                    complaintId,
                    studentId: student._id,
                    studentName: student.Name,
                    rollNumber: student.rollno,
                    course: student.Course_Name,
                    year: student.year,
                    semester: student.semester,
                    department: student.Department,
                    complaintDescription,
                    problemType: problemType || 'other',
                    subCategory: subCategory || 'other',
                    coordinatorName: coordinatorName || '',
                    teacherName: teacherName || '',
                    assignToAllTeachers: assignToAllTeachers === 'true' || assignToAllTeachers === true,
                    priority: priority || 'medium',
                    isPublic: isPublic,
                    fileUrl: req.file ? `/uploads/complaints/${req.file.filename}` : '',
                    fileName: req.file ? req.file.originalname : '',
                    currentHandler: initialHandler,
                    assignedTo: initialAssignedTo,
                    filedDate: new Date(),
                    status: 'pending',
                    directToHOD: directToHOD === 'true' || directToHOD === true
                });

                await complaint.save();
                return complaint;
                
            } catch (error) {
                if (error.code === 11000 && retryCount < maxRetries) {
                    console.log(`🔄 Duplicate ID ${complaintId}, retrying... (${retryCount + 1}/${maxRetries})`);
                    return createComplaintWithUniqueId(retryCount + 1);
                }
                throw error;
            }
        };

        const complaint = await createComplaintWithUniqueId();

        const visibility = isPublic ? 'public' : 'private';
        const assignment = directToHOD ? 'directly to HOD' : 'to coordinator';
        const allTeachers = assignToAllTeachers ? ' and assigned to all teachers' : '';
        
        console.log(`✅ Complaint filed: ${complaint.complaintId}, Type: ${visibility}, Assignment: ${assignment}${allTeachers}`);

        res.status(201).json({
            success: true,
            message: `Complaint filed successfully! It is ${visibility} and has been assigned ${assignment}${allTeachers}.`,
            complaint: {
                complaintId: complaint.complaintId,
                studentName: complaint.studentName,
                complaintDescription: complaint.complaintDescription,
                problemType: complaint.problemType,
                subCategory: complaint.subCategory,
                status: complaint.status,
                filedDate: complaint.filedDate,
                assignedTo: complaint.assignedTo
            }
        });

    } catch (error) {
        console.error('File complaint error:', error);
        
        if (error.code === 11000) {
            return res.status(500).json({
                success: false,
                message: 'Unable to generate unique complaint ID. Please try again.',
                error: 'DUPLICATE_ID'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error filing complaint',
            error: error.message
        });
    }
});

// Get public complaints
app.get('/api/complaints/public-complaints', auth, async (req, res) => {
    try {
        console.log('📋 Fetching public complaints');
        
        const complaints = await Complaint.find({ 
            isPublic: true
        })
        .sort({ filedDate: -1 })
        .limit(50);

        // Update time left for each complaint
        const updatedComplaints = complaints.map(complaint => {
            const timeLeft = complaint.calculateTimeLeft();
            return {
                ...complaint.toObject(),
                timeLeft
            };
        });

        console.log(`✅ Found ${updatedComplaints.length} public complaints`);

        res.json({
            success: true,
            complaints: updatedComplaints
        });

    } catch (error) {
        console.error('❌ Get public complaints error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching public complaints'
        });
    }
});

// Get student's complaints
app.get('/api/complaints/my-complaints', auth, async (req, res) => {
    try {
        const studentId = req.user.userId;
        
        console.log('📋 Fetching complaints for student:', studentId);
        
        const complaints = await Complaint.find({ studentId })
            .sort({ filedDate: -1 });

        // Update time left for each complaint
        const updatedComplaints = complaints.map(complaint => {
            const timeLeft = complaint.calculateTimeLeft();
            return {
                ...complaint.toObject(),
                timeLeft
            };
        });

        console.log(`✅ Found ${updatedComplaints.length} complaints for student`);

        res.json({
            success: true,
            complaints: updatedComplaints
        });

    } catch (error) {
        console.error('❌ Get complaints error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching complaints'
        });
    }
});

// Delete complaint
app.delete('/api/complaints/delete-complaint/:complaintId', auth, async (req, res) => {
    try {
        const { complaintId } = req.params;
        const studentId = req.user.userId;

        console.log('🗑️ Deleting complaint:', complaintId, 'by student:', studentId);

        const complaint = await Complaint.findOne({ complaintId });
        
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        // Check if the complaint belongs to the student
        if (complaint.studentId.toString() !== studentId) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own complaints'
            });
        }

        // Only allow deletion if complaint is still pending
        if (complaint.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'You can only delete complaints that are still pending'
            });
        }

        await Complaint.deleteOne({ complaintId });

        console.log('✅ Complaint deleted successfully:', complaintId);

        res.json({
            success: true,
            message: 'Complaint deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete complaint error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting complaint'
        });
    }
});

// Like complaint
app.post('/api/complaints/like/:complaintId', auth, async (req, res) => {
    try {
        const { complaintId } = req.params;
        const userId = req.user.userId;

        console.log('👍 Like request for complaint:', complaintId, 'by user:', userId);

        const complaint = await Complaint.findOne({ complaintId });
        
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        // Check if complaint is public
        if (!complaint.isPublic) {
            return res.status(403).json({
                success: false,
                message: 'Cannot like private complaints'
            });
        }

        // Check if already liked
        const alreadyLiked = complaint.likedBy.includes(userId);
        
        if (alreadyLiked) {
            // Unlike
            complaint.likes = Math.max(0, complaint.likes - 1);
            complaint.likedBy = complaint.likedBy.filter(id => id.toString() !== userId);
            await complaint.save();

            console.log('👎 Complaint unliked:', complaintId);

            return res.json({
                success: true,
                message: 'Complaint unliked',
                likes: complaint.likes,
                liked: false
            });
        } else {
            // Like
            complaint.likes += 1;
            complaint.likedBy.push(userId);
            await complaint.save();

            console.log('👍 Complaint liked:', complaintId, 'Total likes:', complaint.likes);

            res.json({
                success: true,
                message: 'Complaint liked successfully',
                likes: complaint.likes,
                liked: true
            });
        }

    } catch (error) {
        console.error('❌ Like complaint error:', error);
        res.status(500).json({
            success: false,
            message: 'Error liking complaint'
        });
    }
});

// Get student stats
app.get('/api/complaints/student-stats', auth, async (req, res) => {
    try {
        const studentId = req.user.userId;
        
        console.log('📊 Fetching stats for student:', studentId);
        
        const total = await Complaint.countDocuments({ studentId });
        const pending = await Complaint.countDocuments({ 
            studentId, 
            status: 'pending' 
        });
        const inProgress = await Complaint.countDocuments({ 
            studentId, 
            status: 'in-progress' 
        });
        const resolved = await Complaint.countDocuments({ 
            studentId, 
            status: 'resolved' 
        });

        // Get top 5 unresolved complaints
        const topUnresolved = await Complaint.find({
            studentId,
            status: { $in: ['pending', 'in-progress'] }
        })
        .sort({ filedDate: -1 })
        .limit(5);

        // Update time left for each complaint
        const updatedUnresolved = topUnresolved.map(complaint => {
            const timeLeft = complaint.calculateTimeLeft();
            return {
                ...complaint.toObject(),
                timeLeft
            };
        });

        console.log('✅ Stats fetched - Total:', total, 'Pending:', pending);

        res.json({
            success: true,
            stats: {
                total,
                pending,
                inProgress,
                resolved
            },
            topUnresolved: updatedUnresolved
        });

    } catch (error) {
        console.error('❌ Get student stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching stats'
        });
    }
});

// Get teacher stats
app.get('/api/complaints/teacher-stats', auth, async (req, res) => {
    try {
        if (!['coordinator', 'hod', 'dean', 'admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Teacher role required.'
            });
        }

        let query = {};
        if (req.user.role === 'coordinator') {
            query.currentHandler = 'coordinator';
        } else if (req.user.role === 'hod') {
            query.currentHandler = 'hod';
        } else if (req.user.role === 'dean') {
            query.currentHandler = 'dean';
        }

        const total = await Complaint.countDocuments(query);
        const pending = await Complaint.countDocuments({ 
            ...query,
            status: 'pending' 
        });
        const inProgress = await Complaint.countDocuments({ 
            ...query,
            status: 'in-progress' 
        });
        const resolved = await Complaint.countDocuments({ 
            ...query,
            status: 'resolved' 
        });

        res.json({
            success: true,
            stats: {
                total,
                pending,
                inProgress,
                resolved
            }
        });

    } catch (error) {
        console.error('Get teacher stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching stats'
        });
    }
});

// ==================== ADMIN & DASHBOARD ROUTES ====================

// Get all teachers for dropdown
app.get('/api/teachers/list', auth, async (req, res) => {
    try {
        const teachers = await Teacher.find({ role: 'coordinator' })
            .select('Name emailId Department')
            .sort({ Name: 1 });

        res.json({
            success: true,
            teachers
        });
    } catch (error) {
        console.error('Error fetching teachers list:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching teachers list'
        });
    }
});

// Update password routes
app.put('/api/auth/update-password/student', async (req, res) => {
    try {
        const { emailId, currentPassword, newPassword } = req.body;

        const student = await User.findOne({ emailId: emailId.toLowerCase().trim() });
        
        if (!student) {
            return res.status(400).json({
                success: false,
                message: 'Student not found'
            });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, student.password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        student.password = hashedPassword;
        student.isFirstLogin = false;
        
        await student.save();

        res.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('Student password update error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating password'
        });
    }
});

app.put('/api/auth/update-password/teacher', async (req, res) => {
    try {
        const { emailId, currentPassword, newPassword } = req.body;

        const teacher = await Teacher.findOne({ emailId: emailId.toLowerCase().trim() });
        
        if (!teacher) {
            return res.status(400).json({
                success: false,
                message: 'Teacher not found'
            });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, teacher.password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        teacher.password = hashedPassword;
        teacher.isFirstLogin = false;
        
        await teacher.save();

        res.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('Teacher password update error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating password'
        });
    }
});

app.put('/api/auth/update-password/hod', async (req, res) => {
    try {
        const { emailId, currentPassword, newPassword } = req.body;

        const hod = await HOD.findOne({ emailId: emailId.toLowerCase().trim() });
        
        if (!hod) {
            return res.status(400).json({
                success: false,
                message: 'HOD not found'
            });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, hod.password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        hod.password = hashedPassword;
        hod.isFirstLogin = false;
        
        await hod.save();

        res.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('HOD password update error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating password'
        });
    }
});

app.put('/api/auth/update-password/dean', async (req, res) => {
    try {
        const { emailId, currentPassword, newPassword } = req.body;

        const dean = await Dean.findOne({ emailId: emailId.toLowerCase().trim() });
        
        if (!dean) {
            return res.status(400).json({
                success: false,
                message: 'Dean not found'
            });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, dean.password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        dean.password = hashedPassword;
        dean.isFirstLogin = false;
        
        await dean.save();

        res.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('Dean password update error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating password'
        });
    }
});

// Get all teachers (for admin purposes)
app.get('/api/auth/teachers', async (req, res) => {
    try {
        const teachers = await Teacher.find({}).select('Name emailId role Department isFirstLogin');

        res.json({
            success: true,
            teachers
        });
    } catch (error) {
        console.error('Error fetching teachers:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching teachers'
        });
    }
});

// Get all HODs (for admin purposes)
app.get('/api/auth/hods', async (req, res) => {
    try {
        const hods = await HOD.find({}).select('Name emailId Department isFirstLogin createdAt');

        res.json({
            success: true,
            hods
        });
    } catch (error) {
        console.error('Error fetching HODs:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching HODs'
        });
    }
});

// Get all Deans
app.get('/api/auth/deans', async (req, res) => {
    try {
        const deans = await Dean.find({}).select('Name emailId isFirstLogin createdAt');

        res.json({
            success: true,
            deans
        });
    } catch (error) {
        console.error('Error fetching Deans:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching Deans'
        });
    }
});

// Get all students (for HOD/Dean purposes)
app.get('/api/auth/students', async (req, res) => {
    try {
        const students = await User.find({ role: 'student' })
            .select('Name emailId rollno Department Course_Name semester year phoneNumber createdAt')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            students,
            count: students.length
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching students'
        });
    }
});

// Get dashboard stats for HOD/Dean
app.get('/api/auth/dashboard-stats', async (req, res) => {
    try {
        const totalTeachers = await Teacher.countDocuments({ role: 'coordinator' });
        const totalStudents = await User.countDocuments({ role: 'student' });
        const totalHODs = await HOD.countDocuments();
        const totalDeans = await Dean.countDocuments();
        
        const departments = await User.distinct('Department');
        
        // Get department-wise student count
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
});

// ==================== UTILITY ROUTES ====================

// Health check route
app.get('/api/health', (req, res) => {
    res.json({ 
        message: 'Server is working!',
        timestamp: new Date().toISOString()
    });
});

// Test route
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Server is working!',
        features: {
            studentRegistration: true,
            studentLogin: true,
            teacherLogin: true,
            teacherRegistration: true,
            hodLogin: true,
            hodRegistration: true,
            deanLogin: true,
            deanRegistration: true,
            complaintsSystem: true,
            separateCollections: true
        }
    });
});

// Token verification endpoint
app.get('/api/auth/verify-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.json({ valid: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check if user still exists
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
    res.json({ valid: false, message: 'Invalid token' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n🎉 Backend Server Running!`);
    console.log(`✅ Port: ${PORT}`);
    console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`\n🔐 AUTHENTICATION ENDPOINTS:`);
    console.log(`✅ Student Registration: /api/auth/register/student`);
    console.log(`✅ Teacher Registration: /api/auth/register/teacher`);
    console.log(`✅ HOD Registration: /api/auth/register/hod`);
    console.log(`✅ Dean Registration: /api/auth/register/dean`);
    console.log(`✅ Student Login: /api/auth/login`);
    console.log(`✅ Teacher Login: /api/auth/login/teacher`);
    console.log(`✅ HOD Login: /api/auth/login/hod`);
    console.log(`✅ Dean Login: /api/auth/login/dean`);
    console.log(`\n📋 COMPLAINTS SYSTEM ENDPOINTS:`);
    console.log(`✅ File Complaint: /api/complaints/file-complaint`);
    console.log(`✅ My Complaints: /api/complaints/my-complaints`);
    console.log(`✅ Public Complaints: /api/complaints/public-complaints`);
    console.log(`✅ Teacher Complaints: /api/complaints/teacher-complaints`);
    console.log(`✅ HOD Complaints: /api/complaints/hod-complaints`);
    console.log(`✅ Dean Complaints: /api/complaints/dean-complaints`);
    console.log(`✅ Update Status: /api/complaints/update-status/:complaintId`);
    console.log(`✅ Share Next: /api/complaints/share-next/:complaintId`);
    console.log(`✅ Like Complaint: /api/complaints/like/:complaintId`);
    console.log(`✅ Student Stats: /api/complaints/student-stats`);
    console.log(`✅ Teacher Stats: /api/complaints/teacher-stats`);
    console.log(`\n📊 ADMIN ENDPOINTS:`);
    console.log(`✅ Get Teachers: /api/auth/teachers`);
    console.log(`✅ Get HODs: /api/auth/hods`);
    console.log(`✅ Get Deans: /api/auth/deans`);
    console.log(`✅ Get Students: /api/auth/students`);
    console.log(`✅ Dashboard Stats: /api/auth/dashboard-stats`);
    console.log(`\n✅ Collections: Separate collections for Students, Teachers, HODs, Deans and Complaints`);
});