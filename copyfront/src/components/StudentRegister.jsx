import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE, API_ENDPOINTS } from '../config';
import './StudentRegister.css';

const StudentRegister = () => {
  const [formData, setFormData] = useState({
    name: '',
    courseName: '',
    emailId: '',
    password: '',
    confirmPassword: '',
    rollno: '',
    department: '',
    semester: '', // Added semester to initial state
    year: '' // Added year to initial state
  });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match');
      setIsError(true);
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setMessage('Password must be at least 6 characters long');
      setIsError(true);
      setIsLoading(false);
      return;
    }

    // Validate semester and year
    if (!formData.semester || !formData.year) {
      setMessage('Semester and Year are required');
      setIsError(true);
      setIsLoading(false);
      return;
    }

    try {
      console.log('Sending registration request to:', API_BASE + API_ENDPOINTS.STUDENT_REGISTER);
      console.log('Registration data:', formData);
      
      const response = await axios.post(
        API_BASE + API_ENDPOINTS.STUDENT_REGISTER,
        {
          name: formData.name,
          courseName: formData.courseName,
          emailId: formData.emailId,
          password: formData.password,
          rollno: formData.rollno,
          department: formData.department,
          semester: formData.semester, // Added semester
          year: formData.year, // Added year
          phoneNumber: '' // You can add phone number field later if needed
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      console.log('Registration response:', response.data);

      if (response.data.success) {
        setMessage('🎉 Registration Successful! Redirecting to login...');
        setIsError(false);
        
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.message 
        || error.message 
        || 'Registration failed. Please try again.';
      setMessage(errorMessage);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="floating-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
        <div className="shape shape-4"></div>
      </div>
      
      <div className="auth-form">
        <div className="form-header">
          <div className="logo-container">
            <div className="logo">SVSU</div>
          </div>
          <h2>Student Registration</h2>
          <p>Join SVSU Grievance System</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              name="name"
              className="form-input"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder='Enter your Full name'
            />
            <div className="input-underline"></div>
          </div>

          <div className="form-group">
            <input
              type="text"
              name="courseName"
              className="form-input"
              value={formData.courseName}
              onChange={handleChange}
              required
              placeholder='Enter your Course name'
            />
            <div className="input-underline"></div>
          </div>

          <div className="form-group">
            <input
              type="email"
              name="emailId"
              className="form-input"
              value={formData.emailId}
              onChange={handleChange}
              required
              placeholder='Enter your Email ID'
            />
            <div className="input-underline"></div>
          </div>

          <div className="form-group">
            <input
              type="text"
              name="rollno"
              className="form-input"
              value={formData.rollno}
              onChange={handleChange}
              required
              placeholder='Enter your Roll Number'
            />
            <div className="input-underline"></div>
          </div>

          <div className="form-group">
            <select
              name="department"
              className="form-select"
              value={formData.department}
              onChange={handleChange}
              required
            >
              <option value="">Select Department *</option>
              <option value="CSE">Computer Science & Engineering</option>
              <option value="ECE">Electronics & Communication</option>
              <option value="ME">Mechanical Engineering</option>
              <option value="CE">Civil Engineering</option>
              <option value="EE">Electrical Engineering</option>
            </select>
            <div className="select-arrow">▼</div>
          </div>

          {/* Fixed Semester Field */}
          <div className="form-group">
            <input 
              type="number"
              name="semester"
              className="form-input"
              value={formData.semester}
              onChange={handleChange}
              required 
              placeholder='Enter Your Semester'
              min="1"
              max="8"
            />
            <div className="input-underline"></div>
          </div>

          {/* Fixed Year Field */}
          <div className="form-group">
            <input 
              type="number"
              name="year"
              className="form-input"
              value={formData.year}
              onChange={handleChange}
              required 
              placeholder='Enter Your Year'
              // min="1"
              // max="4"
            />
            <div className="input-underline"></div>
          </div>

          <div className="form-group">
            <input
              type="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder='Enter your Password'
            />
            <div className="input-underline"></div>
          </div>

          <div className="form-group">
            <input
              type="password"
              name="confirmPassword"
              className="form-input"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder='Confirm your Password'
            />
            <div className="input-underline"></div>
          </div>

          <button 
            type="submit" 
            className={`submit-btn ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Creating Account...
              </>
            ) : (
              <>
                <span className="btn-text">Create Student Account</span>
                <span className="btn-icon">🚀</span>
              </>
            )}
          </button>

          {message && (
            <div className={`message ${isError ? 'error' : 'success'}`}>
              <div className="message-icon">
                {isError ? '❌' : '✅'}
              </div>
              <span>{message}</span>
            </div>
          )}

          <div className="auth-links">
            <p>
              Already have an account? <Link to="/login" className="auth-link">Login here</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentRegister;