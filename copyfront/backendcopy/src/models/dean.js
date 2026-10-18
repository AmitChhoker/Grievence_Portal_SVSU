const mongoose = require('mongoose');
const { Schema } = mongoose;

// Dean Schema - Separate collection
const deanSchema = new Schema({  
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
        default: 'dean'
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

const Dean = mongoose.model('Dean', deanSchema);

module.exports = Dean;