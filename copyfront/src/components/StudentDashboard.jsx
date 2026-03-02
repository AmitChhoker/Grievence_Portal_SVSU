import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './StudentDashboard.css';

// Create axios instance with interceptors for student
const studentApi = axios.create({
  baseURL: 'http://localhost:5000/api',
});

const StudentDashboard = () => {
    const [student, setStudent] = useState(null);
    const [myComplaints, setMyComplaints] = useState([]);
    const [publicComplaints, setPublicComplaints] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [activeComplaintsSubTab, setActiveComplaintsSubTab] = useState('my-complaints');
    const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, resolved: 0 });
    const [topUnresolved, setTopUnresolved] = useState([]);
    const [newComplaint, setNewComplaint] = useState({
        complaintDescription: '',
        priority: 'medium',
        isPublic: true,
        problemType: 'other',
        subCategory: 'other',
        coordinatorName: '',
        teacherName: '',
        directToHOD: false,
        assignToAllTeachers: false
    });
    const [teachers, setTeachers] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [likedComplaints, setLikedComplaints] = useState(new Set());
    const [error, setError] = useState('');
    const [expandedComplaints, setExpandedComplaints] = useState(new Set());
    const navigate = useNavigate();

    // Problem types and subcategories
    const problemTypes = {
        infrastructure: ['building', 'furniture', 'electricity', 'water', 'internet', 'other'],
        administration: ['admission', 'fee', 'document', 'certificate', 'other'],
        examination: ['late_result', 'schedule', 'paper', 'hall_ticket', 'other'],
        library: ['book_not_available', 'book_condition', 'digital_resources', 'staff_behavior', 'other'],
        other: ['other']
    };

    // Add request interceptor to include token
    useEffect(() => {
        const requestInterceptor = studentApi.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Add response interceptor to handle token expiry
        const responseInterceptor = studentApi.interceptors.response.use(
            (response) => response,
            async (error) => {
                if (error.response?.status === 401) {
                    handleAutoLogout('Session expired. Please login again.');
                }
                return Promise.reject(error);
            }
        );

        // Cleanup interceptors
        return () => {
            studentApi.interceptors.request.eject(requestInterceptor);
            studentApi.interceptors.response.eject(responseInterceptor);
        };
    }, []);

    const handleAutoLogout = (message = 'Session expired. Please login again.') => {
        alert(message);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        navigate('/login');
    };

    useEffect(() => {
        checkAuthentication();
    }, [navigate]);

    const checkAuthentication = async () => {
        try {
            console.log('🔍 Checking Student authentication...');
            
            const studentDataString = localStorage.getItem('user');
            const token = localStorage.getItem('token');
            
            console.log('Student Data from storage:', studentDataString);
            console.log('Token from storage:', token);

            if (!studentDataString || studentDataString === 'undefined' || !token) {
                console.log('❌ No Student data found, redirecting to login');
                navigate('/login');
                return;
            }

            const studentData = JSON.parse(studentDataString);
            
            if (studentData.role !== 'student') {
                console.log('❌ User is not Student, redirecting');
                navigate('/login');
                return;
            }
            
            // FIX: Map the correct property names for consistent usage
            const formattedStudentData = {
                ...studentData,
                // Map backend properties to frontend expected properties
                rollNumber: studentData.rollno || studentData.rollNumber || 'N/A',
                course: studentData.courseName || studentData.Course_Name || studentData.course || 'N/A',
                year: studentData.year || 'N/A',
                semester: studentData.semester || 'N/A',
                department: studentData.department || studentData.Department || 'N/A',
                email: studentData.email || studentData.emailId || 'N/A'
            };
            
            console.log('✅ Student authenticated:', formattedStudentData);
            setStudent(formattedStudentData);
            
            // Verify token is still valid by making a test request
            await verifyToken();
            await fetchStudentData();
            await fetchTeachers();

        } catch (error) {
            console.error('❌ Error in Student authentication:', error);
            handleAutoLogout();
        }
    };

    const verifyToken = async () => {
        try {
            await studentApi.get('/auth/verify-token');
        } catch (error) {
            console.error('Token verification failed:', error);
            throw error;
        }
    };

    const fetchStudentData = async () => {
        try {
            setIsLoading(true);
            setError('');
            
            const statsResponse = await studentApi.get('/complaints/student-stats');

            if (statsResponse.data.success) {
                setStats(statsResponse.data.stats);
                setTopUnresolved(statsResponse.data.topUnresolved || []);
            } else {
                setError('Failed to fetch stats');
            }

            setIsLoading(false);
        } catch (error) {
            console.error('Error fetching student data:', error);
            if (error.response?.status === 401) {
                handleAutoLogout('Session expired. Please login again.');
            } else {
                setError('Error loading dashboard data');
            }
            setIsLoading(false);
        }
    };

    const fetchTeachers = async () => {
        try {
            const response = await studentApi.get('/teachers/list');
            if (response.data.success) {
                setTeachers(response.data.teachers || []);
            }
        } catch (error) {
            console.error('Error fetching teachers:', error);
        }
    };

    const fetchComplaintsData = async () => {
        try {
            setError('');
            
            const myComplaintsResponse = await studentApi.get('/complaints/my-complaints');

            if (myComplaintsResponse.data.success) {
                setMyComplaints(myComplaintsResponse.data.complaints || []);
            } else {
                setError('Failed to fetch your complaints');
            }

            const publicComplaintsResponse = await studentApi.get('/complaints/public-complaints');

            if (publicComplaintsResponse.data.success) {
                setPublicComplaints(publicComplaintsResponse.data.complaints || []);
                
                const liked = new Set();
                publicComplaintsResponse.data.complaints?.forEach(complaint => {
                    if (complaint.likedBy?.includes(student?.userId || student?.id)) {
                        liked.add(complaint.complaintId);
                    }
                });
                setLikedComplaints(liked);
            } else {
                setError('Failed to fetch public complaints');
            }
        } catch (error) {
            console.error('Error fetching complaints:', error);
            if (error.response?.status === 401) {
                handleAutoLogout('Session expired. Please login again.');
            } else {
                setError('Error fetching complaints. Please try again.');
            }
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        navigate('/login');
    };

    const handleProblemTypeChange = (e) => {
        const selectedType = e.target.value;
        setNewComplaint({
            ...newComplaint,
            problemType: selectedType,
            subCategory: problemTypes[selectedType]?.[0] || 'other'
        });
        setSubCategories(problemTypes[selectedType] || []);
    };

    const handleSubmitComplaint = async (e) => {
        e.preventDefault();
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            
            if (!user) {
                alert('Please login again.');
                navigate('/login');
                return;
            }

            if (!newComplaint.complaintDescription || !newComplaint.complaintDescription.trim()) {
                alert('Please enter complaint description');
                return;
            }

            if (newComplaint.complaintDescription.trim().length < 10) {
                alert('Complaint description must be at least 10 characters long');
                return;
            }

            const complaintData = {
                complaintDescription: newComplaint.complaintDescription.trim(),
                priority: newComplaint.priority,
                isPublic: newComplaint.isPublic,
                problemType: newComplaint.problemType,
                subCategory: newComplaint.subCategory,
                coordinatorName: newComplaint.coordinatorName,
                teacherName: newComplaint.teacherName,
                directToHOD: newComplaint.directToHOD,
                assignToAllTeachers: newComplaint.assignToAllTeachers
            };

            const response = await studentApi.post('/complaints/file-complaint', complaintData);

            if (response.data.success) {
                let message = `✅ Complaint submitted successfully!`;
                message += `\nType: ${newComplaint.problemType} - ${newComplaint.subCategory}`;
                message += `\nVisibility: ${newComplaint.isPublic ? 'Public' : 'Private'}`;
                message += `\nAssigned: ${newComplaint.directToHOD ? 'Directly to HOD' : 'To coordinator'}`;
                if (newComplaint.assignToAllTeachers) {
                    message += `\nAlso assigned to all teachers`;
                }
                if (newComplaint.coordinatorName) {
                    message += `\nCoordinator: ${newComplaint.coordinatorName}`;
                }
                if (newComplaint.teacherName) {
                    message += `\nTeacher: ${newComplaint.teacherName}`;
                }
                
                alert(message);
                
                // Reset form
                setNewComplaint({ 
                    complaintDescription: '', 
                    priority: 'medium',
                    isPublic: true,
                    problemType: 'other',
                    subCategory: 'other',
                    coordinatorName: '',
                    teacherName: '',
                    directToHOD: false,
                    assignToAllTeachers: false
                });
                setSubCategories([]);
                
                setActiveTab('complaints');
                setActiveComplaintsSubTab('my-complaints');
                await fetchComplaintsData();
                await fetchStudentData();
            }
        } catch (error) {
            console.error('❌ Full error details:', error);
            
            if (error.response?.status === 401) {
                handleAutoLogout('Session expired. Please login again.');
            } else if (error.response?.data?.message) {
                alert('Error: ' + error.response.data.message);
            } else if (error.message.includes('Network Error')) {
                alert('Network error. Please check if backend server is running.');
            } else {
                alert('Error submitting complaint: ' + error.message);
            }
        }
    };

    const handleDeleteComplaint = async (complaintId) => {
        if (!window.confirm('Are you sure you want to delete this complaint? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await studentApi.delete(`/complaints/delete-complaint/${complaintId}`);

            if (response.data.success) {
                alert('Complaint deleted successfully!');
                setMyComplaints(myComplaints.filter(comp => comp.complaintId !== complaintId));
                await fetchStudentData();
            }
        } catch (error) {
            console.error('Error deleting complaint:', error);
            if (error.response?.status === 401) {
                handleAutoLogout('Session expired. Please login again.');
            } else if (error.response?.data?.message) {
                alert('Error: ' + error.response.data.message);
            } else {
                alert('Error deleting complaint. Please try again.');
            }
        }
    };

    const handleLikeComplaint = async (complaintId) => {
        try {
            const response = await studentApi.post(`/complaints/like/${complaintId}`, {});

            if (response.data.success) {
                setPublicComplaints(publicComplaints.map(comp => 
                    comp.complaintId === complaintId 
                        ? { ...comp, likes: response.data.likes }
                        : comp
                ));
                
                const newLiked = new Set(likedComplaints);
                if (response.data.liked) {
                    newLiked.add(complaintId);
                } else {
                    newLiked.delete(complaintId);
                }
                setLikedComplaints(newLiked);
            }
        } catch (error) {
            console.error('Error liking complaint:', error);
            if (error.response?.status === 401) {
                handleAutoLogout('Session expired. Please login again.');
            } else if (error.response?.data?.message) {
                alert('Error: ' + error.response.data.message);
            } else {
                alert('Error liking complaint. Please try again.');
            }
        }
    };

    const toggleComplaintExpand = (complaintId) => {
        const newExpanded = new Set(expandedComplaints);
        if (newExpanded.has(complaintId)) {
            newExpanded.delete(complaintId);
        } else {
            newExpanded.add(complaintId);
        }
        setExpandedComplaints(newExpanded);
    };

    const handleUpdatePassword = async (currentPassword, newPassword) => {
        try {
            const response = await studentApi.put('/auth/update-password/student', {
                emailId: student.email,
                currentPassword,
                newPassword
            });

            if (response.data.success) {
                alert('Password updated successfully!');
                return true;
            }
        } catch (error) {
            console.error('Error updating password:', error);
            if (error.response?.status === 401) {
                handleAutoLogout('Session expired. Please login again.');
            } else {
                alert('Error updating password. Please try again.');
            }
            return false;
        }
    };

    const toggleComplaintPrivacy = (value) => {
        setNewComplaint({
            ...newComplaint,
            isPublic: value
        });
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'pending': return '#f59e0b';
            case 'in-progress': return '#3b82f6';
            case 'resolved': return '#10b981';
            case 'rejected': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'low': return '#10b981';
            case 'medium': return '#f59e0b';
            case 'high': return '#ef4444';
            case 'urgent': return '#dc2626';
            default: return '#6b7280';
        }
    };

    const getProblemTypeColor = (problemType) => {
        switch (problemType?.toLowerCase()) {
            case 'infrastructure': return '#8b5cf6';
            case 'administration': return '#06b6d4';
            case 'examination': return '#f59e0b';
            case 'library': return '#10b981';
            case 'other': return '#6b7280';
            default: return '#6b7280';
        }
    };

    const getTimeLeftColor = (timeLeft) => {
        if (timeLeft === 'Overdue') return '#ef4444';
        if (timeLeft === '1 day left') return '#f59e0b';
        return '#10b981';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Updated ComplaintsList component with expandable functionality
    const ComplaintsList = ({ complaints, showStudentInfo = false, showDeleteOption = false, showLikeOption = false }) => (
        <div className="complaints-grid">
            {complaints.length === 0 ? (
                <div className="no-complaints">
                    <div className="no-complaints-icon">📭</div>
                    <h3>No complaints found</h3>
                    <p>When you file complaints, they will appear here</p>
                </div>
            ) : (
                complaints.map((complaint) => (
                    <div key={complaint._id} className={`complaint-card ${!complaint.isPublic ? 'private-complaint' : ''}`}>
                        {/* Privacy Badge */}
                        <div className={`privacy-badge ${complaint.isPublic ? 'public' : 'private'}`}>
                            {complaint.isPublic ? '🌐 Public' : '🔒 Private'}
                        </div>

                        {/* Complaint Header - Always Visible */}
                        <div className="complaint-header">
                            <div className="complaint-id-section">
                                <div className="complaint-id">#{complaint.complaintId}</div>
                                <div className="complaint-meta-grid">
                                    <div className="meta-item">
                                        <span className="meta-label">Status:</span>
                                        <span className={`badge badge-${complaint.status?.toLowerCase().replace('-', '')}`}>
                                            {complaint.status?.charAt(0)?.toUpperCase() + complaint.status?.slice(1)}
                                        </span>
                                    </div>
                                    <div className="meta-item">
                                        <span className="meta-label">Priority:</span>
                                        <span className={`badge badge-${complaint.priority}`}>
                                            {complaint.priority}
                                        </span>
                                    </div>
                                    <div className="meta-item">
                                        <span className="meta-label">Problem Type:</span>
                                        <span className="detail-value">{complaint.problemType} - {complaint.subCategory}</span>
                                    </div>
                                    <div className="meta-item">
                                        <span className="meta-label">Days Left:</span>
                                        <span className="time-left-badge">
                                            {complaint.timeLeft || '7 days left'}
                                        </span>
                                    </div>
                                    <div className="meta-item">
                                        <span className="meta-label">Filed Date:</span>
                                        <span className="detail-value">{formatDate(complaint.filedDate)}</span>
                                    </div>
                                    <div className="meta-item">
                                        <span className="meta-label">Assigned To:</span>
                                        <span className="detail-value">{complaint.assignedTo}</span>
                                    </div>
                                    {complaint.coordinatorName && (
                                        <div className="meta-item">
                                            <span className="meta-label">Current Handler:</span>
                                            <span className="detail-value">{complaint.coordinatorName}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Expandable Section */}
                        <div className={`complaint-expandable ${expandedComplaints.has(complaint.complaintId) ? 'expanded' : ''}`}>
                            {expandedComplaints.has(complaint.complaintId) && (
                                <div className="complaint-body">
                                    <div className="complaint-description-section">
                                        <h4 className="description-title">Description of Complaint</h4>
                                        <p className="complaint-description">{complaint.complaintDescription}</p>
                                    </div>
                                    
                                    <div className="complaint-details">
                                        {showStudentInfo && (
                                            <>
                                                <div className="detail-item">
                                                    <span className="detail-label">Filed By:</span>
                                                    <span className="detail-value">{complaint.studentName} (Roll: {complaint.rollNumber})</span>
                                                </div>
                                                <div className="detail-item">
                                                    <span className="detail-label">Department:</span>
                                                    <span className="detail-value">{complaint.department}</span>
                                                </div>
                                            </>
                                        )}
                                        <div className="detail-item">
                                            <span className="detail-label">Course:</span>
                                            <span className="detail-value">{complaint.course}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Year/Sem:</span>
                                            <span className="detail-value">{complaint.year} - {complaint.semester}</span>
                                        </div>
                                        {complaint.teacherName && (
                                            <div className="detail-item">
                                                <span className="detail-label">Teacher:</span>
                                                <span className="detail-value">{complaint.teacherName}</span>
                                            </div>
                                        )}
                                        {complaint.isPublic && (
                                            <div className="detail-item">
                                                <span className="detail-label">Likes:</span>
                                                <span className="detail-value">{complaint.likes || 0} 👍</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Complaint Footer with Actions */}
                        <div className="complaint-footer">
                            <div className="complaint-actions">
                                <button 
                                    className="action-btn extend-btn"
                                    onClick={() => toggleComplaintExpand(complaint.complaintId)}
                                >
                                    {expandedComplaints.has(complaint.complaintId) ? '▲ Collapse' : '▼ Extend'}
                                </button>
                                
                                {showLikeOption && complaint.isPublic && (
                                    <button 
                                        className={`action-btn small like-btn ${likedComplaints.has(complaint.complaintId) ? 'liked' : ''}`}
                                        onClick={() => handleLikeComplaint(complaint.complaintId)}
                                    >
                                        {likedComplaints.has(complaint.complaintId) ? '👎 Unlike' : '👍 Like'} ({complaint.likes || 0})
                                    </button>
                                )}
                                
                                {showDeleteOption && complaint.status === 'pending' && (
                                    <button 
                                        className="action-btn small danger"
                                        onClick={() => handleDeleteComplaint(complaint.complaintId)}
                                    >
                                        🗑️ Delete
                                    </button>
                                )}
                                
                                {complaint.status === 'resolved' && (
                                    <button className="action-btn small success">
                                        ✅ Resolved
                                    </button>
                                )}
                                {complaint.status === 'in-progress' && (
                                    <button className="action-btn small info">
                                        🔧 In Progress
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    useEffect(() => {
        if (activeTab === 'complaints') {
            fetchComplaintsData();
        } else if (activeTab === 'dashboard') {
            fetchStudentData();
        }
    }, [activeTab]);

    // Add session expiry check on tab focus
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                // Tab became active, check session
                const token = localStorage.getItem('token');
                const user = localStorage.getItem('user');
                if (!token || !user) {
                    handleAutoLogout('Session expired. Please login again.');
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Periodic session check (every 5 minutes)
    useEffect(() => {
        const interval = setInterval(() => {
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');
            if (!token || !user) {
                handleAutoLogout('Session expired. Please login again.');
            }
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="student-dashboard">
            {/* Header */}
            <header className="dashboard-header">
                <div className="header-container">
                    <div className="header-main">
                        <div className="logo-section">
                            <div className="logo">🎓</div>
                            <div className="title-section">
                                <h1 className="header-title">Student Dashboard</h1>
                                <p className="header-subtitle">SVSU Grievance Management System</p>
                            </div>
                        </div>
                    </div>
                    <div className="user-section">
                        <div className="user-info">
                            <div className="user-avatar">
                                {student?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="user-details">
                                <span className="user-name">{student?.name}</span>
                                <span className="user-role">Student</span>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="logout-btn">
                            <span className="logout-icon">🚪</span>
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Error Banner */}
            {error && (
                <div className="error-banner">
                    <div className="error-content">
                        <span className="error-icon">⚠️</span>
                        <span className="error-message">{error}</span>
                    </div>
                    <button onClick={() => setError('')} className="error-close">×</button>
                </div>
            )}

            {/* Navigation */}
            <nav className="dashboard-nav">
                <div className="nav-container">
                    <button 
                        className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        <span className="nav-icon">📊</span>
                        <span className="nav-text">Dashboard</span>
                    </button>
                    <button 
                        className={`nav-btn ${activeTab === 'complaints' ? 'active' : ''}`}
                        onClick={() => setActiveTab('complaints')}
                    >
                        <span className="nav-icon">📋</span>
                        <span className="nav-text">Complaints</span>
                    </button>
                    <button 
                        className={`nav-btn ${activeTab === 'new-complaint' ? 'active' : ''}`}
                        onClick={() => setActiveTab('new-complaint')}
                    >
                        <span className="nav-icon">✍️</span>
                        <span className="nav-text">New Complaint</span>
                    </button>
                    <button 
                        className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        <span className="nav-icon">👤</span>
                        <span className="nav-text">Profile</span>
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <main className="dashboard-content">
                <div className="content-container">
                    {isLoading ? (
                        <div className="loading-container">
                            <div className="loading-spinner"></div>
                            <div className="loading-text">Loading dashboard...</div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'dashboard' && (
                                <div className="tab-content dashboard-tab">
                                    <div className="welcome-section">
                                        <div className="welcome-card">
                                            <div className="welcome-content">
                                                <h2>Welcome back, {student?.name}! 👋</h2>
                                                <p>Here's what's happening with your complaints today.</p>
                                                <div className="student-info-grid">
                                                    <div className="info-item">
                                                        <span className="info-label">Roll Number</span>
                                                        {/* FIXED: Using mapped rollNumber property */}
                                                        <span className="info-value">{student?.rollNumber || 'N/A'}</span>
                                                    </div>
                                                    <div className="info-item">
                                                        <span className="info-label">Department</span>
                                                        <span className="info-value">{student?.department || 'N/A'}</span>
                                                    </div>
                                                    <div className="info-item">
                                                        <span className="info-label">Course</span>
                                                        {/* FIXED: Using mapped course property */}
                                                        <span className="info-value">{student?.course || 'N/A'}</span>
                                                    </div>
                                                    <div className="info-item">
                                                        <span className="info-label">Year/Semester</span>
                                                        <span className="info-value">{student?.year || 'N/A'} - {student?.semester || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="welcome-graphic">
                                                <div className="floating-icons">
                                                    <div className="icon">📊</div>
                                                    <div className="icon">📝</div>
                                                    <div className="icon">✅</div>
                                                    <div className="icon">🔔</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="stats-section">
                                        <h2 className="section-title">Your Complaint Statistics</h2>
                                        <div className="stats-grid">
                                            <div className="stat-card total">
                                                <div className="stat-icon">📋</div>
                                                <div className="stat-content">
                                                    <h3>Total Complaints</h3>
                                                    <div className="stat-number">{stats.total}</div>
                                                </div>
                                            </div>
                                            <div className="stat-card pending">
                                                <div className="stat-icon">⏳</div>
                                                <div className="stat-content">
                                                    <h3>Pending</h3>
                                                    <div className="stat-number">{stats.pending}</div>
                                                </div>
                                            </div>
                                            <div className="stat-card progress">
                                                <div className="stat-icon">🔧</div>
                                                <div className="stat-content">
                                                    <h3>In Progress</h3>
                                                    <div className="stat-number">{stats.inProgress}</div>
                                                </div>
                                            </div>
                                            <div className="stat-card resolved">
                                                <div className="stat-icon">✅</div>
                                                <div className="stat-content">
                                                    <h3>Resolved</h3>
                                                    <div className="stat-number">{stats.resolved}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {topUnresolved.length > 0 && (
                                        <div className="unresolved-section">
                                            <h2 className="section-title">Top Unresolved Complaints</h2>
                                            <div className="unresolved-grid">
                                                {topUnresolved.map((complaint, index) => (
                                                    <div key={complaint._id} className="unresolved-card">
                                                        <div className="unresolved-header">
                                                            <div className="complaint-number">#{complaint.complaintId}</div>
                                                            <h4>{complaint.complaintDescription?.substring(0, 100)}...</h4>
                                                        </div>
                                                        <div className="unresolved-details">
                                                            <span>Filed: {formatDate(complaint.filedDate)}</span>
                                                            <span className={`badge badge-${complaint.priority}`}>
                                                                {complaint.priority}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="quick-actions-section">
                                        <h2 className="section-title">Quick Actions</h2>
                                        <div className="action-buttons">
                                            <button 
                                                className="action-btn primary"
                                                onClick={() => setActiveTab('new-complaint')}
                                            >
                                                <span className="action-icon">✍️</span>
                                                File New Complaint
                                            </button>
                                            <button 
                                                className="action-btn secondary"
                                                onClick={() => setActiveTab('complaints')}
                                            >
                                                <span className="action-icon">📋</span>
                                                View All Complaints
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'complaints' && (
                                <div className="tab-content complaints-tab">
                                    <div className="complaints-header">
                                        <h2 className="complaints-title">
                                            <span className="complaints-icon">📋</span>
                                            Complaints Management
                                        </h2>
                                        <div className="complaints-stats">
                                            <span className="stats-badge">My Complaints: {myComplaints.length}</span>
                                            <span className="stats-badge">Public Complaints: {publicComplaints.length}</span>
                                            <button onClick={fetchComplaintsData} className="refresh-btn">
                                                🔄 Refresh
                                            </button>
                                        </div>
                                    </div>

                                    <div className="complaints-sub-nav">
                                        <button 
                                            className={`sub-nav-btn ${activeComplaintsSubTab === 'my-complaints' ? 'active' : ''}`}
                                            onClick={() => setActiveComplaintsSubTab('my-complaints')}
                                        >
                                            <span className="sub-nav-icon">📝</span>
                                            My Complaints
                                        </button>
                                        <button 
                                            className={`sub-nav-btn ${activeComplaintsSubTab === 'public-complaints' ? 'active' : ''}`}
                                            onClick={() => setActiveComplaintsSubTab('public-complaints')}
                                        >
                                            <span className="sub-nav-icon">🌐</span>
                                            Public Complaints
                                        </button>
                                    </div>

                                    {activeComplaintsSubTab === 'my-complaints' && (
                                        <ComplaintsList 
                                            complaints={myComplaints}
                                            showStudentInfo={false}
                                            showDeleteOption={true}
                                            showLikeOption={false}
                                        />
                                    )}

                                    {activeComplaintsSubTab === 'public-complaints' && (
                                        <ComplaintsList 
                                            complaints={publicComplaints}
                                            showStudentInfo={true}
                                            showDeleteOption={false}
                                            showLikeOption={true}
                                        />
                                    )}
                                </div>
                            )}

                            {activeTab === 'new-complaint' && (
                                <div className="tab-content new-complaint-tab">
                                    <div className="complaint-form-section">
                                        <h2 className="form-title">File New Complaint</h2>
                                        <div className="form-container">
                                            <form onSubmit={handleSubmitComplaint} className="complaint-form">
                                                <div className="form-group">
                                                    <label htmlFor="problemType" className="form-label">Problem Type *</label>
                                                    <select
                                                        id="problemType"
                                                        name="problemType"
                                                        value={newComplaint.problemType}
                                                        onChange={handleProblemTypeChange}
                                                        required
                                                        className="form-select"
                                                    >
                                                        <option value="infrastructure">🏗️ Infrastructure</option>
                                                        <option value="administration">👨‍💼 Administration</option>
                                                        <option value="examination">📝 Examination</option>
                                                        <option value="library">📚 Library</option>
                                                        <option value="other">❓ Other</option>
                                                    </select>
                                                </div>

                                                <div className="form-group">
                                                    <label htmlFor="subCategory" className="form-label">Sub Category *</label>
                                                    <select
                                                        id="subCategory"
                                                        name="subCategory"
                                                        value={newComplaint.subCategory}
                                                        onChange={(e) => setNewComplaint({
                                                            ...newComplaint, 
                                                            subCategory: e.target.value
                                                        })}
                                                        required
                                                        className="form-select"
                                                    >
                                                        {subCategories.map((subCat) => (
                                                            <option key={subCat} value={subCat}>
                                                                {subCat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="form-group">
                                                    <textarea
                                                        id="description"
                                                        name="description"
                                                        value={newComplaint.complaintDescription}
                                                        onChange={(e) => {
                                                            if (e.target.value.length <= 200000) {
                                                                setNewComplaint({
                                                                    ...newComplaint, 
                                                                    complaintDescription: e.target.value
                                                                });
                                                            }
                                                        }}
                                                        required
                                                        rows="6"
                                                        placeholder="Describe your complaint in detail..."
                                                        className="form-textarea"
                                                    ></textarea>
                                                    <div className="char-count">
                                                        {newComplaint.complaintDescription.length}/200000 characters
                                                    </div>
                                                </div>

                                                <div className="form-group">
                                                    <label htmlFor="priority" className="form-label">Priority *</label>
                                                    <select
                                                        id="priority"
                                                        name="priority"
                                                        value={newComplaint.priority}
                                                        onChange={(e) => setNewComplaint({
                                                            ...newComplaint, 
                                                            priority: e.target.value
                                                        })}
                                                        required
                                                        className="form-select"
                                                    >
                                                        <option value="low">🟢 Low</option>
                                                        <option value="medium">🟡 Medium</option>
                                                        <option value="high">🔴 High</option>
                                                        <option value="urgent">💀 Urgent</option>
                                                    </select>
                                                </div>

                                                <div className="form-group">
                                                    <label htmlFor="coordinatorName" className="form-label">Coordinator Name</label>
                                                    <select
                                                        id="coordinatorName"
                                                        name="coordinatorName"
                                                        value={newComplaint.coordinatorName}
                                                        onChange={(e) => setNewComplaint({
                                                            ...newComplaint, 
                                                            coordinatorName: e.target.value
                                                        })}
                                                        className="form-select"
                                                    >
                                                        <option value="">Select Coordinator</option>
                                                        {teachers.map((teacher) => (
                                                            <option key={teacher._id} value={teacher.Name}>
                                                                {teacher.Name} - {teacher.Department}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="form-group">
                                                    <label htmlFor="teacherName" className="form-label">Teacher Name</label>
                                                    <input
                                                        type="text"
                                                        id="teacherName"
                                                        name="teacherName"
                                                        value={newComplaint.teacherName}
                                                        onChange={(e) => setNewComplaint({
                                                            ...newComplaint, 
                                                            teacherName: e.target.value
                                                        })}
                                                        placeholder="Enter teacher name (optional)"
                                                        className="form-input"
                                                    />
                                                </div>

                                                <div className="form-group assignment-options">
                                                    <div className="assignment-checkboxes"> 
                                                        <label className="checkbox-label">
                                                            <input
                                                                type="checkbox"
                                                                checked={newComplaint.directToHOD}
                                                                onChange={(e) => setNewComplaint({
                                                                    ...newComplaint, 
                                                                    directToHOD: e.target.checked
                                                                })}
                                                            />
                                                            <span className="checkmark"></span>
                                                            🎯 Assign directly to HOD
                                                        </label>
                                                        <label className="checkbox-label">
                                                            <input
                                                                type="checkbox"
                                                                checked={newComplaint.assignToAllTeachers}
                                                                onChange={(e) => setNewComplaint({
                                                                    ...newComplaint, 
                                                                    assignToAllTeachers: e.target.checked
                                                                })}
                                                            />
                                                            <span className="checkmark"></span>
                                                            👥 Assign to all teachers
                                                        </label>
                                                    </div>
                                                </div>

                                                <div className="form-group privacy-toggle-group">
                                                    <label className="privacy-toggle-label">
                                                        Complaint Visibility
                                                    </label>
                                                    <div className="privacy-toggle-container">
                                                        <div 
                                                            className={`privacy-option ${newComplaint.isPublic ? 'active' : ''}`}
                                                            onClick={() => toggleComplaintPrivacy(true)}
                                                        >
                                                            <span className="privacy-icon">🌐</span>
                                                            <div className="privacy-text">
                                                                <strong>Public Complaint</strong>
                                                                <small>Visible to all students</small>
                                                            </div>
                                                            <div className="privacy-check">
                                                                {newComplaint.isPublic && '✓'}
                                                            </div>
                                                        </div>
                                                        
                                                        <div 
                                                            className={`privacy-option ${!newComplaint.isPublic ? 'active' : ''}`}
                                                            onClick={() => toggleComplaintPrivacy(false)}
                                                        >
                                                            <span className="privacy-icon">🔒</span>
                                                            <div className="privacy-text">
                                                                <strong>Private Complaint</strong>
                                                                <small>Only visible to you and coordinators</small>
                                                            </div>
                                                            <div className="privacy-check">
                                                                {!newComplaint.isPublic && '✓'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="form-submit">
                                                    <button type="submit" className="submit-btn primary">
                                                        📨 Submit Complaint
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        className="submit-btn secondary"
                                                        onClick={() => setActiveTab('complaints')}
                                                    >
                                                        📋 View All Complaints
                                                    </button>
                                                </div>
                                            </form>

                                            <div className="form-guidelines">
                                                <h3>📝 Complaint Guidelines</h3>
                                                <ul>
                                                    <li>✅ Select appropriate problem type and sub-category</li>
                                                    <li>✅ Choose between <strong>Public</strong> or <strong>Private</strong> visibility</li>
                                                    <li>✅ Optionally assign to specific coordinator/teacher</li>
                                                    <li>✅ Choose to assign directly to HOD if urgent</li>
                                                    <li>✅ Assign to all teachers for general issues</li>
                                                    <li>✅ Be clear and specific about your issue</li>
                                                    <li>✅ Choose appropriate priority level</li>
                                                    <li>✅ Track status in "My Complaints" section</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'profile' && (
                                <div className="tab-content profile-tab">
                                    <h2 className="profile-title">Student Profile</h2>
                                    <div className="profile-container">
                                        <div className="profile-card">
                                            <div className="profile-header">
                                                <div className="profile-avatar">
                                                    {student?.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="profile-info">
                                                    <h3>{student?.name}</h3>
                                                    <p className="profile-role">Student</p>
                                                </div>
                                            </div>
                                            <div className="profile-details">
                                                <div className="detail-row">
                                                    <div className="detail-item">
                                                        <label>Roll Number</label>
                                                        {/* FIXED: Using mapped rollNumber property */}
                                                        <span>{student?.rollNumber || 'N/A'}</span>
                                                    </div>
                                                    <div className="detail-item">
                                                        <label>Email</label>
                                                        <span>{student?.email || 'N/A'}</span>
                                                    </div>
                                                </div>
                                                <div className="detail-row">
                                                    <div className="detail-item">
                                                        <label>Department</label>
                                                        <span>{student?.department || 'N/A'}</span>
                                                    </div>
                                                    <div className="detail-item">
                                                        <label>Course</label>
                                                        {/* FIXED: Using mapped course property */}
                                                        <span>{student?.course || 'N/A'}</span>
                                                    </div>
                                                </div>
                                                <div className="detail-row">
                                                    <div className="detail-item">
                                                        <label>Year</label>
                                                        <span>{student?.year || 'N/A'}</span>
                                                    </div>
                                                    <div className="detail-item">
                                                        <label>Semester</label>
                                                        <span>{student?.semester || 'N/A'}</span>
                                                    </div>
                                                </div>
                                                <div className="detail-row">
                                                    <div className="detail-item full-width">
                                                        <label>Account Status</label>
                                                        <span className="status-active">Active</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="password-update-section">
                                                <h3>Update Password</h3>
                                                <PasswordUpdateForm onUpdatePassword={handleUpdatePassword} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

// PasswordUpdateForm component
const PasswordUpdateForm = ({ onUpdatePassword }) => {
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [isUpdating, setIsUpdating] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.newPassword !== formData.confirmPassword) {
            alert('New passwords do not match!');
            return;
        }

        if (formData.newPassword.length < 6) {
            alert('New password must be at least 6 characters long!');
            return;
        }

        setIsUpdating(true);
        try {
            const success = await onUpdatePassword(formData.currentPassword, formData.newPassword);
            if (success) {
                setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            }
        } finally {
            setIsUpdating(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <form onSubmit={handleSubmit} className="password-form">
            <div className="form-group">
                <input
                    type="password"
                    name="currentPassword"
                    placeholder="Current Password"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    required
                    className="form-input"
                />
            </div>
            <div className="form-group">
                <input
                    type="password"
                    name="newPassword"
                    placeholder="New Password"
                    value={formData.newPassword}
                    onChange={handleChange}
                    required
                    minLength="6"
                    className="form-input"
                />
            </div>
            <div className="form-group">
                <input
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirm New Password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="form-input"
                />
            </div>
            <button 
                type="submit" 
                className="update-password-btn"
                disabled={isUpdating}
            >
                {isUpdating ? 'Updating...' : 'Update Password'}
            </button>
        </form>
    );
};

export default StudentDashboard;