import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const baseURL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000');

  // Modals state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqRole, setReqRole] = useState('student');
  const [reqName, setReqName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqDept, setReqDept] = useState('');
  const [reqYear, setReqYear] = useState('');
  const [reqSection, setReqSection] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${baseURL}/api/auth/forgot-password`, { email: forgotEmail });
      alert('If the email exists, a new temporary password has been sent to it.');
      setShowForgotModal(false);
      setForgotEmail('');
    } catch (err) {
      alert(err.response?.data?.detail || 'Error resetting password');
    }
  };



  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'url("https://upload.wikimedia.org/wikipedia/commons/8/81/Brainware-university.jpg") center/cover no-repeat',
      position: 'relative'
    }}>
      {/* Dark overlay for better readability */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 45, 98, 0.7)' }}></div>

      <div className="glass-card animate-fade-in" style={{
        position: 'relative',
        width: '100%',
        maxWidth: '450px',
        padding: '3rem',
        background: 'rgba(255, 255, 255, 0.85)',
        zIndex: 10
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', color: 'var(--primary)', fontWeight: 800 }}>
            BRAINWARE
          </h2>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--secondary)', letterSpacing: '2px', textTransform: 'uppercase' }}>
            UNIVERSITY
          </h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '1rem', fontStyle: 'italic' }}>Event Management Portal</p>
        </div>

        {error && (
          <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>University Email</label>
            <input 
              type="email" 
              className="input-glass"
              placeholder="student001@test.edu"
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Password</label>
              <button type="button" onClick={() => setShowForgotModal(true)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>Forgot Password?</button>
            </div>
            <input 
              type="password" 
              className="input-glass"
              placeholder="••••••••"
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: '1rem', padding: '12px' }}>
            Sign In to Dashboard
          </button>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 99, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', width: '90%', maxWidth: '400px', background: 'white' }}>
            <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Reset Password</h3>
            <p style={{ fontSize: '0.9rem', color: 'gray', marginBottom: '1.5rem' }}>Enter your registered email and we will send a new temporary password.</p>
            <form onSubmit={handleForgotPassword}>
              <input type="email" placeholder="Your Email" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="input-glass" style={{ marginBottom: '1rem', width: '100%' }} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Send</button>
                <button type="button" onClick={() => setShowForgotModal(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
