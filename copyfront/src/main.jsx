import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

console.log('🚀 main.jsx is starting...');

// Simple error boundary for development
const SimpleApp = () => {
  return (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

try {
  console.log('🎯 Creating React root...');
  const container = document.getElementById('root');
  
  if (!container) {
    throw new Error('❌ Could not find element with id "root"');
  }
  
  console.log('✅ Root element found, creating root...');
  const root = ReactDOM.createRoot(container);
  
  console.log('🎬 Rendering App...');
  root.render(<SimpleApp />);
  
  console.log('✅ React app rendered successfully!');
} catch (error) {
  console.error('💥 Fatal error in main.jsx:', error);
  
  // Show error on screen
  const container = document.getElementById('root');
  if (container) {
    container.innerHTML = `
      <div style="
        padding: 50px; 
        text-align: center; 
        background: #dc3545; 
        color: white; 
        font-family: Arial, sans-serif;
        min-height: 100vh;
      ">
        <h1>🚨 React App Crash</h1>
        <p><strong>Error:</strong> ${error.message}</p>
        <p>Check the browser console for details</p>
        <button onclick="window.location.reload()" style="
          padding: 10px 20px; 
          background: white; 
          color: #dc3545; 
          border: none; 
          border-radius: 5px; 
          cursor: pointer;
          margin: 10px;
        ">
          Reload Page
        </button>
      </div>
    `;
  }
}