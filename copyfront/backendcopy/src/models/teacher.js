const mongoose = require('mongoose');
const { Schema } = mongoose;

// Teacher Schema - Separate from User schema
const teacherSchema = new Schema({  
    Name: { 
        type: String, 
        required: true, 
        minLength: 3, 
        maxLength: 50 
    },
    emailId: { 
        type: String, 
        required: true, 
        unique: true, 
        trim: true, 
        lowercase: true
    },
    password: { 
        type: String, 
        required: true, 
        minLength: 6
    },
    role: { 
        type: String, 
        enum: ['coordinator', 'dean', 'admin'], 
        default: 'coordinator' 
    },
    Department: { 
        type: String,
        required: true,
        default: 'CSE'
    },
    phoneNumber: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isFirstLogin: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Teacher = mongoose.model('Teacher', teacherSchema);

module.exports = Teacher;