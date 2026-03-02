const express = require('express');
const router = express.Router();
const Complaint = require('../models/complaint');
const { auth } = require('../middleware/auth');

// File complaint with privacy option
router.post('/file-complaint', auth, async (req, res) => {
    try {
        const {
            complaintDescription,
            priority,
            isPublic = true
        } = req.body;

        // Check if user is student
        if (req.user.role !== 'student') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only students can file complaints.'
            });
        }

        // Get student info from token
        const student = req.user;

        // Generate complaint ID
        const count = await Complaint.countDocuments();
        const complaintId = `COMP${String(count + 1).padStart(4, '0')}`;

        const complaint = new Complaint({
            complaintId,
            studentId: student.userId || student.id,
            studentName: student.name,
            rollNumber: student.rollno,
            course: student.course,
            year: student.year,
            semester: student.semester,
            department: student.department,
            complaintDescription,
            priority: priority || 'medium',
            isPublic: isPublic,
            currentHandler: 'coordinator',
            assignedTo: 'Coordinator'
        });

        await complaint.save();

        const visibility = isPublic ? 'public (visible to all students)' : 'private (only visible to you and coordinators)';
        console.log(`✅ Complaint filed by: ${student.name}, ID: ${complaintId}, Visibility: ${visibility}`);

        res.status(201).json({
            success: true,
            message: `Complaint filed successfully! It is ${visibility} and has been shared with coordinator.`,
            complaint
        });

    } catch (error) {
        console.error('File complaint error:', error);
        res.status(500).json({
            success: false,
            message: 'Error filing complaint'
        });
    }
});

// Get student's own complaints (both public and private)
router.get('/my-complaints', auth, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Student role required.'
            });
        }

        const studentId = req.user.userId || req.user.id;
        
        const complaints = await Complaint.find({ studentId })
            .sort({ filedDate: -1 });

        // Update time left for each complaint
        const updatedComplaints = complaints.map(complaint => {
            const timeLeft = complaint.calculateTimeLeft();
            return {
                ...complaint.toObject(),
                timeLeft
            };
        });

        res.json({
            success: true,
            complaints: updatedComplaints
        });

    } catch (error) {
        console.error('Get my complaints error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching your complaints'
        });
    }
});

// Get all public complaints (visible to all students)
router.get('/public-complaints', auth, async (req, res) => {
    try {
        const complaints = await Complaint.find({ 
            isPublic: true
        })
        .sort({ likes: -1, filedDate: -1 })
        .limit(50);

        // Update time left for each complaint
        const updatedComplaints = complaints.map(complaint => {
            const timeLeft = complaint.calculateTimeLeft();
            return {
                ...complaint.toObject(),
                timeLeft
            };
        });

        res.json({
            success: true,
            complaints: updatedComplaints
        });

    } catch (error) {
        console.error('Get public complaints error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching public complaints'
        });
    }
});

// Get complaints for teacher (coordinator) - shows ALL complaints (both public and private)
router.get('/teacher-complaints', auth, async (req, res) => {
    try {
        console.log('📋 Fetching teacher complaints for role:', req.user.role);
        
        if (!['coordinator', 'hod', 'dean', 'admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Teacher role required.'
            });
        }

        let query = {};
        if (req.user.role === 'coordinator') {
            query.currentHandler = 'coordinator';
        } else if (req.user.role === 'hod') {
            query.currentHandler = 'hod';
        } else if (req.user.role === 'dean') {
            query.currentHandler = 'dean';
        } else if (req.user.role === 'admin') {
            // Admin can see all complaints
            query = {};
        }

        const complaints = await Complaint.find(query)
            .sort({ filedDate: -1 });

        // Update time left for each complaint
        const updatedComplaints = complaints.map(complaint => {
            const timeLeft = complaint.calculateTimeLeft();
            return {
                ...complaint.toObject(),
                timeLeft
            };
        });

        console.log(`✅ Found ${updatedComplaints.length} complaints for ${req.user.role}`);

        res.json({
            success: true,
            complaints: updatedComplaints
        });

    } catch (error) {
        console.error('❌ Get teacher complaints error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching complaints'
        });
    }
});

// Get complaints for HOD - shows complaints shared by coordinator
router.get('/hod-complaints', auth, async (req, res) => {
    try {
        console.log('📋 Fetching HOD complaints');
        
        if (req.user.role !== 'hod') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. HOD role required.'
            });
        }

        const complaints = await Complaint.find({ 
            currentHandler: 'hod'
        })
        .sort({ filedDate: -1 });

        // Update time left for each complaint
        const updatedComplaints = complaints.map(complaint => {
            const timeLeft = complaint.calculateTimeLeft();
            return {
                ...complaint.toObject(),
                timeLeft
            };
        });

        console.log(`✅ Found ${updatedComplaints.length} complaints for HOD`);

        res.json({
            success: true,
            complaints: updatedComplaints
        });

    } catch (error) {
        console.error('❌ Get HOD complaints error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching HOD complaints'
        });
    }
});

