import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './DeanDashboard.css';

const DeanDashboard = () => {
  const [dean, setDean] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeComplaintsSubTab, setActiveComplaintsSubTab] = useState('all');
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
    initializeDashboard();
  }, [activeTab]);

  const initializeDashboard = async () => {
    try {
      setIsLoading(true);
      
      const deanData = JSON.parse(localStorage.getItem('dean'));
      const token = localStorage.getItem('token');
      
      if (!deanData || !token || deanData.role !== 'dean') {
        navigate('/dean-login');
        return;
      }
      
      setDean(deanData);
      await fetchDeanData();
      
    } catch (error) {
      console.error('❌ Dashboard initialization failed:', error);
      handleAutoLogout(error.message || 'Please login as Dean');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDeanData = async () => {
    try {
      setError('');
      const token = localStorage.getItem('token');
      
      // Fetch stats for dashboard
      if (activeTab === 'dashboard') {
        const statsResponse = await axios.get('http://localhost:5000/api/complaints/dean-stats', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (statsResponse.data.success) {
          setStats(statsResponse.data.stats);
        }
      }

      // Fetch complaints for complaints tab
      if (activeTab === 'complaints') {
        const complaintsResponse = await axios.get('http://localhost:5000/api/complaints/dean-complaints', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (complaintsResponse.data.success) {
          setComplaints(complaintsResponse.data.complaints || []);
        }
      }

    } catch (error) {
      console.error('❌ Error fetching dean data:', error);
      
      if (error.response?.status === 401) {
        handleAutoLogout('Session expired. Please login again.');
      } else if (error.response?.status === 403) {
        setError('Access denied. You are not authorized as Dean.');
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Error loading data. Please try again.');
      }
    }
  };

  const handleAutoLogout = (message = 'Session expired. Please login again.') => {
    console.log('🔒 Auto logout:', message);
    
    localStorage.removeItem('token');
    localStorage.removeItem('dean');
    localStorage.removeItem('userRole');
    
    setTimeout(() => {
      alert(message);
      navigate('/dean-login');
    }, 100);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('dean');
      localStorage.removeItem('userRole');
      navigate('/dean-login');
    }
  };

  const handleResolveComplaint = async (complaintId) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.put(
        `http://localhost:5000/api/complaints/resolve/${complaintId}`,
        { resolvedBy: dean?.name },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Complaint resolved successfully!');
        await fetchDeanData();
      }
    } catch (error) {
      console.error('Error resolving complaint:', error);
      if (error.response?.status === 401) {
        handleAutoLogout('Session expired. Please login again.');
      } else {
        alert('Error resolving complaint. Please try again.');
      }
    }
  };

  const handleStatusChange = async (complaintId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.put(
        `http://localhost:5000/api/complaints/update-status/${complaintId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      await fetchDeanData();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status. Please try again.');
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

  const ComplaintsList = ({ complaints, showStudentInfo = true }) => (
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
                {complaint.currentHandler === 'dean' && complaint.status !== 'resolved' && (
                  <button 
                    className="action-btn small primary"
                    onClick={() => handleResolveComplaint(complaint.complaintId)}
                  >
                    ✅ Mark Resolved
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

                {complaint.status === 'resolved' && complaint.resolvedBy && (
                  <div className="resolved-info">
                    <span className="resolved-by">Resolved by: {complaint.resolvedBy}</span>
                    <span className="resolved-date">
                      {complaint.resolvedDate ? formatDate(complaint.resolvedDate) : 'Recently'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // if (isLoading) {
  //   return (
  //     <div className="dean-loading-container">
  //       <div className="dean-loading-spinner"></div>
  //       <h2>Loading Dean Dashboard...</h2>
  //       <p>Please wait while we load your data</p>
  //     </div>
  //   );
  // }

  return (
    <div className="dean-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-container">
          <div className="header-main">
            <div className="logo-section">
              <div className="logo">🎓</div>
              <div className="title-section">
                <h1 className="header-title">Dean Dashboard</h1>
                <p className="header-subtitle">SVSU Grievance Management System</p>
              </div>
            </div>
          </div>
          <div className="user-section">
            <div className="user-info">
              <div className="user-avatar">
                {dean?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                <span className="user-name">{dean?.name}</span>
                <span className="user-role">Dean</span>
              </div>
            </div>
            <button onClick={handleLogout} className="logout-btn">
              <span className="logout-icon">🚪</span>
              Logout
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
          </div>
          <button onClick={() => setError('')} className="error-close">×</button>
        </div>
      )}

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

      <main className="dashboard-content">
        <div className="content-container">
          {activeTab === 'dashboard' && (
            <div className="tab-content dashboard-tab">
              <div className="welcome-section">
                <div className="welcome-card">
                  <div className="welcome-content">
                    <h2>Welcome, {dean?.name}! 🎓</h2>
                    <p>As Dean, you have the highest authority in the complaint management system.</p>
                    <div className="user-info-grid">
                      <div className="info-item">
                        <span className="info-label">Role</span>
                        <span className="info-value">Dean - Highest Authority</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Email</span>
                        <span className="info-value">{dean?.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="welcome-graphic">
                    <div className="floating-icons">
                      <div className="icon">🎓</div>
                      <div className="icon">⚖️</div>
                      <div className="icon">✅</div>
                      <div className="icon">📊</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="stats-section">
                <h2 className="section-title">Complaint Statistics</h2>
                <div className="stats-grid">
                  <div className="stat-card total">
                    <div className="stat-icon">📥</div>
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
                  Complaints Forwarded by HODs
                </h2>
                <div className="complaints-stats">
                  <span className="stats-badge">Total Complaints: {complaints.length}</span>
                  <button onClick={fetchDeanData} className="refresh-btn">
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
              />
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="tab-content profile-tab">
              <h2 className="profile-title">Dean Profile</h2>
              <div className="profile-container">
                <div className="profile-card">
                  <div className="profile-header">
                    <div className="profile-avatar">
                      {dean?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="profile-info">
                      <h3>{dean?.name}</h3>
                      <p className="profile-role">Dean - Highest Authority</p>
                    </div>
                  </div>
                  <div className="profile-details">
                    <div className="detail-row">
                      <div className="detail-item">
                        <label>Email</label>
                        <span>{dean?.email}</span>
                      </div>
                      <div className="detail-item">
                        <label>Role</label>
                        <span>Dean</span>
                      </div>
                    </div>
                    <div className="detail-row">
                      <div className="detail-item full-width">
                        <label>Account Status</label>
                        <span className="status-active">Active</span>
                      </div>
                    </div>
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

export default DeanDashboard;