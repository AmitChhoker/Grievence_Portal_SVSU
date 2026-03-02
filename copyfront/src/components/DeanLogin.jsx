import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './DeanLogin.css';

const DeanLogin = () => {
  const [formData, setFormData] = useState({
    emailId: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('🎓 Attempting Dean login...');
      
      const response = await axios.post('http://localhost:5000/api/auth/login/dean', formData);
      
      if (response.data.success) {
        console.log('✅ Dean login successful:', response.data);
        
        const { token, dean } = response.data;
        
        // ✅ Use consistent localStorage keys like other dashboards
        localStorage.setItem('token', token);
        localStorage.setItem('dean', JSON.stringify(dean));
        localStorage.setItem('userRole', 'dean');
        
        console.log('💾 Stored Dean data:', dean);
        console.log('🔐 Stored token:', token);
        
        // ✅ Navigate directly to dashboard without complex verification
        console.log('✅ Login successful, navigating to dean dashboard...');
        navigate('/dean-dashboard');
        
      } else {
        setError(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('❌ Dean login error:', error);
      
      // Clear storage on error
      localStorage.removeItem('token');
      localStorage.removeItem('dean');
      localStorage.removeItem('userRole');
      
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.message) {
        setError(error.message);
      } else if (error.code === 'NETWORK_ERROR') {
        setError('Network error. Please check if the server is running.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="dean-login-container">
      <div className="dean-login-card">
        <div className="login-header">
          <div className="login-icon">🎓</div>
          <h1>Dean Login</h1>
          <p>Access the highest authority dashboard</p>
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="emailId">Email Address</label>
            <input
              type="email"
              id="emailId"
              name="emailId"
              value={formData.emailId}
              onChange={handleChange}
              required
              placeholder="Enter your dean email address"
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <button 
            type="submit" 
            className="login-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Logging in...
              </>
            ) : (
              '🚪 Login as Dean'
            )}
          </button>
        </form>

        <div className="login-footer">
          <button 
            onClick={handleBackToHome}
            className="back-btn"
            disabled={isLoading}
          >
            ← Back to Home
          </button>
          <p><strong>Note:</strong> Use only Dean credentials. Other logins will not work here.</p>
        </div>
      </div>
    </div>
  );
};

export default DeanLogin;