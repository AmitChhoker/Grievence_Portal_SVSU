import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './TeacherDashboard.css';

// Create axios instance with interceptors
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

const TeacherDashboard = () => {
  const [teacher, setTeacher] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('complaints');
  const [activeCategory, setActiveCategory] = useState('all');
  const [likedComplaints, setLikedComplaints] = useState(new Set());
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, resolved: 0 });
  const navigate = useNavigate();

  // Problem types for filtering
  const problemTypes = [
    { value: 'all', label: 'All Problems', icon: '📋' },
    { value: 'infrastructure', label: 'Infrastructure', icon: '🏗️' },
    { value: 'administration', label: 'Administration', icon: '👨‍💼' },
    { value: 'examination', label: 'Examination', icon: '📝' },
    { value: 'library', label: 'Library', icon: '📚' },
    { value: 'other', label: 'Other', icon: '❓' }
  ];

  // Add request interceptor to include token
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(
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

    // Add response interceptor to handle token refresh
    const responseInterceptor = api.interceptors.response.use(
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
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  const handleAutoLogout = (message = 'Session expired. Please login again.') => {
    alert(message);
    localStorage.removeItem('token');
    localStorage.removeItem('teacher');
    localStorage.removeItem('userRole');
    navigate('/teacher-login');
  };

  useEffect(() => {
    checkAuthentication();
  }, [navigate]);

  const checkAuthentication = async () => {
    try {
      console.log('🔍 Checking Teacher authentication...');
      
      const teacherDataString = localStorage.getItem('teacher');
      const token = localStorage.getItem('token');
      
      console.log('Teacher Data from storage:', teacherDataString);
      console.log('Token from storage:', token);

      if (!teacherDataString || teacherDataString === 'undefined' || !token) {
        console.log('❌ No Teacher data found, redirecting to login');
        navigate('/teacher-login');
        return;
      }

      const teacherData = JSON.parse(teacherDataString);
      
      // FIX: Only allow coordinator role for TeacherDashboard
      const teacherRoles = ['coordinator'];
      if (!teacherRoles.includes(teacherData.role)) {
        console.log('❌ User is not Teacher (coordinator), redirecting');
        navigate('/teacher-login');
        return;
      }
      
      console.log('✅ Teacher authenticated:', teacherData);
      setTeacher(teacherData);
      
      // Verify token is still valid by making a test request
      await verifyToken();
      await fetchTeacherData();

    } catch (error) {
      console.error('❌ Error in Teacher authentication:', error);
      handleAutoLogout();
    }
  };

  const verifyToken = async () => {
    try {
      await api.get('/auth/verify-token');
    } catch (error) {
      console.error('Token verification failed:', error);
      throw error;
    }
  };

  const fetchTeacherData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch stats for dashboard
      if (activeTab === 'dashboard') {
        const statsResponse = await api.get('/complaints/teacher-stats');

        if (statsResponse.data.success) {
          setStats(statsResponse.data.stats);
        }
      }

      // Fetch complaints for complaints tab - Filter by category
      if (activeTab === 'complaints') {
        let complaintsResponse;
        if (activeCategory === 'all') {
          complaintsResponse = await api.get('/complaints/teacher-complaints');
        } else {
          complaintsResponse = await api.get(`/complaints/teacher-complaints/${activeCategory}`);
        }

        if (complaintsResponse.data.success) {
          setComplaints(complaintsResponse.data.complaints);
          
          // Update liked complaints
          const liked = new Set();
          complaintsResponse.data.complaints?.forEach(complaint => {
            if (complaint.likedBy?.includes(teacher?.id)) {
              liked.add(complaint.complaintId);
            }
          });
          setLikedComplaints(liked);
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('❌ Error fetching teacher data:', error);
      
      if (error.response?.status === 401) {
        handleAutoLogout('Session expired. Please login again.');
      } else if (error.response?.status === 404) {
        console.error('❌ Endpoint not found. Please check server routes.');
        alert('Server error: Endpoint not found. Please contact administrator.');
      } else if (error.code === 'NETWORK_ERROR') {
        alert('Network error. Please check your internet connection.');
      } else {
        alert('Error loading data. Please try again.');
      }
      
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('teacher');
    localStorage.removeItem('userRole');
    navigate('/teacher-login');
  };

  const handleUpdatePassword = async (currentPassword, newPassword) => {
    try {
      const response = await api.put(
        '/auth/update-password/teacher',
        {
          emailId: teacher.email,
          currentPassword,
          newPassword
        }
      );

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

  const handleLike = async (complaintId) => {
    try {
      const response = await api.post(`/complaints/like/${complaintId}`, {});

      if (response.data.success) {
        // Update local state
        setComplaints(complaints.map(comp => 
          comp.complaintId === complaintId 
            ? { ...comp, likes: response.data.likes }
            : comp
        ));
        
        if (response.data.liked) {
          setLikedComplaints(new Set([...likedComplaints, complaintId]));
        } else {
          const newLiked = new Set(likedComplaints);
          newLiked.delete(complaintId);
          setLikedComplaints(newLiked);
        }
        
        alert(response.data.message);
      }
    } catch (error) {
      console.error('Error liking complaint:', error);
      if (error.response?.status === 401) {
        handleAutoLogout('Session expired. Please login again.');
      } else if (error.response && error.response.data.message === 'Cannot like private complaints') {
        alert('You cannot like private complaints!');
      } else {
        alert('Error liking complaint. Please try again.');
      }
    }
  };

  const handleShareNext = async (complaintId) => {
    try {
      const response = await api.put(`/complaints/share-next/${complaintId}`, {});

      if (response.data.success) {
        // Refresh complaints list
        fetchTeacherData();
        alert(response.data.message);
      }
    } catch (error) {
      console.error('Error sharing complaint:', error);
      if (error.response?.status === 401) {
        handleAutoLogout('Session expired. Please login again.');
      } else if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else {
        alert('Error sharing complaint. Please try again.');
      }
    }
  };

  const handleStatusChange = async (complaintId, newStatus) => {
    try {
      const response = await api.put(
        `/complaints/update-status/${complaintId}`,
        { status: newStatus }
      );

      if (response.data.success) {
        // Update local state
        setComplaints(complaints.map(comp => 
          comp.complaintId === complaintId 
            ? { ...comp, status: newStatus, lastUpdated: new Date() }
            : comp
        ));
        alert('Status updated successfully!');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      if (error.response?.status === 401) {
        handleAutoLogout('Session expired. Please login again.');
      } else {
        alert('Error updating status. Please try again.');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#f08c00';
      case 'in-progress': return '#1971c2';
      case 'resolved': return '#2f9e44';
      case 'rejected': return '#e03131';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'Pending';
      case 'in-progress': return 'In Progress';
      case 'resolved': return 'Resolved';
      case 'rejected': return 'Rejected';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getYearSemester = (year, semester) => {
    return `${year || 'N/A'}/${semester || 'N/A'}`;
  };

  const canShareNext = (complaint) => {
    // Coordinators can share to HOD
    return (teacher?.role === 'coordinator' && complaint.currentHandler === 'coordinator');
  };

  const getNextHandlerText = (complaint) => {
    if (teacher?.role === 'coordinator' && complaint.currentHandler === 'coordinator') {
      return 'Share to HOD';
    }
    return 'Share Next';
  };

  // Add session expiry check on tab focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Tab became active, check session
        const token = localStorage.getItem('token');
        const teacherData = localStorage.getItem('teacher');
        if (!token || !teacherData) {
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
      const teacherData = localStorage.getItem('teacher');
      if (!token || !teacherData) {
        handleAutoLogout('Session expired. Please login again.');
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Fetch data when category changes
  useEffect(() => {
    if (activeTab === 'complaints') {
      fetchTeacherData();
    }
  }, [activeCategory, activeTab]);

  return (
    <div className="teacher-dashboard">
      {/* Header - FIXED: Three items in horizontal layout */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-main">
            <div className="header-title-section">
              <h1 className="header-title">
                <span className="title-icon">👨‍🏫</span>
                Teacher Dashboard
              </h1>
              <div className="complaints-count">
                <span className="count-icon">📋</span>
                {complaints.length} Complaints/Requests
              </div>
            </div>
            <div className="profile-section">
              <div className="user-details">
                <span className="welcome-text">Welcome,</span>
                <span className="user-name">{teacher?.name}</span>
                <span className="user-role">{teacher?.role?.toUpperCase()}</span>
                {teacher?.department && <span className="user-department">{teacher?.department}</span>}
              </div>
            </div>
          </div>
          <div className="header-actions">
            <button onClick={fetchTeacherData} className="refresh-btn">
              <span className="refresh-icon">🔄</span>
              Refresh
            </button>
            <button onClick={handleLogout} className="logout-btn">
              <span className="logout-icon">🚪</span>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation - FIXED: Three tabs in horizontal layout */}
      <nav className="dashboard-nav">
        <div className="nav-container">
          <button 
            className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className={`nav-btn ${activeTab === 'complaints' ? 'active' : ''}`}
            onClick={() => setActiveTab('complaints')}
          >
            📋 Complaints/Requests
          </button>
          <button 
            className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Profile
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dashboard-content">
        {activeTab === 'dashboard' && (
          <div className="tab-content">
            <div className="welcome-banner">
              <div className="welcome-content">
                <h2>Welcome to {teacher?.role?.toUpperCase()} Dashboard</h2>
                <div className="welcome-message">
                  <p>Hello <strong>{teacher?.name}</strong>, welcome to your dashboard.</p>
                  <p>You are logged in as <strong>{teacher?.role}</strong> 
                    {teacher?.department && ` in the <strong>${teacher?.department}</strong> department`}.</p>
                </div>
              </div>
              <div className="welcome-graphic">
                <div className="floating-icons">
                  <span className="icon">📚</span>
                  <span className="icon">💻</span>
                  <span className="icon">🔧</span>
                </div>
              </div>
            </div>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📥</div>
                <h3>Total Complaints</h3>
                <p className="stat-number">{stats.total}</p>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⏳</div>
                <h3>Pending</h3>
                <p className="stat-number">{stats.pending}</p>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🔧</div>
                <h3>In Progress</h3>
                <p className="stat-number">{stats.inProgress}</p>
              </div>
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <h3>Resolved</h3>
                <p className="stat-number">{stats.resolved}</p>
              </div>
            </div>

            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="action-buttons">
                <button 
                  className="action-btn primary"
                  onClick={() => setActiveTab('complaints')}
                >
                  📋 View Complaints
                </button>
                <button className="action-btn secondary">
                  📊 Generate Report
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'complaints' && (
          <div className="tab-content complaints-tab">
            <div className="complaints-header">
              <h2 className="complaints-title">
                <span className="title-icon">📋</span>
                Complaints/Requests - {teacher?.role?.toUpperCase()}
              </h2>
              <div className="complaints-stats">
                <span className="total-complaints">Total: {complaints.length}</span>
                <button 
                  className="refresh-btn"
                  onClick={fetchTeacherData}
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            {/* Category Filter */}
            <div className="category-filter">
              <h3>Filter by Problem Type:</h3>
              <div className="category-buttons">
                {problemTypes.map((type) => (
                  <button
                    key={type.value}
                    className={`category-btn ${activeCategory === type.value ? 'active' : ''}`}
                    onClick={() => setActiveCategory(type.value)}
                  >
                    <span className="category-icon">{type.icon}</span>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="complaints-container">
              {complaints.length === 0 ? (
                <div className="no-complaints">
                  <div className="no-complaints-icon">📭</div>
                  <p>No complaints found for selected category.</p>
                  <p>Complaints will appear here when they are assigned to you.</p>
                </div>
              ) : (
                <div className="complaints-table">
                  {/* Table Header - FIXED: All headers in single row */}
                  <div className="table-header">
                    <div className="header-row">
                      <div className="header-cell">COMPLAINT ID</div>
                      <div className="header-cell">STUDENT NAME</div>
                      <div className="header-cell">PROBLEM TYPE</div>
                      <div className="header-cell">SUB CATEGORY</div>
                      <div className="header-cell">DEPARTMENT</div>
                      <div className="header-cell">COURSE</div>
                      <div className="header-cell">YEAR/SEM</div>
                      <div className="header-cell">FILED DATE</div>
                      <div className="header-cell">VISIBILITY</div>
                      <div className="header-cell">ASSIGNED TO</div>
                      <div className="header-cell">TIME LEFT</div>
                      <div className="header-cell">STATUS</div>
                      <div className="header-cell">PRIORITY</div>
                      <div className="header-cell">ACTIONS</div>
                    </div>
                  </div>

                  {/* Table Body - FIXED: All values in single row per complaint */}
                  <div className="table-body">
                    {complaints.map((complaint, index) => (
                      <div key={complaint._id} className={`table-row ${index % 2 === 0 ? 'even' : 'odd'}`}>
                        {/* Complaint ID */}
                        <div className="table-cell">
                          <span className="cell-text">{complaint.complaintId}</span>
                        </div>

                        {/* Student Name */}
                        <div className="table-cell">
                          <span className="cell-text">{complaint.studentName}</span>
                          <small className="roll-number">Roll: {complaint.rollNumber}</small>
                        </div>

                        {/* Problem Type */}
                        <div className="table-cell">
                          <span 
                            className="problem-type-badge"
                            style={{ backgroundColor: getProblemTypeColor(complaint.problemType) }}
                          >
                            {complaint.problemType}
                          </span>
                        </div>

                        {/* Sub Category */}
                        <div className="table-cell">
                          <span className="cell-text">
                            {complaint.subCategory?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>

                        {/* Department */}
                        <div className="table-cell">
                          <span className="cell-text">{complaint.department}</span>
                        </div>

                        {/* Course */}
                        <div className="table-cell">
                          <span className="cell-text">{complaint.course}</span>
                        </div>

                        {/* Year/Semester */}
                        <div className="table-cell">
                          <span className="cell-text">{getYearSemester(complaint.year, complaint.semester)}</span>
                        </div>

                        {/* Filed Date */}
                        <div className="table-cell">
                          <span className="cell-text">{formatDate(complaint.filedDate)}</span>
                        </div>

                        {/* Visibility */}
                        <div className="table-cell">
                          <span className={`visibility-badge ${complaint.isPublic ? 'public' : 'private'}`}>
                            {complaint.isPublic ? '🌐 Public' : '🔒 Private'}
                          </span>
                        </div>

                        {/* Assigned To */}
                        <div className="table-cell">
                          <span className="cell-text">{complaint.assignedTo}</span>
                        </div>

                        {/* Time Left */}
                        <div className="table-cell">
                          <span className={`time-badge ${
                            complaint.timeLeft === 'Overdue' ? 'overdue' : 
                            complaint.timeLeft?.includes('1 day') ? 'urgent' : 'normal'
                          }`}>
                            {complaint.timeLeft || 'N/A'}
                          </span>
                        </div>

                        {/* Status */}
                        <div className="table-cell">
                          <select
                            value={complaint.status}
                            onChange={(e) => handleStatusChange(complaint.complaintId, e.target.value)}
                            className="status-select"
                            style={{ 
                              backgroundColor: getStatusColor(complaint.status),
                              color: 'white'
                            }}
                          >
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>

                        {/* Priority */}
                        <div className="table-cell">
                          <span 
                            className={`priority-badge ${complaint.priority}`}
                            style={{ 
                              backgroundColor: 
                                complaint.priority === 'urgent' ? '#c22525' :
                                complaint.priority === 'high' ? '#e03131' :
                                complaint.priority === 'medium' ? '#f08c00' : '#2f9e44'
                            }}
                          >
                            {complaint.priority}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="table-cell">
                          <div className="action-buttons-cell">
                            {/* Like Button */}
                            <div className="like-container">
                              <button 
                                className={`like-btn ${likedComplaints.has(complaint.complaintId) ? 'liked' : ''}`}
                                onClick={() => handleLike(complaint.complaintId)}
                                disabled={!complaint.isPublic}
                                title={!complaint.isPublic ? 'Cannot like private complaints' : 'Like this complaint'}
                              >
                                <span className="like-icon">👍</span>
                                {likedComplaints.has(complaint.complaintId) ? 'Liked' : 'Like'}
                              </button>
                              <span className="like-count">{complaint.likes || 0}</span>
                            </div>

                            {/* Share Next Button */}
                            {canShareNext(complaint) && (
                              <button 
                                className="share-next-btn"
                                onClick={() => handleShareNext(complaint.complaintId)}
                                title={`Share complaint to next authority`}
                              >
                                {getNextHandlerText(complaint)}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Complaint Description Section */}
            {complaints.length > 0 && (
              <div className="complaint-descriptions">
                <h3>Complaint Descriptions</h3>
                <div className="descriptions-grid">
                  {complaints.map((complaint) => (
                    <div key={complaint._id} className="complaint-description-card">
                      <div className="description-header">
                        <span className="complaint-id">{complaint.complaintId}</span>
                        <div className="header-meta">
                          <span 
                            className="status-badge"
                            style={{ backgroundColor: getStatusColor(complaint.status) }}
                          >
                            {getStatusText(complaint.status)}
                          </span>
                          <span 
                            className="priority-badge"
                            style={{ 
                              backgroundColor: 
                                complaint.priority === 'urgent' ? '#c22525' :
                                complaint.priority === 'high' ? '#e03131' :
                                complaint.priority === 'medium' ? '#f08c00' : '#2f9e44'
                            }}
                          >
                            {complaint.priority}
                          </span>
                          <span 
                            className="problem-type-badge"
                            style={{ backgroundColor: getProblemTypeColor(complaint.problemType) }}
                          >
                            {complaint.problemType}
                          </span>
                          <span className={`visibility-badge ${complaint.isPublic ? 'public' : 'private'}`}>
                            {complaint.isPublic ? '🌐 Public' : '🔒 Private'}
                          </span>
                        </div>
                      </div>
                      <div className="description-content">
                        <h4>Description of Complaint</h4>
                        <p>{complaint.complaintDescription}</p>
                        
                        <div className="complaint-details">
                          <div className="detail-item">
                            <strong>Problem Type:</strong> {complaint.problemType}
                          </div>
                          <div className="detail-item">
                            <strong>Sub Category:</strong> {complaint.subCategory?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                          {complaint.coordinatorName && (
                            <div className="detail-item">
                              <strong>Coordinator:</strong> {complaint.coordinatorName}
                            </div>
                          )}
                          {complaint.teacherName && (
                            <div className="detail-item">
                              <strong>Teacher:</strong> {complaint.teacherName}
                            </div>
                          )}
                          {complaint.assignToAllTeachers && (
                            <div className="detail-item">
                              <strong>Assigned to all teachers</strong>
                            </div>
                          )}
                          {complaint.directToHOD && (
                            <div className="detail-item">
                              <strong>Direct to HOD</strong>
                            </div>
                          )}
                        </div>
                        
                        {complaint.fileName && (
                          <div className="file-attachment">
                            <span className="file-icon">📎</span>
                            <span className="file-name">{complaint.fileName}</span>
                          </div>
                        )}
                      </div>
                      <div className="description-footer">
                        <div className="student-info">
                          <strong>{complaint.studentName}</strong> • {complaint.department} • {complaint.course} • {getYearSemester(complaint.year, complaint.semester)}
                        </div>
                        <div className="footer-actions">
                          <div className="like-container">
                            <button 
                              className={`like-btn ${likedComplaints.has(complaint.complaintId) ? 'liked' : ''}`}
                              onClick={() => handleLike(complaint.complaintId)}
                              disabled={!complaint.isPublic}
                            >
                              <span className="like-icon">👍</span>
                              {likedComplaints.has(complaint.complaintId) ? 'Liked' : 'Like'}
                            </button>
                            <span className="like-count">{complaint.likes || 0}</span>
                          </div>
                          {canShareNext(complaint) && (
                            <button 
                              className="share-next-btn"
                              onClick={() => handleShareNext(complaint.complaintId)}
                            >
                              {getNextHandlerText(complaint)}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="tab-content">
            <h2>{teacher?.role?.toUpperCase()} Profile</h2>
            <div className="profile-card">
              <div className="profile-header">
                <div className="profile-avatar">
                  {teacher?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="profile-info">
                  <h3>{teacher?.name}</h3>
                  <p className="profile-role">{teacher?.role}</p>
                  {teacher?.department && <p className="profile-department">{teacher?.department}</p>}
                </div>
              </div>
              <div className="profile-details">
                <div className="detail-item">
                  <label>Email:</label>
                  <span>{teacher?.email}</span>
                </div>
                {teacher?.department && (
                  <div className="detail-item">
                    <label>Department:</label>
                    <span>{teacher?.department}</span>
                  </div>
                )}
                <div className="detail-item">
                  <label>Account Status:</label>
                  <span className="status-active">Active</span>
                </div>
                <div className="detail-item">
                  <label>Member Since:</label>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </div>

              {/* Password Update Section */}
              <div className="password-update-section">
                <h3>Update Password</h3>
                <PasswordUpdateForm onUpdatePassword={handleUpdatePassword} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// Password Update Component (same as before)
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

export default TeacherDashboard;