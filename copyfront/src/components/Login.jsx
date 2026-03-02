import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AuthForms.css';

const Login = () => {
  const [formData, setFormData] = useState({
    emailId: '',
    password: ''
  });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Enhanced token validation
    const validateToken = async () => {
      const user = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (user && token) {
        try {
          // Verify token is still valid by making a test request
          const response = await axios.get('http://localhost:5000/api/auth/verify-token', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data.valid) {
            setMessage('🔄 Already logged in! Redirecting...');
            setTimeout(() => {
              const userData = JSON.parse(user);
              if (userData.role === 'student') {
                navigate('/student-dashboard');
              } else {
                navigate('/teacher-dashboard');
              }
            }, 1000);
          }
        } catch (error) {
          // Token is invalid, clear storage
          console.log('Token validation failed, clearing storage');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    };

    validateToken();
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setDebugInfo('');

    if (!formData.emailId || !formData.password) {
      setMessage('❌ Please fill in all fields');
      setIsError(true);
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔄 Sending login request...');
      setDebugInfo('Sending request to server...');
      
      const loginData = {
        emailId: formData.emailId.trim().toLowerCase(),
        password: formData.password
      };

      console.log('📤 Login data:', loginData);

      const response = await axios.post(
        'http://localhost:5000/api/auth/login',
        loginData,
        {
          headers: { 
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      console.log('✅ Login response:', response.data);

      if (response.data.success) {
        setMessage('✅ Login successful! Redirecting...');
        setIsError(false);
        
        // Store token and user data securely
        const token = response.data.token;
        const user = response.data.user;
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Set axios default header for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        setDebugInfo(`Logged in as: ${user.name} (${user.role}) - Token stored`);
        
        // Test token immediately
        await testTokenAfterLogin(token);
        
        setTimeout(() => {
          if (user.role === 'student') {
            navigate('/student-dashboard');
          } else {
            navigate('/teacher-dashboard');
          }
        }, 1500);
      } else {
        setMessage(response.data.message || 'Login failed');
        setIsError(true);
      }
    } catch (error) {
      console.error('❌ Login error details:', error);
      handleLoginError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginError = (error) => {
    let errorMessage = 'Login failed. ';
    let debugMessage = '';
    
    if (error.code === 'ECONNREFUSED') {
      errorMessage += 'Cannot connect to server. Please make sure the backend is running on localhost:5000';
      debugMessage = 'Backend server is not running or not accessible';
    } else if (error.response) {
      errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      debugMessage = `Server responded with status: ${error.response.status}`;
      console.log('📡 Server response:', error.response.data);
    } else if (error.request) {
      errorMessage += 'No response from server. Please check if backend is running.';
      debugMessage = 'Request was sent but no response received from server';
    } else if (error.message.includes('Network Error')) {
      errorMessage += 'Network error. Please check your internet connection and ensure backend is running.';
      debugMessage = 'Network error - check backend server';
    } else if (error.message.includes('timeout')) {
      errorMessage += 'Request timeout. Server is taking too long to respond.';
      debugMessage = 'Request timeout - server might be overloaded';
    } else {
      errorMessage += error.message;
      debugMessage = error.message;
    }
    
    setMessage(errorMessage);
    setDebugInfo(debugMessage);
    setIsError(true);
  };

  const testTokenAfterLogin = async (token) => {
    try {
      console.log('🔐 Testing token after login...');
      const response = await axios.get('http://localhost:5000/api/complaints/my-complaints', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Token test successful:', response.data);
      return true;
    } catch (error) {
      console.error('❌ Token test failed:', error.response?.data || error.message);
      return false;
    }
  };

  const testConnection = async () => {
    setMessage('');
    setDebugInfo('');
    
    const endpoints = [
      'http://localhost:5000/api/health',
      'http://localhost:5000/api/test',
      'http://localhost:5000/health'
    ];

    for (const endpoint of endpoints) {
      try {
        setDebugInfo(`Testing: ${endpoint}`);
        const response = await axios.get(endpoint, { timeout: 5000 });
        setMessage(`✅ Backend connected! (${endpoint})`);
        setDebugInfo(`Server: ${response.data.message || 'Healthy'}`);
        setIsError(false);
        return;
      } catch (error) {
        console.log(`❌ ${endpoint} failed:`, error.message);
        continue;
      }
    }
    
    setMessage('❌ All connection attempts failed');
    setDebugInfo('Backend server is not running on port 5000. Run: npm start in backend folder');
    setIsError(true);
  };

  const clearStorage = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setMessage('✅ Local storage cleared!');
    setDebugInfo('Token and user data removed from browser');
    setIsError(false);
  };

  const showTokenInfo = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      const userData = JSON.parse(user);
      setDebugInfo(`Token: ${token.substring(0, 20)}... | User: ${userData.name} (${userData.role})`);
    } else {
      setDebugInfo('No token or user data found in storage');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <div className="form-header">
          <h2>Welcome Back</h2>
          <p>Access your SVSU Grievance System account</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '15px' }}>
            <button 
              onClick={testConnection}
              className="test-connection-btn"
            >
              Test Backend Connection
            </button>
            <button 
              onClick={clearStorage}
              className="test-connection-btn"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              Clear Storage
            </button>
            <button 
              onClick={showTokenInfo}
              className="test-connection-btn"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
            >
              Show Token Info
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="email"
              name="emailId"
              className="form-input"
              value={formData.emailId}
              onChange={handleChange}
              required
              placeholder="Enter your Official Email ID (University Provided)"
            />
          </div>

          <div className="form-group">
            <input
              type="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
            />
          </div>

          <button 
            type="submit" 
            className={`submit-btn ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Logging in...
              </>
            ) : (
              'Login to Dashboard'
            )}
          </button>

          {message && (
            <div className={`message ${isError ? 'error' : 'success'}`}>
              {message}
            </div>
          )}

          {debugInfo && (
            <div style={{
              padding: '12px',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              margin: '10px 0',
              fontSize: '12px',
              color: '#374151',
              fontFamily: 'monospace',
              maxHeight: '100px',
              overflow: 'auto'
            }}>
              <strong>Debug Info:</strong> {debugInfo}
            </div>
          )}

          <div className="auth-links">
            <p>
              Don't have an account?{' '}
              <Link to="/register/student" className="auth-link">
                Register as Student
              </Link>
            </p>
            <p>
              Are you a teacher?{' '}
              <Link to="/register/teacher" className="auth-link">
                Register as Teacher
              </Link>
            </p>
            <p>
              <Link to="/teacher-login" className="auth-link">
                Teacher Login
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;