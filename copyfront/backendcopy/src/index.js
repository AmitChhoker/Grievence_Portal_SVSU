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
const Dean = require('./models/dean'); // New Dean model
const Complaint = require('./models/complaint'); // Import Complaint model
const { auth } = require('./middleware/auth');

// Middleware
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

// Connect to MongoDB
mongoose.connect(process.env.DB_CONNECT_STRING, {
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

// Dean Registration Route (NEW)
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

// Dean Login Route (NEW)
app.post('/api/auth/login/dean', async (req, res) => {
    try {
        console.log('🎓 Dean login request received:', req.body);
        
        const { emailId, password } = req.body;

        // Basic validation
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
        
        // If Dean not found
        if (!dean) {
            console.log('❌ Dean not found for email:', cleanEmail);
            return res.status(400).json({
                success: false,
                message: 'Dean account not found. Please contact administration.'
            });
        }

        console.log('✅ Dean found:', dean.emailId, 'Role:', dean.role);

        // Check password
        const isPasswordValid = await bcrypt.compare(password, dean.password);
        
        if (!isPasswordValid) {
            console.log('❌ Invalid password for Dean:', dean.emailId);
            return res.status(400).json({
                success: false,
                message: 'Invalid password. Please try again.'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: dean._id, email: dean.emailId, role: dean.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '30d' }
        );

        console.log('✅ Dean login successful for:', dean.emailId);

        // Prepare Dean response
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
        console.error('❌ Dean login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during Dean login: ' + error.message
        });
    }
});

// ==================== COMPLAINTS SYSTEM ROUTES ====================

// File complaint
// File complaint - Auth required
app.post('/api/complaints/file-complaint', auth, upload.single('file'), async (req, res) => {
    try {
        console.log('📝 Complaint submission by:', req.user.name);
        
        const {
            complaintDescription,
            priority
        } = req.body;

        // Student info auth middleware se lelo
        const student = await User.findById(req.user.userId);
        
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        // Generate complaint ID
        const count = await Complaint.countDocuments();
        const complaintId = `COMP${String(count + 1).padStart(4, '0')}`;

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
            priority: priority || 'medium',
            fileUrl: req.file ? `/uploads/complaints/${req.file.filename}` : '',
            fileName: req.file ? req.file.originalname : ''
        });

        await complaint.save();

        console.log('✅ Complaint filed:', complaintId);

        res.status(201).json({
            success: true,
            message: 'Complaint filed successfully',
            complaint
        });

    } catch (error) {
        console.error('File complaint error:', error);
        res.status(500).json({
            success: false,
            message: 'Error filing complaint'
        });
    }
});

// Get student's complaints
app.get('/api/complaints/my-complaints', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const studentId = decoded.userId;
        
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

        res.json({
            success: true,
            complaints: updatedComplaints
        });

    } catch (error) {
        console.error('Get complaints error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching complaints'
        });
    }
});

// Get complaints for teacher
app.get('/api/complaints/teacher-complaints', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Check if user is a coordinator
        const teacher = await Teacher.findById(decoded.userId);
        if (!teacher || teacher.role !== 'coordinator') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Coordinator role required.'
            });
        }

        const complaints = await Complaint.find({ currentHandler: 'coordinator' })
            .sort({ filedDate: -1 });

        // Update time left and check for escalation
        const updatedComplaints = await Promise.all(
            complaints.map(async (complaint) => {
                const timeLeft = complaint.calculateTimeLeft();
                
                // Auto-escalate if overdue
                if (timeLeft === 'Overdue' && complaint.currentHandler === 'coordinator') {
                    complaint.currentHandler = 'hod';
                    complaint.assignedTo = 'HOD';
                    complaint.lastUpdated = new Date();
                    await complaint.save();
                }

                return {
                    ...complaint.toObject(),
                    timeLeft
                };
            })
        );

        res.json({
            success: true,
            complaints: updatedComplaints
        });

    } catch (error) {
        console.error('Get teacher complaints error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching complaints'
        });
    }
});

// Update complaint status
app.put('/api/complaints/update-status/:complaintId', async (req, res) => {
    try {
        const { complaintId } = req.params;
        const { status } = req.body;

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
app.put('/api/complaints/share-next/:complaintId', async (req, res) => {
    try {
        const { complaintId } = req.params;

        const complaint = await Complaint.findOne({ complaintId });
        
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        if (complaint.currentHandler === 'coordinator') {
            complaint.currentHandler = 'hod';
            complaint.assignedTo = 'HOD';
        } else if (complaint.currentHandler === 'hod') {
            complaint.currentHandler = 'dean';
            complaint.assignedTo = 'Dean';
        }

        complaint.lastUpdated = new Date();
        await complaint.save();

        res.json({
            success: true,
            message: `Complaint shared with ${complaint.assignedTo}`,
            complaint
        });

    } catch (error) {
        console.error('Share complaint error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sharing complaint'
        });
    }
});

// Like complaint
app.post('/api/complaints/like/:complaintId', async (req, res) => {
    try {
        const { complaintId } = req.params;
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const teacherId = decoded.userId;

        const complaint = await Complaint.findOne({ complaintId });
        
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        // Check if already liked
        if (complaint.likedBy.includes(teacherId)) {
            return res.status(400).json({
                success: false,
                message: 'Already liked this complaint'
            });
        }

        complaint.likes += 1;
        complaint.likedBy.push(teacherId);
        await complaint.save();

        res.json({
            success: true,
            message: 'Complaint liked',
            likes: complaint.likes
        });

    } catch (error) {
        console.error('Like complaint error:', error);
        res.status(500).json({
            success: false,
            message: 'Error liking complaint'
        });
    }
});

// Get student stats
app.get('/api/complaints/student-stats', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const studentId = decoded.userId;
        
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

        res.json({
            success: true,
            stats: {
                total,
                pending,
                inProgress,
                resolved
            },
            topUnresolved
        });

    } catch (error) {
        console.error('Get student stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching stats'
        });
    }
});

// Get teacher stats
app.get('/api/complaints/teacher-stats', async (req, res) => {
    try {
        const total = await Complaint.countDocuments({ currentHandler: 'coordinator' });
        const pending = await Complaint.countDocuments({ 
            currentHandler: 'coordinator',
            status: 'pending' 
        });
        const inProgress = await Complaint.countDocuments({ 
            currentHandler: 'coordinator',
            status: 'in-progress' 
        });
        const resolved = await Complaint.countDocuments({ 
            currentHandler: 'coordinator',
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

// Update password route for Teachers
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

// Update password route for HOD
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

// Update password route for Dean (NEW)
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

// Get all Deans (for admin purposes) - NEW
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
    console.log(`✅ Teacher Complaints: /api/complaints/teacher-complaints`);
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