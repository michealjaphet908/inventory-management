import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Login from './components/Login';
import SparePartForm from './components/SparePartForm';
import StockInForm from './components/StockInForm';
import StockOutForm from './components/StockOutForm';
import ReportsPage from './components/ReportsPage';
import Sidebar from './components/Sidebar';

const API_BASE_URL = 'http://localhost:5000/api';

export const AuthContext = React.createContext();

function App() {

  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const logout = () => {
    setToken('');
    setUser(null);
    navigate('/login');
  };

  const authAxios = axios.create({
    baseURL: API_BASE_URL,
  });

  authAxios.interceptors.request.use(config => {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<Login setToken={setToken} setUser={setUser} />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }


  return (
    <AuthContext.Provider value={{ token, user, logout, authAxios }}>
      <div className="min-h-screen flex">
        <Sidebar logout={logout} />
        <main className="flex-grow p-6 bg-gray-100 min-h-screen">
          <Routes>
            <Route path="/spareparts" element={<SparePartForm />} />
            <Route path="/stockin" element={<StockInForm />} />
            <Route path="/stockout" element={<StockOutForm />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="*" element={<Navigate to="/spareparts" />} />
          </Routes>
        </main>
      </div>
    </AuthContext.Provider>
  );
}

export default App;
