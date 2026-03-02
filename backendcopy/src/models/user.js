const mongoose = require('mongoose');
const { Schema } = mongoose;

// User Schema - FOR STUDENTS ONLY
const userSchema = new Schema({  
    Name: { 
        type: String, 
        required: true, 
        minLength: 3, 
        maxLength: 50 
    },
    Course_Name: { 
        type: String, 
        required: true
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
        enum: ['student'], // Only student role now
        default: 'student' 
    },
    Department: { 
        type: String,
        required: true
    },
    rollno: { 
        type: String, 
        required: true,
        unique: true
    },
    phoneNumber: {
        type: String,
        default: ''
    },
    semester: {
        type: String
    },
    year: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });





// Models
const User = mongoose.model('User', userSchema);


module.exports = {
    User,
};