import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './HODLogin.css';

const HODLogin = () => {
    const [formData, setFormData] = useState({
        emailId: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            console.log('🔄 Sending HOD login request...', formData);
            
            const response = await axios.post('http://localhost:5000/api/auth/login/hod', formData);
            
            console.log('✅ HOD login response:', response.data);

            if (response.data.success) {
                setMessageType('success');
                setMessage('HOD Login successful! Redirecting...');
                
                // ✅ Store token and HOD data consistently
                localStorage.setItem('token', response.data.token); // Changed from 'hodToken'
                localStorage.setItem('hod', JSON.stringify(response.data.hod));
                localStorage.setItem('userRole', 'hod');
                
                console.log('📝 Stored in localStorage:', {
                    token: response.data.token,
                    hod: response.data.hod,
                    role: 'hod'
                });

                // Redirect to HOD dashboard after 1 second
                setTimeout(() => {
                    console.log('🎯 Redirecting to HOD dashboard...');
                    navigate('/hod-dashboard');
                }, 1000);
            }
        } catch (error) {
            console.error('❌ HOD login error:', error);
            setMessageType('error');
            if (error.response && error.response.data) {
                setMessage(error.response.data.message || 'Login failed. Please try again.');
            } else {
                setMessage('Network error. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="hod-login-container">
            <div className="hod-login-card">
                <div className="login-header">
                    <h2>👨‍💼 HOD Login</h2>
                    <p className="login-subtitle">Head of Department Portal Access</p>
                </div>
                
                {message && (
                    <div className={`message ${messageType}`}>
                        {message}
                        {messageType === 'success' && ' Redirecting...'}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="hod-login-form">
                    <div className="form-group">
                        <label htmlFor="emailId">Email Address</label>
                        <input
                            type="email"
                            id="emailId"
                            name="emailId"
                            value={formData.emailId}
                            onChange={handleChange}
                            required
                            placeholder="Enter your registered email"
                            className="form-input"
                            disabled={loading}
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
                            disabled={loading}
                        />
                    </div>

                    <button 
                        type="submit" 
                        className={`login-btn ${loading ? 'loading' : ''}`}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                Logging in...
                            </>
                        ) : (
                            'Login as HOD'
                        )}
                    </button>
                </form>

                <div className="login-links">
                    <Link to="/forgot-password" className="forgot-password">
                        Forgot Password?
                    </Link>
                    <div className="switch-login-options">
                        <p>
                            Teacher? <Link to="/login/teacher">Login here</Link>
                        </p>
                        <p>
                            Student? <Link to="/login">Login here</Link>
                        </p>
                    </div>
                </div>

                <div className="login-info">
                    <p><strong>Note:</strong> Only registered Head of Department can login here.</p>
                    <p>Contact administration for HOD account registration.</p>
                </div>
            </div>
        </div>
    );
};

export default HODLogin;