import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

const HomePage = () => {
  const [showRegistrationOptions, setShowRegistrationOptions] = useState(false);
  const [showLoginOptions, setShowLoginOptions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleRegistrationClick = () => {
    if (isMobile) {
      setShowRegistrationOptions(!showRegistrationOptions);
    }
  };

  const handleLoginClick = () => {
    if (isMobile) {
      setShowLoginOptions(!showLoginOptions);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setShowRegistrationOptions(false);
    setShowLoginOptions(false);
  };

  // Complaint types data
  const complaintTypes = [
    {
      type: 'Infrastructure',
      icon: '🏗️',
      color: 'infra',
      subcategories: ['Building Issues', 'Furniture Problems', 'Electricity', 'Water Supply', 'Internet', 'Other Infrastructure']
    },
    {
      type: 'Administration',
      icon: '🏛️',
      color: 'admin',
      subcategories: ['Admission Issues', 'Fee Related', 'Documents', 'Certificate Delays', 'Other Administrative']
    },
    {
      type: 'Examination',
      icon: '📝',
      color: 'exam',
      subcategories: ['Late Results', 'Schedule Issues', 'Paper Problems', 'Hall Ticket', 'Other Examination']
    },
    {
      type: 'Library',
      icon: '📚',
      color: 'library',
      subcategories: ['Book Not Available', 'Book Condition', 'Digital Resources', 'Staff Behavior', 'Other Library Issues']
    },
    {
      type: 'Other Services',
      icon: '🔧',
      color: 'other',
      subcategories: ['Transportation', 'Cafeteria', 'Security', 'Hostel Amenities', 'General Complaints']
    }
  ];

  return (
    <div className="homepage">
      {/* Animated Background */}
      <div className="animated-bg">
        <div className="bg-shape shape-1"></div>
        <div className="bg-shape shape-2"></div>
        <div className="bg-shape shape-3"></div>
        <div className="bg-shape shape-4"></div>
      </div>

      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-image">
              {/* <img 
                src="/images/svsu-voice-action-logo.png" 
                alt="SVSU" 
                className="logo-img"
                onError={(e) => {
                  e.target.src = "";
                }}
              /> */}
            </div>
            <div className="logo-text-container">
              <h1 className="logo-text">SVSU</h1>
              {/* <p className="logo-subtitle">Grievance Redressal System</p> */}
            </div>
          </div>
          
          {/* Hamburger Menu for Mobile */}
          <button 
            className={`hamburger-menu ${isMenuOpen ? 'active' : ''}`}
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <nav className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
            <div className="nav-buttons">
              {/* Registration Dropdown */}
              <div className="dropdown-container">
                <button 
                  className="btn btn-register"
                  onMouseEnter={() => !isMobile && setShowRegistrationOptions(true)}
                  onClick={handleRegistrationClick}
                >
                  Registration ▼
                </button>
                
                {showRegistrationOptions && (
                  <div 
                    className="dropdown-menu"
                    onMouseEnter={() => !isMobile && setShowRegistrationOptions(true)}
                    onMouseLeave={() => !isMobile && setShowRegistrationOptions(false)}
                  >
                    <Link to="/register/student" className="dropdown-item" onClick={closeMenu}>
                      👨‍🎓 Student Registration
                    </Link>
                  </div>
                )}
              </div>

              {/* Login Dropdown */}
              <div className="dropdown-container">
                <button 
                  className="btn btn-login"
                  onMouseEnter={() => !isMobile && setShowLoginOptions(true)}
                  onClick={handleLoginClick}
                >
                  Login ▼
                </button>
                
                {showLoginOptions && (
                  <div 
                    className="dropdown-menu"
                    onMouseEnter={() => !isMobile && setShowLoginOptions(true)}
                    onMouseLeave={() => !isMobile && setShowLoginOptions(false)}
                  >
                    <Link to="/login" className="dropdown-item" onClick={closeMenu}>
                      👨‍🎓 Student Login
                    </Link>
                    <Link to="/login/teacher" className="dropdown-item" onClick={closeMenu}>
                      👨‍🏫 Teacher Login
                    </Link>
                    <Link to="/login/hod" className="dropdown-item" onClick={closeMenu}>
                      👨‍💼 HOD Login
                    </Link>
                    <Link to="/login/dean" className="dropdown-item" onClick={closeMenu}>
                      🎯 Dean Login
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Welcome to <span className="gradient-text">SVSU Voice & Action</span>
            </h1>
            <p className="hero-subtitle">
              Shri Vishwakarma Skill University - Where Your Voice Matters
            </p>
            <p className="hero-description">
              A comprehensive platform for students, faculty, and staff to voice concerns, 
              track resolutions, and ensure a better campus experience for everyone.
            </p>
            
            <div className="hero-buttons">
              <Link to="/register/student" className="cta-btn primary" onClick={closeMenu}>
                Get Started 🚀
              </Link>
              <div className="login-options">
                <Link to="/login" className="cta-btn secondary" onClick={closeMenu}>
                  Student Login
                </Link>
                <Link to="/login/teacher" className="cta-btn secondary" onClick={closeMenu}>
                  Teacher Login
                </Link>
                <Link to="/login/hod" className="cta-btn secondary" onClick={closeMenu}>
                  HOD Login
                </Link>
                <Link to="/login/dean" className="cta-btn secondary" onClick={closeMenu}>
                  Dean Login
                </Link>
              </div>
            </div>
          </div>
          
          <div className="hero-visual">
            <div className="floating-card">
              <div className="card-inner">
                <div className="card-front">
                  <div className="card-content-split">
                    <div className="card-left">
                      <img 
                        src="/images/svsu-voice-action-logo.png" 
                        alt="SVSU Voice & Action" 
                        className="card-logo"
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/120x120/2563eb/white?text=SVSU+Voice";
                        }}
                      />
                    </div>
                    <div className="card-right">
                      <h3>Quick Resolution</h3>
                      <p>Your concerns matter to us</p>
                    </div>
                  </div>
                </div>
                <div className="card-back">
                  <div className="card-content-split">
                    <div className="card-left">
                      <img 
                        src="https://svsu.ac.in/assets/imgs/svsu_logo.png" 
                        alt="SVSU Official Logo" 
                        className="card-logo"
                      />
                    </div>
                    <div className="card-right">
                      <h3>24/7 Support</h3>
                      <p>Always here to help</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Access Section */}
      <section className="quick-access">
        <div className="container">
          <h2 className="section-title">Quick Access</h2>
          <div className="access-grid">
            <Link to="/login" className="access-card student-card" onClick={closeMenu}>
              <div className="access-icon">👨‍🎓</div>
              <h3>Student Portal</h3>
              <p>Login to submit and track your grievances</p>
              <span className="access-link">Go to Student Login →</span>
            </Link>

            <Link to="/login/teacher" className="access-card teacher-card" onClick={closeMenu}>
              <div className="access-icon">👨‍🏫</div>
              <h3>Teacher Portal</h3>
              <p>Access teacher dashboard and manage complaints</p>
              <span className="access-link">Go to Teacher Login →</span>
            </Link>

            <Link to="/login/hod" className="access-card hod-card" onClick={closeMenu}>
              <div className="access-icon">👨‍💼</div>
              <h3>HOD Portal</h3>
              <p>Department management and oversight</p>
              <span className="access-link">Go to HOD Login →</span>
            </Link>

            <Link to="/register/student" className="access-card register-card" onClick={closeMenu}>
              <div className="access-icon">📝</div>
              <h3>New Student?</h3>
              <p>Register as a new student to get started</p>
              <span className="access-link">Register Now →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Complaint Types Section */}
      <section className="complaint-types">
        <div className="container">
          <h2 className="section-title">Types of Complaints We Handle</h2>
          <div className="cards-grid">
            {complaintTypes.map((complaint, index) => (
              <div key={index} className={`card-3d ${complaint.color}-card`}>
                <div className="card-content">
                  <div className="card-icon">{complaint.icon}</div>
                  <h3 className="card-title">{complaint.type}</h3>
                  <ul className="card-list">
                    {complaint.subcategories.map((subcategory, subIndex) => (
                      <li key={subIndex}>{subcategory}</li>
                    ))}
                  </ul>
                  <div className="card-glow"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About University Section */}
      <section className="about-university">
        <div className="container">
          <div className="about-content">
            <div className="about-text">
              <div className="university-header">
                <img 
                  src="https://svsu.ac.in/assets/imgs/svsu_logo.png" 
                  alt="Shri Vishwakarma Skill University" 
                  className="university-logo"
                />
                <h2 className="section-title">About Shri Vishwakarma Skill University</h2>
              </div>
              <p className="about-description">
                Established with a vision to create world-class skill development opportunities, 
                SVSU stands as a beacon of excellence in vocational education. Our commitment 
                to innovation, industry partnerships, and student success makes us one of the premier 
                skill universities in the region.
              </p>
              
              <div className="university-motto">
                <h3>"Not Only Shoot"</h3>
                <p>Empowering students with practical skills and theoretical knowledge for real-world success.</p>
              </div>
              
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-number">5000+</div>
                  <div className="stat-label">Students</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">200+</div>
                  <div className="stat-label">Faculty</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">50+</div>
                  <div className="stat-label">Programs</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">25+</div>
                  <div className="stat-label">Departments</div>
                </div>
              </div>
            </div>
            
            <div className="about-visual">
              <div className="campus-image">
                <img 
                  src="https://design.svsu.ac.in/assets/images/campus.jpg" 
                  alt="SVSU Campus" 
                  className="university-campus"
                />
                <div className="campus-overlay">
                  <h4>SVSU Campus</h4>
                  <p>Dudhola, Palwal</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <div className="footer-logo">
                <img 
                  src="/images/svsu-voice-action-logo.png" 
                  alt="SVSU Voice & Action" 
                  className="footer-logo-img"
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/40x40/2563eb/white?text=SVSU";
                  }}
                />
                <div>
                  <h3>SVSU Voice & Action</h3>
                  <p>Grievance Redressal System</p>
                </div>
              </div>
              <p>Ensuring a better campus experience through effective communication and quick resolution.</p>
            </div>
            
            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul>
                <li><Link to="/" onClick={closeMenu}>Home</Link></li>
                <li><Link to="/login" onClick={closeMenu}>Student Login</Link></li>
                <li><Link to="/login/teacher" onClick={closeMenu}>Teacher Login</Link></li>
                <li><Link to="/login/hod" onClick={closeMenu}>HOD Login</Link></li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h4>Contact Info</h4>
              <p>📧 grievances@svsu.ac.in</p>
              <p>📞 +91-XXXXX-XXXXX</p>
              <p>🏛️ Administrative Block, SVSU Campus, Dudhola, Palwal</p>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>&copy; 2024 Shri Vishwakarma Skill University, Dudhola Palwal. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Close dropdowns when clicking outside */}
      {(showRegistrationOptions || showLoginOptions) && (
        <div 
          className="dropdown-overlay"
          onClick={() => {
            setShowRegistrationOptions(false);
            setShowLoginOptions(false);
          }}
        />
      )}
    </div>
  );
};

export default HomePage;