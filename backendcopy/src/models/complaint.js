const mongoose = require('mongoose');

// Define subcategories for each problem type
const problemTypes = {
    infrastructure: ['building', 'furniture', 'electricity', 'water', 'internet', 'other'],
    administration: ['admission', 'fee', 'document', 'certificate', 'other'],
    examination: ['late_result', 'schedule', 'paper', 'hall_ticket', 'other'],
    library: ['book_not_available', 'book_condition', 'digital_resources', 'staff_behavior', 'other'],
    other: ['other']
};

const complaintSchema = new mongoose.Schema({
    complaintId: {
        type: String,
        required: true,
        unique: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    studentName: {
        type: String,
        required: true
    },
    rollNumber: {
        type: String,
        required: true
    },
    course: {
        type: String,
        required: true
    },
    year: {
        type: String,
        required: true
    },
    semester: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    complaintDescription: {
        type: String,
        required: true,
        maxlength: 200000
    },
    problemType: {
        type: String,
        enum: ['infrastructure', 'administration', 'examination', 'library', 'other'],
        required: true,
        default: 'other'
    },
    subCategory: {
        type: String,
        required: true,
        default: 'other'
    },
    coordinatorName: {
        type: String,
        default: ''
    },
    teacherName: {
        type: String,
        default: ''
    },
    assignToAllTeachers: {
        type: Boolean,
        default: false
    },
    directToHOD: {
        type: Boolean,
        default: false
    },
    fileUrl: {
        type: String,
        default: ''
    },
    fileName: {
        type: String,
        default: ''
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'resolved', 'rejected'],
        default: 'pending'
    },
    currentHandler: {
        type: String,
        enum: ['coordinator', 'hod', 'dean'],
        default: 'coordinator'
    },
    assignedTo: {
        type: String,
        default: 'Coordinator'
    },
    likes: {
        type: Number,
        default: 0
    },
    likedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isPublic: {
        type: Boolean,
        default: true
    },
    filedDate: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    escalationDate: {
        type: Date
    },
    timeLeft: {
        type: String,
        default: '7 days left'
    },
    daysLeft: {
        type: Number,
        default: 7
    },
    resolvedBy: {
        type: String,
        default: ''
    },
    resolvedDate: {
        type: Date
    }
}, {
    timestamps: true
});

// Auto-set escalation date (7 days from filing)
complaintSchema.pre('save', function(next) {
    if (this.isNew) {
        const escalationDate = new Date(this.filedDate);
        escalationDate.setDate(escalationDate.getDate() + 7);
        this.escalationDate = escalationDate;
        this.daysLeft = 7;
        this.timeLeft = '7 days left';
        
        // If directToHOD is true, set current handler to HOD
        if (this.directToHOD) {
            this.currentHandler = 'hod';
            this.assignedTo = 'HOD';
        }
    }
    next();
});

// Calculate time left
complaintSchema.methods.calculateTimeLeft = function() {
    const now = new Date();
    const diffTime = this.escalationDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    this.daysLeft = diffDays > 0 ? diffDays : 0;
    
    if (diffDays <= 0) {
        this.timeLeft = 'Overdue';
    } else if (diffDays === 1) {
        this.timeLeft = '1 day left';
    } else {
        this.timeLeft = `${diffDays} days left`;
    }
    
    return this.timeLeft;
};

// Static method to get problem types and subcategories
complaintSchema.statics.getProblemTypes = function() {
    return problemTypes;
};

// Static method to validate subcategory for problem type
complaintSchema.statics.validateSubCategory = function(problemType, subCategory) {
    if (!problemTypes[problemType]) {
        return false;
    }
    return problemTypes[problemType].includes(subCategory);
};

module.exports = mongoose.model('Complaint', complaintSchema);