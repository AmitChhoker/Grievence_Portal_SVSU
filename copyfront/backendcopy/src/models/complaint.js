const mongoose = require('mongoose');

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
        default: '7 days'
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
    }
    next();
});

// Calculate time left
complaintSchema.methods.calculateTimeLeft = function() {
    const now = new Date();
    const diffTime = this.escalationDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
        return 'Overdue';
    }
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} left`;
};

module.exports = mongoose.model('Complaint', complaintSchema);