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

// ==================== ENV VALIDATION ====================
if (!process.env.DB_CONNECT_STRING) {
  console.error('❌ FATAL: DB_CONNECT_STRING missing in environment variables. Exiting.');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET missing in environment variables. Exiting.');
  process.exit(1);
}

// JWT secret helper — no insecure fallback
const getJWTSecret = () => process.env.JWT_SECRET;

// ==================== MIDDLEWARE ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS — env-based
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:1234'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn('🚫 Blocked by CORS:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// ==================== DATABASE ====================
mongoose.connect(process.env.DB_CONNECT_STRING)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  });

// ==================== UPLOAD DIRECTORY ====================
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const COMPLAINT_UPLOAD_DIR = path.join(UPLOAD_DIR, 'complaints');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(COMPLAINT_UPLOAD_DIR)) {
  fs.mkdirSync(COMPLAINT_UPLOAD_DIR, { recursive: true });
}

// ==================== MULTER CONFIG ====================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, COMPLAINT_UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 400 * 1024 },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only images and documents are allowed'));
  }
});

app.use('/uploads', express.static(UPLOAD_DIR));

// ==================== AUTHENTICATION ROUTES ====================

// Student Registration
app.post('/api/auth/register/student', async (req, res) => {
  try {
    console.log('📝 Student registration request:', req.body);
    const { name, emailId, password, rollno, courseName, department, phoneNumber, semester, year } = req.body;

    const existingUser = await User.findOne({ $or: [{ emailId }, { rollno }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this email or roll number' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      Name: name,
      emailId: emailId.toLowerCase().trim(),
      password: hashedPassword,
      rollno, Course_Name: courseName, Department: department,
      phoneNumber: phoneNumber || '', semester: semester || '', year: year || '',
      role: 'student'
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.emailId, role: user.role },
      getJWTSecret(), { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      token,
      user: {
        id: user._id, name: user.Name, email: user.emailId, rollno: user.rollno,
        courseName: user.Course_Name, department: user.Department,
        semester: user.semester, year: user.year, role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Student registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Teacher Registration
app.post('/api/auth/register/teacher', async (req, res) => {
  try {
    const { name, emailId, password, department, role } = req.body;
    if (!name || !emailId || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const existingTeacher = await Teacher.findOne({ emailId: emailId.toLowerCase().trim() });
    if (existingTeacher) {
      return res.status(400).json({ success: false, message: 'Teacher already exists with this email' });
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
        id: teacher._id, name: teacher.Name, email: teacher.emailId,
        role: teacher.role, department: teacher.Department
      }
    });
  } catch (error) {
    console.error('❌ Teacher registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// HOD Registration
app.post('/api/auth/register/hod', async (req, res) => {
  try {
    const { name, emailId, password, department } = req.body;
    if (!name || !emailId || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const existingHOD = await HOD.findOne({ emailId: emailId.toLowerCase().trim() });
    if (existingHOD) {
      return res.status(400).json({ success: false, message: 'HOD already exists with this email' });
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
        id: hod._id, name: hod.Name, email: hod.emailId,
        role: hod.role, department: hod.Department
      }
    });
  } catch (error) {
    console.error('❌ HOD registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Dean Registration
app.post('/api/auth/register/dean', async (req, res) => {
  try {
    const { name, emailId, password } = req.body;
    if (!name || !emailId || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const existingDean = await Dean.findOne({ emailId: emailId.toLowerCase().trim() });
    if (existingDean) {
      return res.status(400).json({ success: false, message: 'Dean already exists with this email' });
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
      dean: { id: dean._id, name: dean.Name, email: dean.emailId, role: dean.role }
    });
  } catch (error) {
    console.error('❌ Dean registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Student Login
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 Student login request:', req.body);
    const { emailId, password } = req.body;

    if (!emailId || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const cleanEmail = emailId.toLowerCase().trim();
    const user = await User.findOne({ emailId: cleanEmail });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Student not found. Please check your email or register as student.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: 'Invalid password. Please try again.' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.emailId, role: user.role },
      getJWTSecret(), { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Student login successful!',
      token,
      user: {
        id: user._id, name: user.Name, email: user.emailId, role: user.role,
        department: user.Department, courseName: user.Course_Name,
        rollno: user.rollno, semester: user.semester, year: user.year,
        isFirstLogin: user.isFirstLogin
      }
    });
  } catch (error) {
    console.error('❌ Student login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login: ' + error.message });
  }
});

// Teacher Login
app.post('/api/auth/login/teacher', async (req, res) => {
  try {
    const { emailId, password } = req.body;
    if (!emailId || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const teacher = await Teacher.findOne({ emailId: emailId.toLowerCase().trim() });
    if (!teacher) {
      return res.status(400).json({ success: false, message: 'Teacher account not found.' });
    }
    if (teacher.role !== 'coordinator') {
      return res.status(400).json({ success: false, message: 'This account is not authorized for teacher access.' });
    }

    const isPasswordValid = await bcrypt.compare(password, teacher.password);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: 'Invalid password. Please try again.' });
    }

    const token = jwt.sign(
      { userId: teacher._id, email: teacher.emailId, role: teacher.role },
      getJWTSecret(), { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Teacher login successful!',
      token,
      teacher: {
        id: teacher._id, name: teacher.Name, email: teacher.emailId,
        role: teacher.role, department: teacher.Department,
        isFirstLogin: teacher.isFirstLogin
      }
    });
  } catch (error) {
    console.error('❌ Teacher login error:', error);
    res.status(500).json({ success: false, message: 'Server error during teacher login: ' + error.message });
  }
});

// HOD Login
app.post('/api/auth/login/hod', async (req, res) => {
  try {
    const { emailId, password } = req.body;
    if (!emailId || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const hod = await HOD.findOne({ emailId: emailId.toLowerCase().trim() });
    if (!hod) {
      return res.status(400).json({ success: false, message: 'HOD account not found.' });
    }

    const isPasswordValid = await bcrypt.compare(password, hod.password);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: 'Invalid password. Please try again.' });
    }

    const token = jwt.sign(
      { userId: hod._id, email: hod.emailId, role: hod.role },
      getJWTSecret(), { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'HOD login successful!',
      token,
      hod: {
        id: hod._id, name: hod.Name, email: hod.emailId,
        role: hod.role, department: hod.Department,
        isFirstLogin: hod.isFirstLogin
      }
    });
  } catch (error) {
    console.error('❌ HOD login error:', error);
    res.status(500).json({ success: false, message: 'Server error during HOD login: ' + error.message });
  }
});

// Dean Login
app.post('/api/auth/login/dean', async (req, res) => {
  try {
    const { emailId, password } = req.body;
    if (!emailId || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const dean = await Dean.findOne({ emailId: emailId.toLowerCase().trim() });
    if (!dean) {
      return res.status(400).json({ success: false, message: 'Dean account not found.' });
    }

    const isPasswordValid = await bcrypt.compare(password, dean.password);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: 'Invalid password. Please try again.' });
    }

    const token = jwt.sign(
      { userId: dean._id.toString(), email: dean.emailId, role: 'dean', name: dean.Name },
      getJWTSecret(), { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Dean login successful!',
      token,
      dean: {
        id: dean._id, name: dean.Name, email: dean.emailId,
        role: 'dean', isFirstLogin: dean.isFirstLogin
      }
    });
  } catch (error) {
    console.error('❌ Dean login error:', error);
    res.status(500).json({ success: false, message: 'Server error during Dean login: ' + error.message });
  }
});

// Verify dean token
app.get('/api/auth/verify-dean-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.json({ valid: false, message: 'No token provided', role: null });

    const decoded = jwt.verify(token, getJWTSecret());
    if (decoded.role !== 'dean') {
      return res.json({ valid: false, message: 'Invalid role. Dean access required.', role: decoded.role });
    }

    const dean = await Dean.findById(decoded.userId);
    if (!dean) return res.json({ valid: false, message: 'Dean account not found', role: null });

    res.json({
      valid: true,
      user: { id: dean._id, name: dean.Name, email: dean.emailId, role: 'dean' },
      message: 'Dean token valid'
    });
  } catch (error) {
    res.json({ valid: false, message: 'Invalid dean token', role: null });
  }
});

// ==================== TEACHER COMPLAINTS ====================

app.get('/api/complaints/teacher-complaints', auth, async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') {
      return res.status(403).json({ success: false, message: 'Access denied. Coordinator role required.' });
    }

    const complaints = await Complaint.find({ currentHandler: 'coordinator' }).sort({ filedDate: -1 });
    const updatedComplaints = complaints.map(c => ({
      ...c.toObject(),
      timeLeft: c.calculateTimeLeft()
    }));

    res.json({ success: true, complaints: updatedComplaints });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching complaints' });
  }
});

app.get('/api/complaints/teacher-complaints/:category', auth, async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') {
      return res.status(403).json({ success: false, message: 'Access denied. Coordinator role required.' });
    }

    let query = { currentHandler: 'coordinator' };
    if (req.params.category !== 'all') query.problemType = req.params.category;

    const complaints = await Complaint.find(query).sort({ filedDate: -1 });
    const updatedComplaints = complaints.map(c => ({
      ...c.toObject(),
      timeLeft: c.calculateTimeLeft()
    }));

    res.json({ success: true, complaints: updatedComplaints });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching complaints by category' });
  }
});

