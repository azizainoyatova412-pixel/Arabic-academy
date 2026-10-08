import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css';

const API = process.env.REACT_APP_API_URL || '';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Parolni backend orqali tekshirish
      const res = await fetch(`${API}/api/admin/groups`, {
        headers: { 'x-admin-key': password },
      });

      if (res.ok) {
        sessionStorage.setItem('admin_auth', password);
        navigate('/admin/dashboard');
      } else {
        setError("Kiritilgan parol noto'g'ri. Iltimos, qaytadan urinib ko'ring.");
      }
    } catch {
      setError('Serverga ulanib bo\'lmadi. Backend ishlayotganini tekshiring.');
    }

    setLoading(false);
  };


  return (
    <div className="admin-login-page">
      <div className="admin-login-glow-bg"></div>
      <div className="admin-login-card">
        <div className="admin-login-logo">
          <img src="/logo.jpg" alt="Aisha Uzbikiyya" />
        </div>

        <span className="admin-login-badge">Boshqaruv Tizimi</span>
        <h1>Admin Kirish</h1>
        <p className="admin-login-sub">Aisha Uzbikiyya Akademiyasi</p>

        <form onSubmit={handleLogin} className="admin-login-form">
          <div className="admin-field">
            <label htmlFor="admin-pass">Maxfiy Parol</label>
            <div className="password-input-wrap">
              <input
                id="admin-pass"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Parolni kiriting..."
                autoFocus
                required
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Parolni ko'rsatish"
              >
                {showPassword ? '👁️' : '🔒'}
              </button>
            </div>
          </div>

          {error && <div className="admin-error">⚠️ {error}</div>}

          <button type="submit" className="admin-login-btn" disabled={loading}>
            {loading ? 'Tekshirilmoqda...' : 'Tizimga kirish →'}
          </button>
        </form>

        <a href="/" className="admin-back-link">
          ← Asosiy saytga qaytish
        </a>
      </div>
    </div>
  );
}
