import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('grades');
  const [stats, setStats] = useState({ groups: 0, students: 0, results: 0, reviews: 0 });

  useEffect(() => {
    if (!sessionStorage.getItem('admin_auth')) {
      navigate('/admin');
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    navigate('/admin');
  };

  // Umumiy statistika yuklash
  const loadGlobalStats = async () => {
    const authKey = sessionStorage.getItem('admin_auth') || '';
    try {
      const [resG, resR, resRev] = await Promise.allSettled([
        fetch(`${API}/api/admin/groups`, { headers: { 'x-admin-key': authKey } }).then(r => r.json()),
        fetch(`${API}/api/results`).then(r => r.json()),
        fetch(`${API}/api/reviews`).then(r => r.json()),
      ]);

      let groupCount = 0;
      if (resG.status === 'fulfilled' && resG.value.groups) {
        groupCount = resG.value.groups.length;
      }
      let resultsCount = 0;
      if (resR.status === 'fulfilled' && resR.value.results) {
        resultsCount = resR.value.results.length;
      }
      let reviewsCount = 0;
      if (resRev.status === 'fulfilled' && resRev.value.reviews) {
        reviewsCount = resRev.value.reviews.length;
      }

      setStats({
        groups: groupCount,
        students: 0, // guruh ichida hisoblanadi
        results: resultsCount,
        reviews: reviewsCount,
      });
    } catch {
      // xatolik yuz bersa ham dashboard ishlayveradi
    }
  };

  useEffect(() => {
    loadGlobalStats();
  }, []);

  return (
    <div className="admin-layout">
      {/* Mobil Header (faqat kichik ekranlarda ko'rinadi) */}
      <header className="admin-mobile-header">
        <div className="admin-mobile-brand">
          <img src="/logo.jpg" alt="Logo" className="admin-mobile-logo" />
          <div>
            <strong>Aisha Uzbikiyya</strong>
            <span className="admin-mobile-role">Admin Boshqaruvi</span>
          </div>
        </div>
        <div className="admin-mobile-actions">
          <a href="/" target="_blank" rel="noreferrer" className="admin-top-link" title="Saytni ochish">
            🌐 Sayt
          </a>
          <button onClick={handleLogout} className="admin-mobile-logout" title="Chiqish">
            🚪 Chiqish
          </button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <img src="/logo.jpg" alt="Logo" className="admin-sidebar-logo" />
          <div className="admin-sidebar-brand-text">
            <span>Aisha Uzbikiyya</span>
            <small>Admin Boshqaruv Paneli</small>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          <button
            className={'admin-nav-item' + (activeTab === 'grades' ? ' active' : '')}
            onClick={() => setActiveTab('grades')}
          >
            <span className="admin-nav-icon">📚</span>
            <span>Baholar & Guruhlar</span>
          </button>

          <button
            className={'admin-nav-item' + (activeTab === 'results' ? ' active' : '')}
            onClick={() => setActiveTab('results')}
          >
            <span className="admin-nav-icon">🏆</span>
            <span>Natijalar (Skrinshot)</span>
          </button>

          <button
            className={'admin-nav-item' + (activeTab === 'reviews' ? ' active' : '')}
            onClick={() => setActiveTab('reviews')}
          >
            <span className="admin-nav-icon">💬</span>
            <span>O'quvchilar Sharhlari</span>
          </button>

          <button
            className={'admin-nav-item' + (activeTab === 'videos' ? ' active' : '')}
            onClick={() => setActiveTab('videos')}
          >
            <span className="admin-nav-icon">🎬</span>
            <span>Videolar & Qo'llanma</span>
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <a href="/" target="_blank" rel="noreferrer" className="admin-view-site-btn">
            🌐 Saytni ko'rish
          </a>
          <button className="admin-logout-btn" onClick={handleLogout}>
            <span>🚪 Chiqish</span>
          </button>
        </div>
      </aside>

      {/* Asosiy kontent maydoni */}
      <main className="admin-main">
        {/* Yuqori Tezkor Statistika */}
        <section className="admin-quick-stats">
          <div className="quick-stat-card">
            <div className="stat-icon-wrap" style={{ background: 'rgba(26, 122, 94, 0.12)', color: '#1A7A5E' }}>
              📚
            </div>
            <div>
              <span className="stat-label">Guruhlar</span>
              <strong className="stat-num">{stats.groups} ta</strong>
            </div>
          </div>

          <div className="quick-stat-card">
            <div className="stat-icon-wrap" style={{ background: 'rgba(217, 119, 6, 0.12)', color: '#D97706' }}>
              🏆
            </div>
            <div>
              <span className="stat-label">Yuklangan Natijalar</span>
              <strong className="stat-num">{stats.results} ta</strong>
            </div>
          </div>

          <div className="quick-stat-card">
            <div className="stat-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6' }}>
              💬
            </div>
            <div>
              <span className="stat-label">Sayt Sharhlari</span>
              <strong className="stat-num">{stats.reviews} ta</strong>
            </div>
          </div>
        </section>

        {/* Tab kontentlari */}
        <div className="admin-content-card-wrap">
          {activeTab === 'grades' && <GradesSection onDataChange={loadGlobalStats} />}
          {activeTab === 'results' && <ResultsSection onDataChange={loadGlobalStats} />}
          {activeTab === 'reviews' && <ReviewsSection onDataChange={loadGlobalStats} />}
          {activeTab === 'videos' && <VideosSection />}
        </div>
      </main>

      {/* Mobil pastki Navigation Bar */}
      <nav className="admin-bottom-nav">
        <button
          className={'admin-bottom-item' + (activeTab === 'grades' ? ' active' : '')}
          onClick={() => setActiveTab('grades')}
        >
          <span className="bottom-icon">📚</span>
          <span>Baholar</span>
        </button>

        <button
          className={'admin-bottom-item' + (activeTab === 'results' ? ' active' : '')}
          onClick={() => setActiveTab('results')}
        >
          <span className="bottom-icon">🏆</span>
          <span>Natijalar</span>
        </button>

        <button
          className={'admin-bottom-item' + (activeTab === 'reviews' ? ' active' : '')}
          onClick={() => setActiveTab('reviews')}
        >
          <span className="bottom-icon">💬</span>
          <span>Sharhlar</span>
        </button>

        <button
          className={'admin-bottom-item' + (activeTab === 'videos' ? ' active' : '')}
          onClick={() => setActiveTab('videos')}
        >
          <span className="bottom-icon">🎬</span>
          <span>Qo'llanma</span>
        </button>
      </nav>
    </div>
  );
}

// =====================================================================
// BAHOLAR & GURUHLAR BO'LIMI
// =====================================================================
function GradesSection({ onDataChange }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [students, setStudents] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentTg, setNewStudentTg] = useState('');
  const [msg, setMsg] = useState({ text: '', type: 'success' });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const showToast = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: 'success' }), 3500);
  };

  const loadGroups = async () => {
    try {
      const res = await fetch(`${API}/api/admin/groups`, {
        headers: { 'x-admin-key': sessionStorage.getItem('admin_auth') || '' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Guruhlarni yuklashda xatolik');
      const grps = data.groups || [];
      setGroups(grps);
      if (onDataChange) onDataChange();
      // Birinchi guruhni avtomatik tanlash (agar tanlanmagan bo'lsa)
      if (grps.length > 0 && !selectedGroup) {
        loadStudents(grps[0].id);
      }
    } catch (err) {
      showToast(err.message || 'Server bilan bog‘lanishda xatolik', 'error');
    }
  };

  const loadStudents = async (groupId) => {
    setSelectedGroup(groupId);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/groups/${groupId}/students`, {
        headers: { 'x-admin-key': sessionStorage.getItem('admin_auth') || '' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'O‘quvchilarni yuklashda xatolik');
      setStudents(data.students || []);
    } catch (err) {
      setStudents([]);
      showToast(err.message || 'O‘quvchilarni olishda xatolik', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const createGroup = async (e) => {
    if (e) e.preventDefault();
    if (!newGroupName.trim()) {
      showToast('Guruh nomini kiriting!', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': sessionStorage.getItem('admin_auth') || ''
        },
        body: JSON.stringify({ name: newGroupName.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Guruh yaratishda xatolik');
      setNewGroupName('');
      showToast('Yangi guruh muvaffaqiyatli yaratildi!');
      await loadGroups();
      if (data.group && data.group.id) {
        loadStudents(data.group.id);
      }
    } catch (err) {
      showToast(err.message || 'Xatolik yuz berdi', 'error');
    }
    setLoading(false);
  };

  const addStudent = async (e) => {
    if (e) e.preventDefault();
    if (!newStudentName.trim() || !selectedGroup) {
      showToast("O'quvchi ismini kiriting!", 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/groups/${selectedGroup}/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': sessionStorage.getItem('admin_auth') || ''
        },
        body: JSON.stringify({
          full_name: newStudentName.trim(),
          telegram_id: newStudentTg.trim() ? parseInt(newStudentTg.trim()) || null : null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'O‘quvchi qo‘shishda xatolik');
      setNewStudentName('');
      setNewStudentTg('');
      showToast("O'quvchi guruhga qo'shildi!");
      loadStudents(selectedGroup);
    } catch (err) {
      showToast(err.message || 'Xatolik yuz berdi', 'error');
    }
    setLoading(false);
  };

  const updatePoints = async (studentId, points) => {
    const numericPoints = Math.max(0, parseInt(points, 10) || 0);
    try {
      const res = await fetch(`${API}/api/admin/students/${studentId}/grade`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': sessionStorage.getItem('admin_auth') || ''
        },
        body: JSON.stringify({ group_id: selectedGroup, points: numericPoints })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bahoni saqlashda xatolik');
      showToast('Ball muvaffaqiyatli saqlandi!');
      loadStudents(selectedGroup);
    } catch (err) {
      showToast(err.message || 'Bahoni saqlashda xatolik', 'error');
    }
  };

  const currentGroupObj = groups.find((g) => g.id === selectedGroup);

  const filteredStudents = students.filter((s) =>
    (s.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div>
          <h2>📚 Baholar & O'quvchilar Reytingi</h2>
          <p className="admin-section-desc">
            Guruhlar yarating, o'quvchilarni qo'shing va oylik ballarni belgilang.
          </p>
        </div>
      </div>

      {msg.text && (
        <div className={`admin-alert ${msg.type === 'error' ? 'alert-danger' : 'alert-success'}`}>
          <span>{msg.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{msg.text}</span>
        </div>
      )}

      {/* Guruh qo'shish kartasi */}
      <div className="admin-card">
        <h3 className="admin-card-title">
          <span>➕ Yangi guruh qo'shish</span>
        </h3>
        <form onSubmit={createGroup} className="admin-flex-row">
          <input
            type="text"
            placeholder="Guruh nomi (masalan: Arab tili — A1 Guruhi)"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="admin-input"
            required
          />
          <button type="submit" className="admin-btn primary" disabled={loading}>
            {loading ? 'Yaratilmoqda...' : '+ Guruh yaratish'}
          </button>
        </form>
      </div>

      {/* Asosiy 2 ustunli / Mobil mos blok */}
      <div className="admin-two-cols">
        {/* Chap ustun: Guruhlar ro'yxati */}
        <div className="admin-card col-groups">
          <h3 className="admin-card-title">
            <span>📋 Guruhlar ro'yxati</span>
            <span className="badge-count">{groups.length} ta</span>
          </h3>

          {groups.length === 0 ? (
            <div className="admin-empty-state">
              <span className="empty-icon">📂</span>
              <p>Hozircha guruhlar mavjud emas.</p>
              <small>Yuqoridagi formadan birinchi guruhni qo'shing.</small>
            </div>
          ) : (
            <div className="groups-list">
              {groups.map((g) => {
                const isSelected = selectedGroup === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    className={`group-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => loadStudents(g.id)}
                  >
                    <div className="group-item-info">
                      <span className="group-name">{g.name}</span>
                      <span className="group-code">Guruh ID: #{g.id}</span>
                    </div>
                    <span className="group-item-chevron">{isSelected ? '●' : '→'}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* O'ng ustun: Tanlangan guruh o'quvchilari */}
        <div className="admin-card col-students">
          {selectedGroup ? (
            <>
              <div className="students-header-bar">
                <div>
                  <h3 className="admin-card-title" style={{ margin: 0 }}>
                    <span>👥 {currentGroupObj ? currentGroupObj.name : 'Guruh'}</span>
                  </h3>
                  <span className="group-id-pill">Guruh kodi: ID #{selectedGroup}</span>
                </div>
                <span className="badge-count">{students.length} nafar o'quvchi</span>
              </div>

              {/* Yangi o'quvchi qo'shish shakli */}
              <form onSubmit={addStudent} className="add-student-form">
                <input
                  type="text"
                  placeholder="O'quvchi ismi familiyasi *"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="admin-input"
                  required
                />
                <input
                  type="number"
                  placeholder="Telegram ID (ixtiyoriy)"
                  value={newStudentTg}
                  onChange={(e) => setNewStudentTg(e.target.value)}
                  className="admin-input"
                  style={{ maxWidth: '180px' }}
                />
                <button type="submit" className="admin-btn primary" disabled={loading}>
                  + Qo'shish
                </button>
              </form>

              {/* Qidirish */}
              {students.length > 3 && (
                <div style={{ marginBottom: '16px' }}>
                  <input
                    type="text"
                    placeholder="🔍 O'quvchi ismidan qidirish..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="admin-input search-input"
                  />
                </div>
              )}

              {/* O'quvchilar ro'yxati / Reyting */}
              {filteredStudents.length === 0 ? (
                <div className="admin-empty-state">
                  <span className="empty-icon">👨‍🎓</span>
                  <p>Bu guruhda hali o'quvchilar yo'q.</p>
                  <small>Yuqoridagi shakldan o'quvchini qo'shing.</small>
                </div>
              ) : (
                <div className="students-cards-container">
                  {filteredStudents
                    .sort((a, b) => (b.current_month_points || 0) - (a.current_month_points || 0))
                    .map((s, idx) => (
                      <div className="student-row-card" key={s.telegram_id || idx}>
                        <div className="student-main-info">
                          <span className={`rank-badge rank-${idx + 1}`}>
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                          </span>
                          <div>
                            <strong className="student-name">{s.full_name}</strong>
                            <div className="student-meta">
                              {s.telegram_id && <span>TG ID: {s.telegram_id}</span>}
                              <span className="current-pts">Joriy ball: {s.current_month_points || 0}</span>
                            </div>
                          </div>
                        </div>

                        <div className="student-actions">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            defaultValue={s.current_month_points || 0}
                            id={`pts-${s.telegram_id}`}
                            className="grade-num-input"
                          />
                          <button
                            type="button"
                            className="admin-btn small primary"
                            onClick={() => {
                              const el = document.getElementById(`pts-${s.telegram_id}`);
                              if (el) updatePoints(s.telegram_id, el.value);
                            }}
                          >
                            Saqlash
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          ) : (
            <div className="admin-empty-state" style={{ padding: '60px 20px' }}>
              <span className="empty-icon">👈</span>
              <p>O'quvchilarini ko'rish uchun chap tomondan guruhni tanlang.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// NATIJALAR (SKRINSHOTLAR) BO'LIMI
// =====================================================================
function ResultsSection({ onDataChange }) {
  const [results, setResults] = useState([]);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [msg, setMsg] = useState({ text: '', type: 'success' });
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const showToast = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: 'success' }), 3500);
  };

  const loadResults = async () => {
    try {
      const res = await fetch(`${API}/api/results`);
      const data = await res.json();
      setResults(data.results || []);
      if (onDataChange) onDataChange();
    } catch {
      setResults([]);
    }
  };

  useEffect(() => {
    loadResults();
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files && e.target.files[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        showToast('Rasm hajmi 5MB dan oshmasligi kerak!', 'error');
        return;
      }
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const uploadResult = async (e) => {
    if (e) e.preventDefault();
    if (!file) {
      showToast('Iltimos, rasm yoki skrinshot tanlang!', 'error');
      return;
    }
    setLoading(true);
    const form = new FormData();
    form.append('image', file);
    form.append('caption', caption.trim());

    try {
      const res = await fetch(`${API}/api/admin/results`, {
        method: 'POST',
        headers: { 'x-admin-key': sessionStorage.getItem('admin_auth') || '' },
        body: form
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Natija yuklashda xatolik');
      setFile(null);
      setPreviewUrl('');
      setCaption('');
      showToast('Skrinshot muvaffaqiyatli yuklandi!');
      loadResults();
    } catch (err) {
      showToast(err.message || 'Xatolik yuz berdi!', 'error');
    }
    setLoading(false);
  };

  const deleteResult = async (id) => {
    if (!window.confirm("Haqiqatan ham ushbu natijani o'chirmoqchimisiz?")) return;
    try {
      const res = await fetch(`${API}/api/admin/results/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': sessionStorage.getItem('admin_auth') || '' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Natijani o‘chirishda xatolik');
      showToast("Natija o'chirildi!");
      loadResults();
    } catch (err) {
      showToast(err.message || 'O‘chirishda xatolik', 'error');
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div>
          <h2>🏆 O'quvchilar Natijalari (Skrinshotlar)</h2>
          <p className="admin-section-desc">
            Sertifikatlar, imtihon natijalari yoki chat xabarlarini yuklang — ular saytda chiroyli ko'rsatiladi.
          </p>
        </div>
      </div>

      {msg.text && (
        <div className={`admin-alert ${msg.type === 'error' ? 'alert-danger' : 'alert-success'}`}>
          <span>{msg.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{msg.text}</span>
        </div>
      )}

      {/* Yuklash kartasi */}
      <div className="admin-card">
        <h3 className="admin-card-title">➕ Yangi natija yoki sertifikat yuklash</h3>
        <form onSubmit={uploadResult}>
          <div
            className={`admin-dropzone ${previewUrl ? 'has-preview' : ''}`}
            onClick={() => document.getElementById('result-file-input').click()}
          >
            {previewUrl ? (
              <div className="dropzone-preview">
                <img src={previewUrl} alt="Tanlangan rasm" />
                <span>O'zgartirish uchun bosing ({file && file.name})</span>
              </div>
            ) : (
              <div className="dropzone-placeholder">
                <span className="dropzone-icon">📷</span>
                <strong>Skrinshot yoki sertifikat rasmini tanlash</strong>
                <small>PNG, JPG, JPEG (Maksimal hajm: 5MB)</small>
              </div>
            )}
          </div>

          <input
            id="result-file-input"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          <div className="admin-flex-row" style={{ marginTop: '16px' }}>
            <input
              type="text"
              placeholder="Izoh (masalan: Ali Valiyev — C1 daraja sertifikati)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="admin-input"
            />
            <button
              type="submit"
              className="admin-btn primary"
              disabled={loading || !file}
            >
              {loading ? 'Yuklanmoqda...' : '⬆️ Saytga yuklash'}
            </button>
          </div>
        </form>
      </div>

      {/* Yuklangan natijalar */}
      <div className="admin-card">
        <h3 className="admin-card-title">
          <span>Yuklangan natijalar galereyasi</span>
          <span className="badge-count">{results.length} ta</span>
        </h3>

        {results.length === 0 ? (
          <div className="admin-empty-state">
            <span className="empty-icon">🖼️</span>
            <p>Hozircha natijalar yuklanmagan.</p>
            <small>Birinchi natijani yuqoridagi maydon orqali yuklang.</small>
          </div>
        ) : (
          <div className="results-admin-grid">
            {results.map((r) => (
              <div key={r.id} className="result-admin-card">
                <div className="result-img-wrapper">
                  <img
                    src={`${API}/uploads/${r.filename}`}
                    alt={r.caption || 'Natija'}
                    onError={(e) => {
                      e.target.src = '/logo.jpg';
                    }}
                  />
                </div>
                <div className="result-card-info">
                  <p className="result-card-caption">{r.caption || "Izohsiz natija"}</p>
                  <button
                    type="button"
                    className="admin-btn danger small full-w"
                    onClick={() => deleteResult(r.id)}
                  >
                    🗑️ O'chirish
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// SHARHLAR BO'LIMI
// =====================================================================
function ReviewsSection({ onDataChange }) {
  const [reviews, setReviews] = useState([]);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [stars, setStars] = useState(5);
  const [msg, setMsg] = useState({ text: '', type: 'success' });
  const [loading, setLoading] = useState(false);

  const showToast = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: 'success' }), 3500);
  };

  const loadReviews = async () => {
    try {
      const res = await fetch(`${API}/api/reviews`);
      const data = await res.json();
      setReviews(data.reviews || []);
      if (onDataChange) onDataChange();
    } catch {
      setReviews([]);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const addReview = async (e) => {
    if (e) e.preventDefault();
    if (!name.trim() || !text.trim()) {
      showToast("O'quvchi ismi va sharh matnini to'ldiring!", 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': sessionStorage.getItem('admin_auth') || ''
        },
        body: JSON.stringify({ name: name.trim(), text: text.trim(), stars })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sharh qo‘shishda xatolik');
      setName('');
      setText('');
      setStars(5);
      showToast('Sharh muvaffaqiyatli qo‘shildi!');
      loadReviews();
    } catch (err) {
      showToast(err.message || 'Xatolik yuz berdi!', 'error');
    }
    setLoading(false);
  };

  const deleteReview = async (id) => {
    if (!window.confirm("Haqiqatan ham ushbu sharhni o'chirmoqchimisiz?")) return;
    try {
      const res = await fetch(`${API}/api/admin/reviews/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': sessionStorage.getItem('admin_auth') || '' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sharh o‘chirishda xatolik');
      showToast("Sharh o'chirildi!");
      loadReviews();
    } catch (err) {
      showToast(err.message || 'O‘chirishda xatolik', 'error');
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div>
          <h2>💬 O'quvchilar Sharhlari</h2>
          <p className="admin-section-desc">
            O'quvchilarning haqiqiy fikr va xursandchiliklarini qo'shing — saytda dinamik ko'rsatiladi.
          </p>
        </div>
      </div>

      {msg.text && (
        <div className={`admin-alert ${msg.type === 'error' ? 'alert-danger' : 'alert-success'}`}>
          <span>{msg.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{msg.text}</span>
        </div>
      )}

      {/* Yangi sharh formasi */}
      <div className="admin-card">
        <h3 className="admin-card-title">➕ Yangi sharh qo'shish</h3>
        <form onSubmit={addReview} className="admin-form-col">
          <div className="admin-flex-row">
            <input
              type="text"
              placeholder="O'quvchi ismi familiyasi *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="admin-input"
              required
            />
            <div className="star-picker">
              <label>Baholash:</label>
              <div className="stars-btns-wrap">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`star-choice-btn ${stars >= num ? 'filled' : ''}`}
                    onClick={() => setStars(num)}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          </div>

          <textarea
            placeholder="O'quvchining kursi haqidagi samimiy fikri yoki sharhi... *"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="admin-input admin-textarea"
            rows="3"
            required
          />

          <button type="submit" className="admin-btn primary" disabled={loading}>
            {loading ? 'Qo‘shilmoqda...' : '+ Sharhni saytga chiqarish'}
          </button>
        </form>
      </div>

      {/* Sharhlar ro'yxati */}
      <div className="admin-card">
        <h3 className="admin-card-title">
          <span>Mavjud sharhlar</span>
          <span className="badge-count">{reviews.length} ta</span>
        </h3>

        {reviews.length === 0 ? (
          <div className="admin-empty-state">
            <span className="empty-icon">💭</span>
            <p>Hozircha hech qanday sharh kiritilmagan.</p>
          </div>
        ) : (
          <div className="reviews-admin-grid">
            {reviews.map((rev) => (
              <div key={rev.id} className="review-admin-card">
                <div className="review-admin-header">
                  <div className="review-admin-user">
                    <span className="avatar-circle">{rev.name.charAt(0).toUpperCase()}</span>
                    <strong>{rev.name}</strong>
                  </div>
                  <span className="stars-gold">
                    {'★'.repeat(rev.stars || 5)}
                    {'☆'.repeat(5 - (rev.stars || 5))}
                  </span>
                </div>
                <p className="review-admin-text">"{rev.text}"</p>
                <div className="review-admin-footer">
                  <button
                    type="button"
                    className="admin-btn danger small"
                    onClick={() => deleteReview(rev.id)}
                  >
                    🗑️ O'chirish
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// VIDEOLAR & QO'LLANMA BO'LIMI
// =====================================================================
function VideosSection() {
  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div>
          <h2>🎬 Videolar & Admin Yo'riqnomasi</h2>
          <p className="admin-section-desc">
            Sayt va Telegram botni boshqarish bo'yicha to'liq qo'llanma.
          </p>
        </div>
      </div>

      <div className="admin-card">
        <h3 className="admin-card-title">📱 Ustozdan lavhalar (Videolar)ni yangilash</h3>
        <p style={{ color: '#4B5563', lineHeight: '1.7', marginBottom: '16px' }}>
          Saytning "Ustoz haqida" bo'limidagi 3 ta videoga havola kiritish juda oson. Buning uchun Telegram kanalingizdagi video postning havolasini oling:
        </p>

        <ol className="admin-steps-list">
          <li>
            <strong>1-qadam:</strong> Telegram kanalingiz (<code>@aisha_uzbikiyya</code>) dagi kerakli videoni oching.
          </li>
          <li>
            <strong>2-qadam:</strong> Video ustida sichqonchaning o'ng tugmasini (yoki telefonda "...") bosing va <strong>"Havolani nusxalash (Copy Link)"</strong> ni tanlang.
          </li>
          <li>
            <strong>3-qadam:</strong> Nusxalangan havola ko'rinishi: <code>https://t.me/aisha_uzbikiyya/265</code>
          </li>
          <li>
            <strong>4-qadam:</strong> <code>frontend/src/pages/Landing.js</code> dagi <code>mentorVideos</code> qatoriga qo'ying.
          </li>
        </ol>
      </div>

      <div className="admin-card">
        <h3 className="admin-card-title">🔑 Render va Baza xavfsizligi bo'yicha muhim eslatma</h3>
        <div className="admin-info-box">
          <p>
            <strong>Eslatma:</strong> Barcha guruhlar, o'quvchilar va baholar PostgreSQL ma'lumotlar bazasida doimiy saqlanadi. Render bepul rejasida yuklangan rasmlar (uploads) server qayta yonganida o'chmasligi uchun muhim natijalarni Telegram kanalda ham e'lon qilish tavsiya etiladi.
          </p>
        </div>
      </div>
    </div>
  );
}