// ==================== HOD COMPLAINTS ====================

app.get('/api/complaints/hod-stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'hod') {
      return res.status(403).json({ success: false, message: 'Access denied. HOD role required.' });
    }
    const query = { currentHandler: 'hod' };
    res.json({
      success: true,
      stats: {
        total: await Complaint.countDocuments(query),
        pending: await Complaint.countDocuments({ ...query, status: 'pending' }),
        inProgress: await Complaint.countDocuments({ ...query, status: 'in-progress' }),
        resolved: await Complaint.countDocuments({ ...query, status: 'resolved' })
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching stats' });
  }
});

app.get('/api/complaints/hod-complaints', auth, async (req, res) => {
  try {
    if (req.user.role !== 'hod') {
      return res.status(403).json({ success: false, message: 'Access denied. HOD role required.' });
    }
    const complaints = await Complaint.find({ currentHandler: 'hod' }).sort({ filedDate: -1 });
    const updatedComplaints = complaints.map(c => ({ ...c.toObject(), timeLeft: c.calculateTimeLeft() }));
    res.json({ success: true, complaints: updatedComplaints });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching HOD complaints' });
  }
});

app.get('/api/complaints/hod-complaints/:category', auth, async (req, res) => {
  try {
    if (req.user.role !== 'hod') {
      return res.status(403).json({ success: false, message: 'Access denied. HOD role required.' });
    }
    let query = { currentHandler: 'hod' };
    if (req.params.category !== 'all') query.problemType = req.params.category;
    const complaints = await Complaint.find(query).sort({ filedDate: -1 });
    const updatedComplaints = complaints.map(c => ({ ...c.toObject(), timeLeft: c.calculateTimeLeft() }));
    res.json({ success: true, complaints: updatedComplaints });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching HOD complaints by category' });
  }
});

