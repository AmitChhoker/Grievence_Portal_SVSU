const mongoose = require('mongoose');
const { Schema } = mongoose;

// HOD Schema - Separate from Teacher schema
const hodSchema = new Schema({  
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
        default: 'hod'
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

const HOD = mongoose.model('HOD', hodSchema);

module.exports = HOD;