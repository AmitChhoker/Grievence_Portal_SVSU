const express = require('express');
const router = express.Router();
const Complaint = require('../models/complaint');
const auth = require('../middleware/auth');
const User = require('../models/user'); // Make sure to import User model

// File complaint with privacy option
router.post('/file-complaint', auth, async (req, res) => {
    try {
        const {
            complaintDescription,
            priority,
            isPublic = true
        } = req.body;

        // Get student info from token
        const student = req.user;

        // Generate complaint ID
        const count = await Complaint.countDocuments();
        const complaintId = `COMP${String(count + 1).padStart(4, '0')}`;

        const complaint = new Complaint({
            complaintId,
            studentId: student.userId,
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

        const visibility = isPublic ? 'public (visible to all students)' : 'private (only visible to you)';
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

// Get student's own complaints
router.get('/my-complaints', auth, async (req, res) => {
    try {
        const studentId = req.user.userId;
        
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
        console.error('Get complaints error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching complaints'
        });
    }
});

// Get all public complaints (visible to all students)
router.get('/public-complaints', auth, async (req, res) => {
    try {
        const complaints = await Complaint.find({ isPublic: true })
            .sort({ filedDate: -1 })
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

// Get complaints for teacher (coordinator) - UPDATED to show ALL complaints
router.get('/teacher-complaints', auth, async (req, res) => {
    try {
        if (req.user.role !== 'coordinator') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Coordinator role required.'
            });
        }

        // Get ALL complaints assigned to coordinator (both public and private)
        const complaints = await Complaint.find({ 
            currentHandler: 'coordinator'
        })
        .sort({ filedDate: -1 });

        // Update time left and check for escalation
        const updatedComplaints = await Promise.all(
            complaints.map(async (complaint) => {
                const timeLeft = complaint.calculateTimeLeft();
                
                // Auto-escalate if overdue
                if (timeLeft === 'Overdue' && complaint.currentHandler === 'coordinator') {
                    complaint.currentHandler = 'hod';
                    complaint.assignedTo = 'HOD';
                    complaint.lastUpdated = new Date();
                    await complaint.save();
                }

                return {
                    ...complaint.toObject(),
                    timeLeft
                };
            })
        );

        res.json({
            success: true,
            complaints: updatedComplaints
        });

    } catch (error) {
        console.error('Get teacher complaints error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching complaints'
        });
    }
});

// Update complaint status
router.put('/update-status/:complaintId', auth, async (req, res) => {
    try {
        const { complaintId } = req.params;
        const { status } = req.body;

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

// Share complaint with next authority
router.put('/share-next/:complaintId', auth, async (req, res) => {
    try {
        const { complaintId } = req.params;

        const complaint = await Complaint.findOne({ complaintId });
        
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        if (complaint.currentHandler === 'coordinator') {
            complaint.currentHandler = 'hod';
            complaint.assignedTo = 'HOD';
        } else if (complaint.currentHandler === 'hod') {
            complaint.currentHandler = 'dean';
            complaint.assignedTo = 'Dean';
        }

        complaint.lastUpdated = new Date();
        await complaint.save();

        res.json({
            success: true,
            message: `Complaint shared with ${complaint.assignedTo}`,
            complaint
        });

    } catch (error) {
        console.error('Share complaint error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sharing complaint'
        });
    }
});

// Like complaint (UPDATED for students)
router.post('/like/:complaintId', auth, async (req, res) => {
    try {
        const { complaintId } = req.params;
        const userId = req.user.userId;

        const complaint = await Complaint.findOne({ complaintId });
        
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        // Check if already liked
        if (complaint.likedBy.includes(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Already liked this complaint'
            });
        }

        complaint.likes += 1;
        complaint.likedBy.push(userId);
        await complaint.save();

        res.json({
            success: true,
            message: 'Complaint liked',
            likes: complaint.likes
        });

    } catch (error) {
        console.error('Like complaint error:', error);
        res.status(500).json({
            success: false,
            message: 'Error liking complaint'
        });
    }
});

// Delete complaint
router.delete('/delete-complaint/:complaintId', auth, async (req, res) => {
    try {
        const { complaintId } = req.params;
        const studentId = req.user.userId;

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
        const studentId = req.user.userId;
        
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

        res.json({
            success: true,
            stats: {
                total,
                pending,
                inProgress,
                resolved
            },
            topUnresolved
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching stats'
        });
    }
});

// Get dashboard stats for teacher
router.get('/teacher-stats', auth, async (req, res) => {
    try {
        const total = await Complaint.countDocuments({ currentHandler: 'coordinator' });
        const pending = await Complaint.countDocuments({ 
            currentHandler: 'coordinator',
            status: 'pending' 
        });
        const inProgress = await Complaint.countDocuments({ 
            currentHandler: 'coordinator',
            status: 'in-progress' 
        });
        const resolved = await Complaint.countDocuments({ 
            currentHandler: 'coordinator',
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
            message: 'Error fetching stats'
        });
    }
});
// Get complaints for HOD
router.get('/hod-complaints', auth, async (req, res) => {
    try {
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

        // Update time left and check for escalation to Dean
        const updatedComplaints = await Promise.all(
            complaints.map(async (complaint) => {
                const timeLeft = complaint.calculateTimeLeft();
                
                // Auto-escalate to Dean if overdue (7 days)
                if (timeLeft === 'Overdue' && complaint.currentHandler === 'hod') {
                    complaint.currentHandler = 'dean';
                    complaint.assignedTo = 'Dean';
                    complaint.lastUpdated = new Date();
                    await complaint.save();
                }

                return {
                    ...complaint.toObject(),
                    timeLeft
                };
            })
        );

        res.json({
            success: true,
            complaints: updatedComplaints
        });

    } catch (error) {
        console.error('Get HOD complaints error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching HOD complaints'
        });
    }
});

// Get complaints for Dean
router.get('/dean-complaints', auth, async (req, res) => {
    try {
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

        // Update time left for Dean complaints
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
        console.error('Get Dean complaints error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching Dean complaints'
        });
    }
});

// Get stats for HOD
router.get('/hod-stats', auth, async (req, res) => {
    try {
        if (req.user.role !== 'hod') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const total = await Complaint.countDocuments({ currentHandler: 'hod' });
        const pending = await Complaint.countDocuments({ 
            currentHandler: 'hod',
            status: 'pending' 
        });
        const inProgress = await Complaint.countDocuments({ 
            currentHandler: 'hod',
            status: 'in-progress' 
        });
        const resolved = await Complaint.countDocuments({ 
            currentHandler: 'hod',
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

// Get stats for Dean
router.get('/dean-stats', auth, async (req, res) => {
    try {
        if (req.user.role !== 'dean') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const total = await Complaint.countDocuments({ currentHandler: 'dean' });
        const pending = await Complaint.countDocuments({ 
            currentHandler: 'dean',
            status: 'pending' 
        });
        const inProgress = await Complaint.countDocuments({ 
            currentHandler: 'dean',
            status: 'in-progress' 
        });
        const resolved = await Complaint.countDocuments({ 
            currentHandler: 'dean',
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