// ==================== DEAN COMPLAINTS ====================

app.get('/api/complaints/dean-complaints', auth, async (req, res) => {
  try {
    if (req.user.role !== 'dean') {
      return res.status(403).json({ success: false, message: 'Access denied. Dean role required.' });
    }
    const complaints = await Complaint.find({ currentHandler: 'dean' }).sort({ filedDate: -1 });
    const updatedComplaints = complaints.map(c => ({ ...c.toObject(), timeLeft: c.calculateTimeLeft() }));
    res.json({ success: true, complaints: updatedComplaints });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching Dean complaints: ' + error.message });
  }
});

app.get('/api/complaints/dean-complaints/:category', auth, async (req, res) => {
  try {
    if (req.user.role !== 'dean') {
      return res.status(403).json({ success: false, message: 'Access denied. Dean role required.' });
    }
    let query = { currentHandler: 'dean' };
    if (req.params.category !== 'all') query.problemType = req.params.category;
    const complaints = await Complaint.find(query).sort({ filedDate: -1 });
    const updatedComplaints = complaints.map(c => ({ ...c.toObject(), timeLeft: c.calculateTimeLeft() }));
    res.json({ success: true, complaints: updatedComplaints });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error: ' + error.message });
  }
});

app.get('/api/complaints/dean-stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'dean') {
      return res.status(403).json({ success: false, message: 'Access denied. Dean role required.' });
    }
    const query = { currentHandler: 'dean' };
    res.json({
      success: true,
      stats: {
        total: await Complaint.countDocuments(query),
        pending: await Complaint.countDocuments({ ...query, status: 'pending' }),
        inProgress: await Complaint.countDocuments({ ...query, status: 'in-progress' }),
        resolved: await Complaint.countDocuments({ ...query, status: 'resolved' })
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching Dean stats: ' + error.message });
  }
});

