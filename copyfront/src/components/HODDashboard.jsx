import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './HODDashboard.css';

const HODDashboard = () => {
  const [hod, setHOD] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeComplaintsSubTab, setActiveComplaintsSubTab] = useState('all');
  const [likedComplaints, setLikedComplaints] = useState(new Set());
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, resolved: 0 });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Problem types and subcategories
  const problemTypes = {
    infrastructure: ['building', 'furniture', 'electricity', 'water', 'internet', 'other'],
    administration: ['admission', 'fee', 'document', 'certificate', 'other'],
    examination: ['late_result', 'schedule', 'paper', 'hall_ticket', 'other'],
    library: ['book_not_available', 'book_condition', 'digital_resources', 'staff_behavior', 'other'],
    other: ['other']
  };

  useEffect(() => {
    const hodData = JSON.parse(localStorage.getItem('hod'));
    const token = localStorage.getItem('token');
    
    if (!hodData || !token || hodData.role !== 'hod') {
      navigate('/hod-login');
      return;
    }
    
    setHOD(hodData);
    fetchHODData();
  }, [navigate, activeTab]);

  const fetchHODData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      // Fetch stats for dashboard
      if (activeTab === 'dashboard') {
        const statsResponse = await axios.get('http://localhost:5000/api/complaints/hod-stats', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (statsResponse.data.success) {
          setStats(statsResponse.data.stats);
        }
      }

      // Fetch complaints for complaints tab
      if (activeTab === 'complaints') {
        const complaintsResponse = await axios.get('http://localhost:5000/api/complaints/hod-complaints', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (complaintsResponse.data.success) {
          setComplaints(complaintsResponse.data.complaints);
          
          // Initialize liked complaints
          const liked = new Set();
          complaintsResponse.data.complaints?.forEach(complaint => {
            if (complaint.likedBy?.includes(hod?.userId || hod?.id)) {
              liked.add(complaint.complaintId);
            }
          });
          setLikedComplaints(liked);
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('❌ Error fetching HOD data:', error);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        alert('Session expired. Please login again.');
        localStorage.removeItem('token');
        localStorage.removeItem('hod');
        navigate('/hod-login');
      } else if (error.response?.status === 404) {
        setError('Server endpoint not found. Please contact administrator.');
      } else {
        setError('Error loading data. Please try again.');
      }
      
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('hod');
    localStorage.removeItem('userRole');
    navigate('/login/hod');
  };

  const handleUpdatePassword = async (currentPassword, newPassword) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        'http://localhost:5000/api/auth/update-password/hod',
        {
          emailId: hod.email,
          currentPassword,
          newPassword
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        alert('Password updated successfully!');
        return true;
      }
    } catch (error) {
      console.error('Error updating password:', error);
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
        handleLogout();
      } else {
        alert('Error updating password. Please try again.');
      }
      return false;
    }
  };

  const handleLike = async (complaintId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/api/complaints/like/${complaintId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setComplaints(complaints.map(comp => 
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
        alert('Session expired. Please login again.');
        handleLogout();
      } else if (error.response && error.response.data.message === 'Cannot like private complaints') {
        alert('You cannot like private complaints!');
      } else {
        alert('Error liking complaint. Please try again.');
      }
    }
  };

  const handleShareNext = async (complaintId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:5000/api/complaints/share-next/${complaintId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        fetchHODData();
        alert(response.data.message);
      }
    } catch (error) {
      console.error('Error sharing complaint:', error);
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
        handleLogout();
      } else {
        alert('Error sharing complaint. Please try again.');
      }
    }
  };

  const handleStatusChange = async (complaintId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:5000/api/complaints/update-status/${complaintId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setComplaints(complaints.map(comp => 
          comp.complaintId === complaintId 
            ? { ...comp, status: newStatus }
            : comp
        ));
        alert('Status updated successfully!');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
        handleLogout();
      } else {
        alert('Error updating status. Please try again.');
      }
    }
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

  // Filter complaints by problem type
  const getFilteredComplaints = () => {
    if (activeComplaintsSubTab === 'all') {
      return complaints;
    }
    return complaints.filter(complaint => 
      complaint.problemType === activeComplaintsSubTab
    );
  };

  const ComplaintsList = ({ complaints, showStudentInfo = true, showLikeOption = true }) => (
    <div className="complaints-grid">
      {complaints.length === 0 ? (
        <div className="no-complaints">
          <div className="no-complaints-icon">📭</div>
          <h3>No complaints found</h3>
          <p>When complaints are shared with you, they will appear here</p>
        </div>
      ) : (
        complaints.map((complaint) => (
          <div key={complaint._id} className={`complaint-card ${!complaint.isPublic ? 'private-complaint' : ''}`}>
            <div className={`privacy-badge ${complaint.isPublic ? 'public' : 'private'}`}>
              {complaint.isPublic ? '🌐 Public' : '🔒 Private'}
            </div>

            <div className="complaint-header">
              <div className="complaint-title-section">
                <h3 className="complaint-title">
                  {complaint.complaintDescription?.substring(0, 80)}...
                </h3>
                <span className="complaint-id">#{complaint.complaintId}</span>
              </div>
              <div className="complaint-meta">
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(complaint.status) }}
                >
                  {complaint.status?.charAt(0)?.toUpperCase() + complaint.status?.slice(1)}
                </span>
                <span 
                  className="priority-badge"
                  style={{ backgroundColor: getPriorityColor(complaint.priority) }}
                >
                  {complaint.priority}
                </span>
                <span 
                  className="problem-type-badge"
                  style={{ backgroundColor: getProblemTypeColor(complaint.problemType) }}
                >
                  {complaint.problemType}
                </span>
                <span 
                  className="time-left-badge"
                  style={{ backgroundColor: getTimeLeftColor(complaint.timeLeft) }}
                >
                  {complaint.timeLeft || '7 days left'}
                </span>
              </div>
            </div>
            
            <div className="complaint-body">
              <p className="complaint-description">{complaint.complaintDescription}</p>
              
              <div className="complaint-details-grid">
                <div className="detail-item">
                  <span className="detail-label">Problem Type:</span>
                  <span className="detail-value">{complaint.problemType} - {complaint.subCategory}</span>
                </div>
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
                <div className="detail-item">
                  <span className="detail-label">Filed Date:</span>
                  <span className="detail-value">{formatDate(complaint.filedDate)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Assigned To:</span>
                  <span className="detail-value">{complaint.assignedTo}</span>
                </div>
                {complaint.coordinatorName && (
                  <div className="detail-item">
                    <span className="detail-label">Coordinator:</span>
                    <span className="detail-value">{complaint.coordinatorName}</span>
                  </div>
                )}
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

            <div className="complaint-footer">
              <div className="complaint-actions">
                {showLikeOption && complaint.isPublic && (
                  <button 
                    className={`action-btn small like-btn ${likedComplaints.has(complaint.complaintId) ? 'liked' : ''}`}
                    onClick={() => handleLike(complaint.complaintId)}
                  >
                    {likedComplaints.has(complaint.complaintId) ? '👎 Unlike' : '👍 Like'}
                  </button>
                )}
                
                {complaint.currentHandler === 'hod' && (
                  <button 
                    className="action-btn small primary"
                    onClick={() => handleShareNext(complaint.complaintId)}
                  >
                    📤 Share with Dean
                  </button>
                )}

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

  return (
    <div className="hod-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-container">
          <div className="header-main">
            <div className="logo-section">
              <div className="logo">👨‍💼</div>
              <div className="title-section">
                <h1 className="header-title">HOD Dashboard</h1>
                <p className="header-subtitle">SVSU Grievance Management System</p>
              </div>
            </div>
          </div>
          <div className="user-section">
            <div className="user-info">
              <div className="user-avatar">
                {hod?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                <span className="user-name">{hod?.name}</span>
                <span className="user-role">HOD - {hod?.department}</span>
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
          {activeTab === 'dashboard' && (
            <div className="tab-content dashboard-tab">
              <div className="welcome-section">
                <div className="welcome-card">
                  <div className="welcome-content">
                    <h2>Welcome back, {hod?.name}! 👋</h2>
                    <p>Here's what's happening with complaints in your department today.</p>
                    <div className="user-info-grid">
                      <div className="info-item">
                        <span className="info-label">Department</span>
                        <span className="info-value">{hod?.department}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Role</span>
                        <span className="info-value">Head of Department</span>
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
                <h2 className="section-title">Complaint Statistics</h2>
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

              <div className="quick-actions-section">
                <h2 className="section-title">Quick Actions</h2>
                <div className="action-buttons">
                  <button 
                    className="action-btn primary"
                    onClick={() => setActiveTab('complaints')}
                  >
                    <span className="action-icon">📋</span>
                    View All Complaints
                  </button>
                  <button className="action-btn secondary">
                    <span className="action-icon">📊</span>
                    Generate Report
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
                  <span className="stats-badge">Total Complaints: {complaints.length}</span>
                  <button onClick={fetchHODData} className="refresh-btn">
                    🔄 Refresh
                  </button>
                </div>
              </div>

              {/* Problem Type Filter Navigation */}
              <div className="complaints-sub-nav">
                <button 
                  className={`sub-nav-btn ${activeComplaintsSubTab === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveComplaintsSubTab('all')}
                >
                  <span className="sub-nav-icon">📝</span>
                  All Complaints
                </button>
                <button 
                  className={`sub-nav-btn ${activeComplaintsSubTab === 'infrastructure' ? 'active' : ''}`}
                  onClick={() => setActiveComplaintsSubTab('infrastructure')}
                >
                  <span className="sub-nav-icon">🏗️</span>
                  Infrastructure
                </button>
                <button 
                  className={`sub-nav-btn ${activeComplaintsSubTab === 'administration' ? 'active' : ''}`}
                  onClick={() => setActiveComplaintsSubTab('administration')}
                >
                  <span className="sub-nav-icon">👨‍💼</span>
                  Administration
                </button>
                <button 
                  className={`sub-nav-btn ${activeComplaintsSubTab === 'examination' ? 'active' : ''}`}
                  onClick={() => setActiveComplaintsSubTab('examination')}
                >
                  <span className="sub-nav-icon">📝</span>
                  Examination
                </button>
                <button 
                  className={`sub-nav-btn ${activeComplaintsSubTab === 'library' ? 'active' : ''}`}
                  onClick={() => setActiveComplaintsSubTab('library')}
                >
                  <span className="sub-nav-icon">📚</span>
                  Library
                </button>
                <button 
                  className={`sub-nav-btn ${activeComplaintsSubTab === 'other' ? 'active' : ''}`}
                  onClick={() => setActiveComplaintsSubTab('other')}
                >
                  <span className="sub-nav-icon">❓</span>
                  Other
                </button>
              </div>

              <ComplaintsList 
                complaints={getFilteredComplaints()}
                showStudentInfo={true}
                showLikeOption={true}
              />
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="tab-content profile-tab">
              <h2 className="profile-title">HOD Profile</h2>
              <div className="profile-container">
                <div className="profile-card">
                  <div className="profile-header">
                    <div className="profile-avatar">
                      {hod?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="profile-info">
                      <h3>{hod?.name}</h3>
                      <p className="profile-role">Head of Department - {hod?.department}</p>
                    </div>
                  </div>
                  <div className="profile-details">
                    <div className="detail-row">
                      <div className="detail-item">
                        <label>Email</label>
                        <span>{hod?.email}</span>
                      </div>
                      <div className="detail-item">
                        <label>Department</label>
                        <span>{hod?.department}</span>
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
        </div>
      </main>
    </div>
  );
};

// Password Update Component
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

export default HODDashboard;