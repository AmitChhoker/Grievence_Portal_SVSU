const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models/user');
const Teacher = require('../models/teacher');
const HOD = require('../models/hod');
const Dean = require('../models/dean'); // Import Dean model

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

        const token = jwt.sign(
            { 
                userId: user._id, 
                role: user.role,
                email: user.emailId
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

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
                department: user.Department
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

// Dean Registration (NEW)
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

        const token = jwt.sign(
            { 
                userId: user._id, 
                role: user.role,
                email: user.emailId
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

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

        const token = jwt.sign(
            { 
                userId: teacher._id, 
                role: teacher.role,
                email: teacher.emailId
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

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
            { 
                userId: hod._id, 
                role: hod.role,
                email: hod.emailId
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
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
        console.error('HOD login error in backend:', error);
        res.status(400).json({
            success: false,
            message: error.message,
            error: error.name
        });
    }
};

// Dean Login (NEW)
const deanLogin = async (req, res) => {
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
            { 
                userId: dean._id, 
                role: dean.role,
                email: dean.emailId
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
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
        console.error('Dean login error in backend:', error);
        res.status(400).json({
            success: false,
            message: error.message,
            error: error.name
        });
    }
};

// Get all teachers for HOD/Dean dashboard
const getAllTeachers = async (req, res) => {
    try {
        const teachers = await Teacher.find({ role: 'coordinator' })
            .select('Name emailId Department isFirstLogin createdAt')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            teachers,
            count: teachers.length
        });
    } catch (error) {
        console.error('Error fetching teachers:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching teachers data'
        });
    }
};

// Get all students for HOD/Dean dashboard
const getAllStudents = async (req, res) => {
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
            message: 'Error fetching students data'
        });
    }
};

// Get all HODs for Dean dashboard
const getAllHODs = async (req, res) => {
    try {
        const hods = await HOD.find({})
            .select('Name emailId Department isFirstLogin createdAt')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            hods,
            count: hods.length
        });
    } catch (error) {
        console.error('Error fetching HODs:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching HODs data'
        });
    }
};

// Get dashboard stats for HOD/Dean
const getDashboardStats = async (req, res) => {
    try {
        const totalTeachers = await Teacher.countDocuments({ role: 'coordinator' });
        const totalStudents = await User.countDocuments({ role: 'student' });
        const totalHODs = await HOD.countDocuments();
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

// Update password for Teacher
const updatePasswordTeacher = async (req, res) => {
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
};

// Update password for HOD
const updatePasswordHOD = async (req, res) => {
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
};

// Update password for Dean (NEW)
const updatePasswordDean = async (req, res) => {
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
};

// Logout
const logout = async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
};

// Get profile
const getProfile = async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Profile endpoint'
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile'
        });
    }
};

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
    updatePasswordDean
};