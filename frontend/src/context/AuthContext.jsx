import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const baseURL = '';

  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await axios.get(`${baseURL}/api/auth/me`);
          setUser(response.data);
        } catch (error) {
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };
    checkLoggedIn();
  }, [baseURL]);

  const login = async (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email); // OAuth2 requires 'username' field, but we parse it to email
    formData.append('password', password);

    // Wait, in auth.py we used LoginRequest model not form data! 
    // Let me update to send JSON since we defined a Pydantic model for login instead of OAuth2 form
    const response = await axios.post(`${baseURL}/api/auth/login`, {
      email,
      password
    });
    
    const token = response.data.access_token;
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    const userRes = await axios.get(`${baseURL}/api/auth/me`);
    setUser(userRes.data);
  };

  const register = async (name, email, password, studentNumber, department, semester) => {
    const response = await axios.post(`${baseURL}/api/auth/register`, {
      name,
      email,
      password,
      student_number: studentNumber,
      department,
      semester
    });
    const token = response.data.access_token;
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Fetch profile
    const profileResponse = await axios.get(`${baseURL}/api/auth/me`);
    setUser(profileResponse.data);
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, baseURL }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
