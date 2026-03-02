const validator = require('validator');

const validateStudentSignup = (data) => {
    const mandatoryFields = ['name', 'courseName', 'emailId', 'password', 'rollno'];
    const missingFields = mandatoryFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
        throw new Error(`Missing mandatory fields: ${missingFields.join(', ')}`);
    }

    // Name validation
    if (data.name.length < 3 || data.name.length > 50) {
        throw new Error('Name must be between 3 and 50 characters');
    }

    // Course Name validation
    if (!data.courseName.trim()) {
        throw new Error('Course name is required');
    }

    // SVSU Email validation
    const svsuEmailRegex = /^[0-9]{2}[a-z]{5}[0-9]{5}@svsu\.ac\.in$/;
    if (!svsuEmailRegex.test(data.emailId)) {
        throw new Error('Please enter a valid SVSU email ID (format: 22abcde12345@svsu.ac.in)');
    }

    // Roll Number validation
    if (data.rollno.length < 10 || data.rollno.length > 12) {
        throw new Error('Roll number must be between 10 and 12 characters');
    }

    // Password validation
    if (data.password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
    }

    // Optional field validation if provided
    if (data.phoneNumber && !validator.isMobilePhone(data.phoneNumber, 'any')) {
        throw new Error('Please enter a valid phone number');
    }
};

const validateTeacherSignup = (data) => {
    const mandatoryFields = ['name', 'emailId', 'password', 'department', 'teacherId'];
    const missingFields = mandatoryFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
        throw new Error(`Missing mandatory fields: ${missingFields.join(', ')}`);
    }

    // Name validation
    if (data.name.length < 3 || data.name.length > 50) {
        throw new Error('Name must be between 3 and 50 characters');
    }

    // Email validation
    if (!validator.isEmail(data.emailId)) {
        throw new Error('Please enter a valid email address');
    }

    // Teacher ID validation
    if (!data.teacherId.trim()) {
        throw new Error('Teacher ID is required');
    }

    // Department validation
    if (!data.department.trim()) {
        throw new Error('Department is required');
    }

    // Password validation
    if (data.password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
    }

    // Optional field validation if provided
    if (data.phoneNumber && !validator.isMobilePhone(data.phoneNumber, 'any')) {
        throw new Error('Please enter a valid phone number');
    }
};

const validateLogin = (data) => {
    const mandatoryFields = ['password'];
    const missingFields = mandatoryFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
        throw new Error(`Missing mandatory fields: ${missingFields.join(', ')}`);
    }

    // Either email or rollno/teacherId must be provided
    if (!data.emailId && !data.rollno && !data.teacherId) {
        throw new Error('Email, roll number, or teacher ID is required for login');
    }

    // If SVSU email is provided, validate format
    if (data.emailId && data.emailId.includes('@svsu.ac.in')) {
        const svsuEmailRegex = /^[0-9]{2}[a-z]{5}[0-9]{5}@svsu\.ac\.in$/;
        if (!svsuEmailRegex.test(data.emailId)) {
            throw new Error('Please enter a valid SVSU email ID');
        }
    }

    // Password validation
    if (data.password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
    }
};

const validateComplaint = (data) => {
    const mandatoryFields = ['title', 'description', 'category', 'department'];
    const missingFields = mandatoryFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
        throw new Error(`Missing mandatory fields: ${missingFields.join(', ')}`);
    }

    // Title validation
    if (data.title.length < 5 || data.title.length > 200) {
        throw new Error('Title must be between 5 and 200 characters');
    }

    // Description validation
    if (data.description.length < 10) {
        throw new Error('Description must be at least 10 characters long');
    }

    // Category validation
    const allowedCategories = ['academic', 'administrative', 'infrastructure', 'hostel', 'library', 'other'];
    if (!allowedCategories.includes(data.category)) {
        throw new Error('Invalid complaint category');
    }

    // Department validation
    if (!data.department.trim()) {
        throw new Error('Department is required');
    }
};

module.exports = {
    validateStudentSignup,
    validateTeacherSignup,
    validateLogin,
    validateComplaint
};