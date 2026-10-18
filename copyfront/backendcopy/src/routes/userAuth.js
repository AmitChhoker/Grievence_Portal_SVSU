const express = require('express');
const router = express.Router();
const { 
    studentRegister, 
    teacherLogin, 
    login, 
    logout, 
    getProfile, 
    registerTeacher,
    registerHOD,
    registerDean,
    hodLogin,
    deanLogin,
    getAllTeachers,
    getAllStudents,
    getAllHODs,
    getDashboardStats,
    updatePasswordTeacher,
    updatePasswordHOD,
    updatePasswordDean
} = require('../controllers/userAuth');

// Student registration
router.post('/api/auth/register/student', studentRegister);

// Teacher registration
router.post('/api/auth/register/teacher', registerTeacher);

// HOD registration
router.post('/api/auth/register/hod', registerHOD);

// Dean registration
router.post('/api/auth/register/dean', registerDean);

// Student login
router.post('/api/auth/login', login);

// Teacher login
router.post('/api/auth/login/teacher', teacherLogin);

// HOD login
router.post('/api/auth/login/hod', hodLogin);

// Dean login
router.post('/api/auth/login/dean', deanLogin);

// Dashboard data routes
router.get('/api/hod/teachers', getAllTeachers);
router.get('/api/hod/students', getAllStudents);
router.get('/api/dean/teachers', getAllTeachers);
router.get('/api/dean/students', getAllStudents);
router.get('/api/dean/hods', getAllHODs);
router.get('/api/hod/dashboard-stats', getDashboardStats);
router.get('/api/dean/dashboard-stats', getDashboardStats);

// Password update routes
router.put('/api/auth/update-password/teacher', updatePasswordTeacher);
router.put('/api/auth/update-password/hod', updatePasswordHOD);
router.put('/api/auth/update-password/dean', updatePasswordDean);

// Logout
router.post('/logout', logout);

// Get profile
router.get('/profile', getProfile);

module.exports = router;