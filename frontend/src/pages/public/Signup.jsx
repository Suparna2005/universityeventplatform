import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpenCheck } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import PortalBrand from '../../components/PortalBrand';

const Signup = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', studentNumber: '', department: '', semester: 1 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (event) => setFormData((previous) => ({ ...previous, [event.target.name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(formData.name, formData.email, formData.password, formData.studentNumber, formData.department, parseInt(formData.semester, 10));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell auth-shell-signup">
      <section className="auth-story-panel">
        <div className="auth-story-inner">
          <PortalBrand portal="University Portal" />
          <div className="auth-story-copy">
            <span className="auth-kicker"><BookOpenCheck size={15} /> YOUR CAMPUS STARTS HERE</span>
            <h1>Find your people. Join in.</h1>
            <p>Create your student account to register for events, join clubs, and keep track of your university activities.</p>
          </div>
          <small className="auth-story-footer">Brainware University · Event Management Portal</small>
        </div>
        <div className="auth-decoration auth-decoration-one" />
        <div className="auth-decoration auth-decoration-two" />
      </section>

      <section className="auth-form-panel auth-signup-panel">
        <div className="auth-form-card auth-signup-card">
          <div className="auth-mobile-brand"><PortalBrand portal="University Portal" /></div>
          <span className="ui-eyebrow">STUDENT REGISTRATION</span>
          <h2>Create your account</h2>
          <p className="auth-intro">Use your university details to get started.</p>
          {error && <div className="auth-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form auth-signup-form">
            <div className="auth-fields-two">
              <div className="ui-form-field"><label htmlFor="signup-name">Full name</label><input id="signup-name" type="text" name="name" className="input-glass" autoComplete="name" placeholder="Your full name" value={formData.name} onChange={handleChange} required /></div>
              <div className="ui-form-field"><label htmlFor="signup-student-number">Student ID number</label><input id="signup-student-number" type="text" name="studentNumber" className="input-glass" placeholder="BWU/BTA/22/001" value={formData.studentNumber} onChange={handleChange} required /></div>
            </div>
            <div className="ui-form-field"><label htmlFor="signup-email">University email</label><input id="signup-email" type="email" name="email" className="input-glass" autoComplete="email" placeholder="name@brainwareuniversity.ac.in" value={formData.email} onChange={handleChange} required /></div>
            <div className="ui-form-field"><label htmlFor="signup-password">Password</label><input id="signup-password" type="password" name="password" className="input-glass" autoComplete="new-password" placeholder="At least 6 characters" value={formData.password} onChange={handleChange} required minLength={6} /></div>
            <div className="auth-fields-department">
              <div className="ui-form-field"><label htmlFor="signup-department">Department</label><select id="signup-department" name="department" className="input-glass" value={formData.department} onChange={handleChange} required><option value="">Select department</option><option value="Computer Science">Computer Science</option><option value="Engineering">Engineering</option><option value="Business">Business</option><option value="Arts">Arts</option><option value="Science">Science</option></select></div>
              <div className="ui-form-field"><label htmlFor="signup-semester">Semester</label><input id="signup-semester" type="number" name="semester" className="input-glass" min="1" max="10" value={formData.semester} onChange={handleChange} required /></div>
            </div>
            <button type="submit" className="btn-primary auth-submit" disabled={loading}>{loading ? 'Creating account…' : 'Create student account'} {!loading && <ArrowRight size={17} />}</button>
          </form>
          <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </section>
    </main>
  );
};

export default Signup;
