import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './TeacherLogin.css'; // Optional CSS file

const TeacherLogin = () => {
    const [formData, setFormData] = useState({
        emailId: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); // 'success' or 'error'

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
            const response = await axios.post('http://localhost:5000/api/auth/login/teacher', formData);
            
            if (response.data.success) {
                setMessageType('success');
                setMessage('Login successful! Redirecting...');
                
                // Store token and teacher data in localStorage
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('teacher', JSON.stringify(response.data.teacher));
                
                // Redirect to teacher dashboard after 1 second
                setTimeout(() => {
                    navigate('/teacher-dashboard');
                }, 1000);
            }
        } catch (error) {
            setMessageType('error');
            if (error.response && error.response.data) {
                setMessage(error.response.data.message);
            } else {
                setMessage('Network error. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="teacher-login-container">
            <div className="teacher-login-card">
                <h2>Teacher Login</h2>
                <p className="login-subtitle">Enter your credentials to access teacher portal</p>
                
                {message && (
                    <div className={`message ${messageType}`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="teacher-login-form">
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
                        />
                    </div>

                    <button 
                        type="submit" 
                        className="login-btn"
                        disabled={loading}
                    >
                        {loading ? 'Logging in...' : 'Login as Teacher'}
                    </button>
                </form>

                <div className="login-links">
                    <Link to="/forgot-password" className="forgot-password">
                        Forgot Password?
                    </Link>
                    <p className="switch-login">
                        Student? <Link to="/login">Login here</Link>
                    </p>
                </div>

                <div className="login-info">
                    <p><strong>Note:</strong> Only registered teachers can login. Contact administration if you need access.</p>
                </div>
            </div>
        </div>
    );
};

export default TeacherLogin;