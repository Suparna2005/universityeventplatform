import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    studentNumber: '',
    department: '',
    semester: 1
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(
        formData.name,
        formData.email,
        formData.password,
        formData.studentNumber,
        formData.department,
        parseInt(formData.semester)
      );
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    }
    setLoading(false);
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
        maxWidth: '550px',
        padding: '3rem',
        background: 'rgba(255, 255, 255, 0.85)',
        zIndex: 10,
        margin: '2rem 0'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', color: 'var(--primary)', fontWeight: 800 }}>
            BRAINWARE
          </h2>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--secondary)', letterSpacing: '2px', textTransform: 'uppercase' }}>
            STUDENT REGISTRATION
          </h3>
        </div>

        {error && (
          <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Full Name</label>
              <input 
                type="text" 
                name="name"
                className="input-glass"
                placeholder="John Doe"
                value={formData.name} 
                onChange={handleChange}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Student ID Number</label>
              <input 
                type="text" 
                name="studentNumber"
                className="input-glass"
                placeholder="BWU/BTA/22/001"
                value={formData.studentNumber} 
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>University Email</label>
            <input 
              type="email" 
              name="email"
              className="input-glass"
              placeholder="student@test.edu"
              value={formData.email} 
              onChange={handleChange}
              required
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Password</label>
            <input 
              type="password" 
              name="password"
              className="input-glass"
              placeholder="••••••••"
              value={formData.password} 
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Department</label>
              <select name="department" className="input-glass" value={formData.department} onChange={handleChange} required>
                <option value="">Select Department</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Engineering">Engineering</option>
                <option value="Business">Business</option>
                <option value="Arts">Arts</option>
                <option value="Science">Science</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Semester</label>
              <input 
                type="number" 
                name="semester"
                className="input-glass"
                min="1" max="10"
                value={formData.semester} 
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '1rem', padding: '12px' }} disabled={loading}>
            {loading ? 'Registering...' : 'Create Student Account'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          <p>Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'none' }}>Log In Here</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