// Get complaints for Dean - shows complaints shared by HOD
router.get('/dean-complaints', auth, async (req, res) => {
    try {
        console.log('📋 Fetching Dean complaints');
        
        if (req.user.role !== 'dean') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Dean role required.'
            });
        }

        const complaints = await Complaint.find({ 
            currentHandler: 'dean'
        })
        .sort({ filedDate: -1 });

        // Update time left for each complaint
        const updatedComplaints = complaints.map(complaint => {
            const timeLeft = complaint.calculateTimeLeft();
            return {
                ...complaint.toObject(),
                timeLeft
            };
        });

        console.log(`✅ Found ${updatedComplaints.length} complaints for Dean`);

        res.json({
            success: true,
            complaints: updatedComplaints
        });

    } catch (error) {
        console.error('❌ Get Dean complaints error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching Dean complaints'
        });
    }
});

// Update complaint status
router.put('/update-status/:complaintId', auth, async (req, res) => {
    try {
        const { complaintId } = req.params;
        const { status } = req.body;

        if (!['coordinator', 'hod', 'dean', 'admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Teacher role required.'
            });
        }

        const complaint = await Complaint.findOne({ complaintId });
        
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        complaint.status = status;
        complaint.lastUpdated = new Date();
        await complaint.save();

        console.log(`✅ Status updated for complaint ${complaintId}: ${status}`);

        res.json({
            success: true,
            message: 'Status updated successfully',
            complaint
        });

    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating status'
        });
    }
});

// Share complaint with next authority - UPDATED VERSION
router.put('/share-next/:complaintId', auth, async (req, res) => {
    try {
        const { complaintId } = req.params;

        if (!['coordinator', 'hod', 'dean', 'admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Teacher role required.'
            });
        }

        const complaint = await Complaint.findOne({ complaintId });
        
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        // Check if current user has permission to share this complaint
        if (complaint.currentHandler !== req.user.role) {
            return res.status(403).json({
                success: false,
                message: `You cannot share complaints that are not currently with ${req.user.role}`
            });
        }

        let nextHandler = '';
        let nextRole = '';
        let message = '';

        if (complaint.currentHandler === 'coordinator') {
            complaint.currentHandler = 'hod';
            complaint.assignedTo = 'HOD';
            complaint.status = 'in-progress';
            nextHandler = 'HOD';
            nextRole = 'hod';
            message = 'Complaint shared with HOD and status updated to In Progress';
        } else if (complaint.currentHandler === 'hod') {
            complaint.currentHandler = 'dean';
            complaint.assignedTo = 'Dean';
            complaint.status = 'in-progress';
            nextHandler = 'Dean';
            nextRole = 'dean';
            message = 'Complaint shared with Dean and status updated to In Progress';
        } else if (complaint.currentHandler === 'dean') {
            return res.status(400).json({
                success: false,
                message: 'Complaint already at highest level (Dean)'
            });
        }

        complaint.lastUpdated = new Date();
        await complaint.save();

        console.log(`✅ Complaint ${complaintId} shared with ${nextHandler} by ${req.user.role}`);

        res.json({
            success: true,
            message: message,
            complaint,
            nextHandler: nextRole
        });

    } catch (error) {
        console.error('Share complaint error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sharing complaint'
        });
    }
});

// Like complaint (only for public complaints)
router.post('/like/:complaintId', auth, async (req, res) => {
    try {
        const { complaintId } = req.params;
        const userId = req.user.userId || req.user.id;

        const complaint = await Complaint.findOne({ complaintId });
        
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        // Check if complaint is public
        if (!complaint.isPublic) {
            return res.status(403).json({
                success: false,
                message: 'Cannot like private complaints'
            });
        }

        // Check if already liked
        const alreadyLiked = complaint.likedBy.includes(userId);
        
        if (alreadyLiked) {
            // Unlike
            complaint.likes = Math.max(0, complaint.likes - 1);
            complaint.likedBy = complaint.likedBy.filter(id => id.toString() !== userId);
            await complaint.save();

            return res.json({
                success: true,
                message: 'Complaint unliked',
                likes: complaint.likes,
                liked: false
            });
        } else {
            // Like
            complaint.likes += 1;
            complaint.likedBy.push(userId);
            await complaint.save();

            res.json({
                success: true,
                message: 'Complaint liked successfully',
                likes: complaint.likes,
                liked: true
            });
        }

    } catch (error) {
        console.error('Like complaint error:', error);
        res.status(500).json({
            success: false,
            message: 'Error liking complaint'
        });
    }
});

