import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
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
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Password</label>
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
        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          <p>Don't have an account? Please contact the University Admin for credentials.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