app.put('/api/complaints/resolve/:complaintId', auth, async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { resolvedBy } = req.body;

    if (req.user.role !== 'dean') {
      return res.status(403).json({ success: false, message: 'Access denied. Dean role required.' });
    }

    const complaint = await Complaint.findOne({ complaintId });
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    if (complaint.currentHandler !== 'dean') {
      return res.status(400).json({ success: false, message: 'Complaint is not currently with Dean' });
    }

    complaint.status = 'resolved';
    complaint.currentHandler = 'resolved';
    complaint.resolvedBy = resolvedBy;
    complaint.resolvedDate = new Date();
    complaint.lastUpdated = new Date();
    await complaint.save();

    res.json({ success: true, message: 'Complaint resolved successfully', complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error resolving complaint: ' + error.message });
  }
});

app.put('/api/complaints/update-status/:complaintId', auth, async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { status } = req.body;

    if (!['coordinator', 'hod', 'dean', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied. Teacher role required.' });
    }

    const complaint = await Complaint.findOne({ complaintId });
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    complaint.status = status;
    complaint.lastUpdated = new Date();
    await complaint.save();

    res.json({ success: true, message: 'Status updated successfully', complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating status' });
  }
});

app.put('/api/complaints/share-next/:complaintId', auth, async (req, res) => {
  try {
    const { complaintId } = req.params;

    if (!['coordinator', 'hod', 'dean', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied. Teacher role required.' });
    }

    const complaint = await Complaint.findOne({ complaintId });
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    if (complaint.currentHandler !== req.user.role) {
      return res.status(403).json({ success: false, message: `You cannot share complaints that are not currently with ${req.user.role}` });
    }

    let nextHandler = '';
    let nextRole = '';
    let message = '';

    if (complaint.currentHandler === 'coordinator') {
      complaint.currentHandler = 'hod';
      complaint.assignedTo = 'HOD';
      complaint.status = 'in-progress';
      complaint.escalationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      complaint.daysLeft = 7;
      complaint.timeLeft = '7 days left';
      nextHandler = 'HOD';
      nextRole = 'hod';
      message = 'Complaint shared with HOD. Time reset to 7 days.';
    } else if (complaint.currentHandler === 'hod') {
      complaint.currentHandler = 'dean';
      complaint.assignedTo = 'Dean';
      complaint.status = 'in-progress';
      complaint.escalationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      complaint.daysLeft = 7;
      complaint.timeLeft = '7 days left';
      nextHandler = 'Dean';
      nextRole = 'dean';
      message = 'Complaint shared with Dean. Time reset to 7 days.';
    } else if (complaint.currentHandler === 'dean') {
      return res.status(400).json({ success: false, message: 'Complaint already at highest level (Dean)' });
    }

    complaint.lastUpdated = new Date();
    await complaint.save();

    res.json({ success: true, message, complaint, nextHandler: nextRole });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error sharing complaint' });
  }
});

// ==================== COMPLAINT SYSTEM ====================

app.post('/api/complaints/file-complaint', auth, upload.single('file'), async (req, res) => {
  try {
    const {
      complaintDescription, priority, isPublic = true, problemType, subCategory,
      coordinatorName, teacherName, directToHOD = false, assignToAllTeachers = false
    } = req.body;

    const student = await User.findById(req.user.userId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const createComplaintWithUniqueId = async (retryCount = 0) => {
      const maxRetries = 3;
      const timestamp = Date.now().toString();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const complaintId = `COMP${timestamp.slice(-6)}${random}`;

      try {
        let initialHandler = 'coordinator';
        let initialAssignedTo = 'Coordinator';
        if (directToHOD === 'true' || directToHOD === true) {
          initialHandler = 'hod';
          initialAssignedTo = 'HOD';
        }

        const complaint = new Complaint({
          complaintId, studentId: student._id, studentName: student.Name,
          rollNumber: student.rollno, course: student.Course_Name,
          year: student.year, semester: student.semester, department: student.Department,
          complaintDescription, problemType: problemType || 'other',
          subCategory: subCategory || 'other',
          coordinatorName: coordinatorName || '', teacherName: teacherName || '',
          assignToAllTeachers: assignToAllTeachers === 'true' || assignToAllTeachers === true,
          priority: priority || 'medium', isPublic,
          fileUrl: req.file ? `/uploads/complaints/${req.file.filename}` : '',
          fileName: req.file ? req.file.originalname : '',
          currentHandler: initialHandler, assignedTo: initialAssignedTo,
          filedDate: new Date(), status: 'pending',
          directToHOD: directToHOD === 'true' || directToHOD === true
        });

        await complaint.save();
        return complaint;
      } catch (error) {
        if (error.code === 11000 && retryCount < maxRetries) {
          return createComplaintWithUniqueId(retryCount + 1);
        }
        throw error;
      }
    };

    const complaint = await createComplaintWithUniqueId();
    const visibility = isPublic ? 'public' : 'private';
    const assignment = directToHOD ? 'directly to HOD' : 'to coordinator';

    res.status(201).json({
      success: true,
      message: `Complaint filed successfully! It is ${visibility} and assigned ${assignment}.`,
      complaint: {
        complaintId: complaint.complaintId, studentName: complaint.studentName,
        complaintDescription: complaint.complaintDescription,
        problemType: complaint.problemType, subCategory: complaint.subCategory,
        status: complaint.status, filedDate: complaint.filedDate,
        assignedTo: complaint.assignedTo
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(500).json({ success: false, message: 'Unable to generate unique complaint ID.', error: 'DUPLICATE_ID' });
    }
    res.status(500).json({ success: false, message: 'Error filing complaint', error: error.message });
  }
});

app.get('/api/complaints/public-complaints', auth, async (req, res) => {
  try {
    const complaints = await Complaint.find({ isPublic: true }).sort({ filedDate: -1 }).limit(50);
    const updatedComplaints = complaints.map(c => ({ ...c.toObject(), timeLeft: c.calculateTimeLeft() }));
    res.json({ success: true, complaints: updatedComplaints });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching public complaints' });
  }
});

app.get('/api/complaints/my-complaints', auth, async (req, res) => {
  try {
    const complaints = await Complaint.find({ studentId: req.user.userId }).sort({ filedDate: -1 });
    const updatedComplaints = complaints.map(c => ({ ...c.toObject(), timeLeft: c.calculateTimeLeft() }));
    res.json({ success: true, complaints: updatedComplaints });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching complaints' });
  }
});

app.delete('/api/complaints/delete-complaint/:complaintId', auth, async (req, res) => {
  try {
    const { complaintId } = req.params;
    const complaint = await Complaint.findOne({ complaintId });
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    if (complaint.studentId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'You can only delete your own complaints' });
    }
    if (complaint.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'You can only delete complaints that are still pending' });
    }
    await Complaint.deleteOne({ complaintId });
    res.json({ success: true, message: 'Complaint deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting complaint' });
  }
});

app.post('/api/complaints/like/:complaintId', auth, async (req, res) => {
  try {
    const { complaintId } = req.params;
    const userId = req.user.userId;
    const complaint = await Complaint.findOne({ complaintId });
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    if (!complaint.isPublic) return res.status(403).json({ success: false, message: 'Cannot like private complaints' });

    const alreadyLiked = complaint.likedBy.includes(userId);

    if (alreadyLiked) {
      complaint.likes = Math.max(0, complaint.likes - 1);
      complaint.likedBy = complaint.likedBy.filter(id => id.toString() !== userId);
      await complaint.save();
      return res.json({ success: true, message: 'Complaint unliked', likes: complaint.likes, liked: false });
    } else {
      complaint.likes += 1;
      complaint.likedBy.push(userId);
      await complaint.save();
      res.json({ success: true, message: 'Complaint liked successfully', likes: complaint.likes, liked: true });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error liking complaint' });
  }
});

app.get('/api/complaints/student-stats', auth, async (req, res) => {
  try {
    const studentId = req.user.userId;
    const total = await Complaint.countDocuments({ studentId });
    const pending = await Complaint.countDocuments({ studentId, status: 'pending' });
    const inProgress = await Complaint.countDocuments({ studentId, status: 'in-progress' });
    const resolved = await Complaint.countDocuments({ studentId, status: 'resolved' });
    const topUnresolved = await Complaint.find({ studentId, status: { $in: ['pending', 'in-progress'] } })
      .sort({ filedDate: -1 }).limit(5);

    res.json({
      success: true,
      stats: { total, pending, inProgress, resolved },
      topUnresolved: topUnresolved.map(c => ({ ...c.toObject(), timeLeft: c.calculateTimeLeft() }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching stats' });
  }
});

app.get('/api/complaints/teacher-stats', auth, async (req, res) => {
  try {
    if (!['coordinator', 'hod', 'dean', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied. Teacher role required.' });
    }
    let query = {};
    if (req.user.role === 'coordinator') query.currentHandler = 'coordinator';
    else if (req.user.role === 'hod') query.currentHandler = 'hod';
    else if (req.user.role === 'dean') query.currentHandler = 'dean';

    res.json({
      success: true,
      stats: {
        total: await Complaint.countDocuments(query),
        pending: await Complaint.countDocuments({ ...query, status: 'pending' }),
        inProgress: await Complaint.countDocuments({ ...query, status: 'in-progress' }),
        resolved: await Complaint.countDocuments({ ...query, status: 'resolved' })
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching stats' });
  }
});

// ==================== ADMIN & DASHBOARD ====================

app.get('/api/teachers/list', auth, async (req, res) => {
  try {
    const teachers = await Teacher.find({ role: 'coordinator' })
      .select('Name emailId Department').sort({ Name: 1 });
    res.json({ success: true, teachers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching teachers list' });
  }
});

// Update password routes
app.put('/api/auth/update-password/student', async (req, res) => {
  try {
    const { emailId, currentPassword, newPassword } = req.body;
    const student = await User.findOne({ emailId: emailId.toLowerCase().trim() });
    if (!student) return res.status(400).json({ success: false, message: 'Student not found' });

    const isPasswordValid = await bcrypt.compare(currentPassword, student.password);
    if (!isPasswordValid) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    student.password = await bcrypt.hash(newPassword, 12);
    student.isFirstLogin = false;
    await student.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating password' });
  }
});

app.put('/api/auth/update-password/teacher', async (req, res) => {
  try {
    const { emailId, currentPassword, newPassword } = req.body;
    const teacher = await Teacher.findOne({ emailId: emailId.toLowerCase().trim() });
    if (!teacher) return res.status(400).json({ success: false, message: 'Teacher not found' });

    const isPasswordValid = await bcrypt.compare(currentPassword, teacher.password);
    if (!isPasswordValid) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    teacher.password = await bcrypt.hash(newPassword, 12);
    teacher.isFirstLogin = false;
    await teacher.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating password' });
  }
});

app.put('/api/auth/update-password/hod', async (req, res) => {
  try {
    const { emailId, currentPassword, newPassword } = req.body;
    const hod = await HOD.findOne({ emailId: emailId.toLowerCase().trim() });
    if (!hod) return res.status(400).json({ success: false, message: 'HOD not found' });

    const isPasswordValid = await bcrypt.compare(currentPassword, hod.password);
    if (!isPasswordValid) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    hod.password = await bcrypt.hash(newPassword, 12);
    hod.isFirstLogin = false;
    await hod.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating password' });
  }
});

app.put('/api/auth/update-password/dean', async (req, res) => {
  try {
    const { emailId, currentPassword, newPassword } = req.body;
    const dean = await Dean.findOne({ emailId: emailId.toLowerCase().trim() });
    if (!dean) return res.status(400).json({ success: false, message: 'Dean not found' });

    const isPasswordValid = await bcrypt.compare(currentPassword, dean.password);
    if (!isPasswordValid) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    dean.password = await bcrypt.hash(newPassword, 12);
    dean.isFirstLogin = false;
    await dean.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating password' });
  }
});

app.get('/api/auth/teachers', async (req, res) => {
  try {
    const teachers = await Teacher.find({}).select('Name emailId role Department isFirstLogin');
    res.json({ success: true, teachers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching teachers' });
  }
});

app.get('/api/auth/hods', async (req, res) => {
  try {
    const hods = await HOD.find({}).select('Name emailId Department isFirstLogin createdAt');
    res.json({ success: true, hods });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching HODs' });
  }
});

app.get('/api/auth/deans', async (req, res) => {
  try {
    const deans = await Dean.find({}).select('Name emailId isFirstLogin createdAt');
    res.json({ success: true, deans });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching Deans' });
  }
});

app.get('/api/auth/students', async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('Name emailId rollno Department Course_Name semester year phoneNumber createdAt')
      .sort({ createdAt: -1 });
    res.json({ success: true, students, count: students.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching students' });
  }
});

app.get('/api/auth/dashboard-stats', async (req, res) => {
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
        totalTeachers, totalStudents, totalHODs, totalDeans,
        totalDepartments: departments.length, departmentStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching dashboard statistics' });
  }
});

// ==================== UTILITY ====================
// ==================== ROOT ROUTE ====================
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'SVSugriEnvence Backend API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      apiHealth: '/api/health',
      auth: '/api/auth/*',
      complaints: '/api/complaints/*'
    }
  });
});
// Render health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
});

app.get('/api/test', (req, res) => {
  res.json({
    message: 'Server is working!',
    features: {
      studentRegistration: true, studentLogin: true,
      teacherLogin: true, teacherRegistration: true,
      hodLogin: true, hodRegistration: true,
      deanLogin: true, deanRegistration: true,
      complaintsSystem: true, separateCollections: true
    }
  });
});

app.get('/api/auth/verify-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.json({ valid: false, message: 'No token provided' });

    const decoded = jwt.verify(token, getJWTSecret());

    let user;
    if (decoded.role === 'student') user = await User.findById(decoded.userId);
    else if (decoded.role === 'coordinator') user = await Teacher.findById(decoded.userId);
    else if (decoded.role === 'hod') user = await HOD.findById(decoded.userId);
    else if (decoded.role === 'dean') user = await Dean.findById(decoded.userId);

    if (!user) return res.json({ valid: false, message: 'User not found' });

    res.json({
      valid: true,
      user: { id: user._id, name: user.Name, email: user.emailId, role: decoded.role }
    });
  } catch (error) {
    res.json({ valid: false, message: 'Invalid token' });
  }
});

// ==================== SERVER START ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🎉 Backend Server Running!`);
  console.log(`✅ Port: ${PORT}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`✅ Upload directory: ${UPLOAD_DIR}`);
  console.log(`\n✅ Health Check: /health`);
});