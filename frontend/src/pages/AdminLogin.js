import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css';

const ADMIN_PASSWORD = 'aisha2026admin'; // Bu parolni .env dan olish kerak — hozircha shunday

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    // Oddiy parol tekshiruvi (real loyihada backend JWT bilan bo'ladi)
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_auth', '1');
      navigate('/admin/dashboard');
    } else {
      setError("Parol noto'g'ri. Qaytadan urinib ko'ring.");
    }
    setLoading(false);
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-logo">
          <img src="/logo.jpg" alt="Aisha Uzbikiyya" />
        </div>
        <h1>Admin Panel</h1>
        <p className="admin-login-sub">Aisha Uzbikiyya Akademiyasi</p>

        <form onSubmit={handleLogin} className="admin-login-form">
          <div className="admin-field">
            <label htmlFor="admin-pass">Parol</label>
            <input
              id="admin-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin parolini kiriting"
              autoFocus
            />
          </div>
          {error && <div className="admin-error">{error}</div>}
          <button type="submit" className="admin-login-btn" disabled={loading}>
            {loading ? 'Tekshirilmoqda...' : 'Kirish'}
          </button>
        </form>

        <a href="/" className="admin-back-link">&#8592; Saytga qaytish</a>
      </div>
    </div>
  );
}
