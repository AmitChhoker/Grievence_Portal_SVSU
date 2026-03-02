import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './components/HomePage'
import StudentRegister from './components/StudentRegister'
import Login from './components/Login'
import TeacherLogin from './components/TeacherLogin'
import StudentDashboard from './components/StudentDashboard'
import TeacherDashboard from './components/TeacherDashboard'
import HODLogin from './components/HODLogin'
import HODDashboard from './components/HODDashboard'
import DeanLogin from './components/DeanLogin'
import DeanDashboard from './components/DeanDashboard'
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register/student" element={<StudentRegister />} />
          <Route path="/login/teacher" element={<TeacherLogin />} />
          <Route path="/login" element={<Login />} />
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/teacher-login" element={<TeacherLogin />} />
          <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
          <Route path="/login/hod" element={<HODLogin />} />
          <Route path="/hod-dashboard" element={<HODDashboard />} />
          <Route path="/login/dean" element={<DeanLogin />} />
          <Route path="/dean-dashboard" element={<DeanDashboard />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App;