// Delete complaint (only for students and their own complaints)
router.delete('/delete-complaint/:complaintId', auth, async (req, res) => {
    try {
        const { complaintId } = req.params;
        const studentId = req.user.userId || req.user.id;

        if (req.user.role !== 'student') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only students can delete their own complaints.'
            });
        }

        const complaint = await Complaint.findOne({ complaintId });
        
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        // Check if the complaint belongs to the student
        if (complaint.studentId.toString() !== studentId) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own complaints'
            });
        }

        // Only allow deletion if complaint is still pending
        if (complaint.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'You can only delete complaints that are still pending'
            });
        }

        await Complaint.deleteOne({ complaintId });

        res.json({
            success: true,
            message: 'Complaint deleted successfully'
        });

    } catch (error) {
        console.error('Delete complaint error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting complaint'
        });
    }
});

// Get dashboard stats for student
router.get('/student-stats', auth, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Student role required.'
            });
        }

        const studentId = req.user.userId || req.user.id;
        
        const total = await Complaint.countDocuments({ studentId });
        const pending = await Complaint.countDocuments({ 
            studentId, 
            status: 'pending' 
        });
        const inProgress = await Complaint.countDocuments({ 
            studentId, 
            status: 'in-progress' 
        });
        const resolved = await Complaint.countDocuments({ 
            studentId, 
            status: 'resolved' 
        });

        // Get top 5 unresolved complaints
        const topUnresolved = await Complaint.find({
            studentId,
            status: { $in: ['pending', 'in-progress'] }
        })
        .sort({ filedDate: -1 })
        .limit(5);

        // Update time left for each complaint
        const updatedUnresolved = topUnresolved.map(complaint => {
            const timeLeft = complaint.calculateTimeLeft();
            return {
                ...complaint.toObject(),
                timeLeft
            };
        });

        res.json({
            success: true,
            stats: {
                total,
                pending,
                inProgress,
                resolved
            },
            topUnresolved: updatedUnresolved
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching stats'
        });
    }
});

// Get teacher stats - UPDATED VERSION
router.get('/teacher-stats', auth, async (req, res) => {
    try {
        if (!['coordinator', 'hod', 'dean', 'admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Teacher role required.'
            });
        }

        let query = {};
        if (req.user.role === 'coordinator') {
            query.currentHandler = 'coordinator';
        } else if (req.user.role === 'hod') {
            query.currentHandler = 'hod';
        } else if (req.user.role === 'dean') {
            query.currentHandler = 'dean';
        }

        const total = await Complaint.countDocuments(query);
        const pending = await Complaint.countDocuments({ 
            ...query,
            status: 'pending' 
        });
        const inProgress = await Complaint.countDocuments({ 
            ...query,
            status: 'in-progress' 
        });
        const resolved = await Complaint.countDocuments({ 
            ...query,
            status: 'resolved' 
        });

        res.json({
            success: true,
            stats: {
                total,
                pending,
                inProgress,
                resolved
            }
        });

    } catch (error) {
        console.error('Get teacher stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching teacher stats'
        });
    }
});

// Get HOD stats
router.get('/hod-stats', auth, async (req, res) => {
    try {
        if (req.user.role !== 'hod') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. HOD role required.'
            });
        }

        const query = { currentHandler: 'hod' };

        const total = await Complaint.countDocuments(query);
        const pending = await Complaint.countDocuments({ 
            ...query,
            status: 'pending' 
        });
        const inProgress = await Complaint.countDocuments({ 
            ...query,
            status: 'in-progress' 
        });
        const resolved = await Complaint.countDocuments({ 
            ...query,
            status: 'resolved' 
        });

        res.json({
            success: true,
            stats: {
                total,
                pending,
                inProgress,
                resolved
            }
        });

    } catch (error) {
        console.error('Get HOD stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching HOD stats'
        });
    }
});

// Get Dean stats
router.get('/dean-stats', auth, async (req, res) => {
    try {
        if (req.user.role !== 'dean') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Dean role required.'
            });
        }

        const query = { currentHandler: 'dean' };

        const total = await Complaint.countDocuments(query);
        const pending = await Complaint.countDocuments({ 
            ...query,
            status: 'pending' 
        });
        const inProgress = await Complaint.countDocuments({ 
            ...query,
            status: 'in-progress' 
        });
        const resolved = await Complaint.countDocuments({ 
            ...query,
            status: 'resolved' 
        });

        res.json({
            success: true,
            stats: {
                total,
                pending,
                inProgress,
                resolved
            }
        });

    } catch (error) {
        console.error('Get Dean stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching Dean stats'
        });
    }
});

module.exports = router;