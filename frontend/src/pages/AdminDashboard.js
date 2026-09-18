import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// =====================================================================
// ADMIN DASHBOARD
// =====================================================================
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('grades');

  useEffect(() => {
    if (!sessionStorage.getItem('admin_auth')) {
      navigate('/admin');
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    navigate('/admin');
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <img src="/logo.jpg" alt="Logo" className="admin-sidebar-logo" />
          <span>Admin Panel</span>
        </div>
        <nav className="admin-sidebar-nav">
          <button
            className={'admin-nav-item' + (activeTab === 'grades' ? ' active' : '')}
            onClick={() => setActiveTab('grades')}
          >
            &#128218; Baholar & Guruhlar
          </button>
          <button
            className={'admin-nav-item' + (activeTab === 'results' ? ' active' : '')}
            onClick={() => setActiveTab('results')}
          >
            &#127942; Natijalar
          </button>
          <button
            className={'admin-nav-item' + (activeTab === 'reviews' ? ' active' : '')}
            onClick={() => setActiveTab('reviews')}
          >
            &#128172; Sharhlar
          </button>
          <button
            className={'admin-nav-item' + (activeTab === 'videos' ? ' active' : '')}
            onClick={() => setActiveTab('videos')}
          >
            &#127916; Videolar
          </button>
        </nav>
        <button className="admin-logout-btn" onClick={handleLogout}>
          Chiqish &#8594;
        </button>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        {activeTab === 'grades' && <GradesSection />}
        {activeTab === 'results' && <ResultsSection />}
        {activeTab === 'reviews' && <ReviewsSection />}
        {activeTab === 'videos' && <VideosSection />}
      </main>
    </div>
  );
}

// =====================================================================
// BAHOLAR & GURUHLAR bo'limi
// =====================================================================
function GradesSection() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [students, setStudents] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentTg, setNewStudentTg] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Guruhlarni yuklash
  const loadGroups = async () => {
    try {
      const res = await fetch(`${API}/api/admin/groups`, {
        headers: { 'x-admin-key': sessionStorage.getItem('admin_auth') || '1' }
      });
      const data = await res.json();
      setGroups(data.groups || []);
    } catch {
      setGroups([]);
    }
  };

  // Guruh o'quvchilarini yuklash
  const loadStudents = async (groupId) => {
    setSelectedGroup(groupId);
    try {
      const res = await fetch(`${API}/api/admin/groups/${groupId}/students`, {
        headers: { 'x-admin-key': '1' }
      });
      const data = await res.json();
      setStudents(data.students || []);
    } catch {
      setStudents([]);
    }
  };

  useEffect(() => { loadGroups(); }, []);

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    setLoading(true);
    try {
      await fetch(`${API}/api/admin/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': '1' },
        body: JSON.stringify({ name: newGroupName })
      });
      setNewGroupName('');
      setMsg('Guruh qo\'shildi!');
      loadGroups();
    } catch { setMsg('Xatolik yuz berdi'); }
    setLoading(false);
    setTimeout(() => setMsg(''), 3000);
  };

  const addStudent = async () => {
    if (!newStudentName.trim() || !selectedGroup) return;
    setLoading(true);
    try {
      await fetch(`${API}/api/admin/groups/${selectedGroup}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': '1' },
        body: JSON.stringify({ full_name: newStudentName, telegram_id: newStudentTg || null })
      });
      setNewStudentName('');
      setNewStudentTg('');
      setMsg('O\'quvchi qo\'shildi!');
      loadStudents(selectedGroup);
    } catch { setMsg('Xatolik yuz berdi'); }
    setLoading(false);
    setTimeout(() => setMsg(''), 3000);
  };

  const updatePoints = async (studentId, points) => {
    try {
      await fetch(`${API}/api/admin/students/${studentId}/grade`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': '1' },
        body: JSON.stringify({ group_id: selectedGroup, points: parseInt(points) || 0 })
      });
      loadStudents(selectedGroup);
    } catch {}
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2>&#128218; Baholar & Guruhlar</h2>
        <p className="admin-section-desc">Yangi guruh yarating, o'quvchilarni qo'shing va ball bering.</p>
      </div>

      {msg && <div className="admin-success-msg">{msg}</div>}

      {/* Yangi guruh */}
      <div className="admin-card">
        <h3>Yangi guruh qo'shish</h3>
        <div className="admin-row">
          <input
            type="text"
            placeholder="Guruh nomi (masalan: A1 — 2026 Sentabr)"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="admin-input"
          />
          <button className="admin-btn primary" onClick={createGroup} disabled={loading}>
            + Guruh yaratish
          </button>
        </div>
      </div>

      {/* Guruhlar ro'yxati */}
      <div className="admin-card">
        <h3>Guruhlar</h3>
        {groups.length === 0 ? (
          <p className="admin-empty">Hali guruh yo'q. Yuqoridan qo'shing.</p>
        ) : (
          <div className="groups-list">
            {groups.map((g) => (
              <div
                key={g.id}
                className={'group-item' + (selectedGroup === g.id ? ' selected' : '')}
                onClick={() => loadStudents(g.id)}
              >
                <div className="group-item-info">
                  <span className="group-name">{g.name}</span>
                  <span className="group-code">ID: {g.id}</span>
                </div>
                <span className="group-arrow">&#8594;</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tanlangan guruh o'quvchilari */}
      {selectedGroup && (
        <div className="admin-card">
          <h3>
            O'quvchilar — {groups.find(g => g.id === selectedGroup)?.name || 'Guruh'}
            <span className="group-code-badge">Guruh ID: {selectedGroup}</span>
          </h3>

          {/* Yangi o'quvchi qo'shish */}
          <div className="admin-row" style={{ marginBottom: '24px' }}>
            <input
              type="text"
              placeholder="To'liq ism"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              className="admin-input"
            />
            <input
              type="text"
              placeholder="Telegram ID (ixtiyoriy)"
              value={newStudentTg}
              onChange={(e) => setNewStudentTg(e.target.value)}
              className="admin-input"
              style={{ maxWidth: '200px' }}
            />
            <button className="admin-btn primary" onClick={addStudent} disabled={loading}>
              + O'quvchi
            </button>
          </div>

          {/* O'quvchilar jadvali */}
          {students.length === 0 ? (
            <p className="admin-empty">Bu guruhda hali o'quvchi yo'q.</p>
          ) : (
            <div className="students-table-wrap">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Ism</th>
                    <th>Ball</th>
                    <th>Tahrirlash</th>
                  </tr>
                </thead>
                <tbody>
                  {students.sort((a, b) => b.current_month_points - a.current_month_points).map((s, idx) => (
                    <tr key={s.telegram_id}>
                      <td className="rank-cell">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                      </td>
                      <td>{s.full_name}</td>
                      <td>
                        <span className="points-badge">{s.current_month_points}</span>
                      </td>
                      <td>
                        <div className="grade-edit-row">
                          <input
                            type="number"
                            defaultValue={s.current_month_points}
                            min="0" max="100"
                            className="grade-input"
                            id={`grade-${s.telegram_id}`}
                          />
                          <button
                            className="admin-btn small"
                            onClick={() => {
                              const val = document.getElementById(`grade-${s.telegram_id}`).value;
                              updatePoints(s.telegram_id, val);
                            }}
                          >
                            Saqlash
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =====================================================================
// NATIJALAR bo'limi
// =====================================================================
function ResultsSection() {
  const [results, setResults] = useState([]);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const loadResults = async () => {
    try {
      const res = await fetch(`${API}/api/results`);
      const data = await res.json();
      setResults(data.results || []);
    } catch { setResults([]); }
  };

  useEffect(() => { loadResults(); }, []);

  const uploadResult = async () => {
    if (!file) return;
    setLoading(true);
    const form = new FormData();
    form.append('image', file);
    form.append('caption', caption);
    try {
      await fetch(`${API}/api/admin/results`, {
        method: 'POST',
        headers: { 'x-admin-key': '1' },
        body: form
      });
      setFile(null);
      setCaption('');
      setMsg('Natija qo\'shildi!');
      loadResults();
    } catch { setMsg('Xatolik!'); }
    setLoading(false);
    setTimeout(() => setMsg(''), 3000);
  };

  const deleteResult = async (id) => {
    if (!window.confirm('Rostdan ham o\'chirmoqchimisiz?')) return;
    await fetch(`${API}/api/admin/results/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': '1' }
    });
    loadResults();
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2>&#127942; Natijalar (Skrinshotlar)</h2>
        <p className="admin-section-desc">O'quvchilaring natijalarini skrinshot sifatida yuklang — saytda avtomatik ko'rinadi.</p>
      </div>

      {msg && <div className="admin-success-msg">{msg}</div>}

      <div className="admin-card">
        <h3>Yangi natija yuklash</h3>
        <div className="upload-zone" onClick={() => document.getElementById('result-file').click()}>
          {file ? (
            <div className="upload-preview">
              <img src={URL.createObjectURL(file)} alt="preview" />
              <span>{file.name}</span>
            </div>
          ) : (
            <>
              <div className="upload-icon">&#128247;</div>
              <p>Skrinshot tanlash uchun bosing</p>
              <small>JPG, PNG — max 5MB</small>
            </>
          )}
        </div>
        <input
          id="result-file"
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => setFile(e.target.files[0])}
        />
        <input
          type="text"
          placeholder="Izoh (masalan: Ali — A1 sertifikati oldi)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="admin-input"
          style={{ marginTop: '14px' }}
        />
        <button className="admin-btn primary" onClick={uploadResult} disabled={loading || !file} style={{ marginTop: '12px' }}>
          {loading ? 'Yuklanmoqda...' : '&#8679; Yuklash'}
        </button>
      </div>

      <div className="admin-card">
        <h3>Yuklangan natijalar</h3>
        {results.length === 0 ? (
          <p className="admin-empty">Hali natija yuklanmagan.</p>
        ) : (
          <div className="results-grid-admin">
            {results.map((r) => (
              <div key={r.id} className="result-item-admin">
                <img src={`${API}/uploads/${r.filename}`} alt={r.caption} />
                <p>{r.caption}</p>
                <button className="admin-btn danger small" onClick={() => deleteResult(r.id)}>O'chirish</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// SHARHLAR bo'limi
// =====================================================================
function ReviewsSection() {
  const [reviews, setReviews] = useState([]);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [stars, setStars] = useState(5);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const loadReviews = async () => {
    try {
      const res = await fetch(`${API}/api/reviews`);
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch { setReviews([]); }
  };

  useEffect(() => { loadReviews(); }, []);

  const addReview = async () => {
    if (!name.trim() || !text.trim()) return;
    setLoading(true);
    try {
      await fetch(`${API}/api/admin/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': '1' },
        body: JSON.stringify({ name, text, stars })
      });
      setName(''); setText(''); setStars(5);
      setMsg('Sharh qo\'shildi!');
      loadReviews();
    } catch { setMsg('Xatolik!'); }
    setLoading(false);
    setTimeout(() => setMsg(''), 3000);
  };

  const deleteReview = async (id) => {
    if (!window.confirm('O\'chirmoqchimisiz?')) return;
    await fetch(`${API}/api/admin/reviews/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': '1' }
    });
    loadReviews();
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2>&#128172; Sharhlar</h2>
        <p className="admin-section-desc">O'quvchilar sharhini qo'shing — saytda ko'rinadi.</p>
      </div>

      {msg && <div className="admin-success-msg">{msg}</div>}

      <div className="admin-card">
        <h3>Yangi sharh qo'shish</h3>
        <div className="admin-row" style={{ flexDirection: 'column', gap: '12px' }}>
          <input type="text" placeholder="O'quvchi ismi" value={name} onChange={(e) => setName(e.target.value)} className="admin-input" />
          <textarea placeholder="Sharh matni..." value={text} onChange={(e) => setText(e.target.value)} className="admin-input admin-textarea" />
          <div className="stars-select">
            <label>Yulduzlar:</label>
            {[1,2,3,4,5].map(n => (
              <button key={n} className={'star-btn' + (stars >= n ? ' active' : '')} onClick={() => setStars(n)}>&#9733;</button>
            ))}
          </div>
          <button className="admin-btn primary" onClick={addReview} disabled={loading}>
            + Sharh qo'shish
          </button>
        </div>
      </div>

      <div className="admin-card">
        <h3>Mavjud sharhlar</h3>
        {reviews.length === 0 ? (
          <p className="admin-empty">Hali sharh yo'q.</p>
        ) : (
          <div className="reviews-list-admin">
            {reviews.map((r) => (
              <div key={r.id} className="review-item-admin">
                <div className="review-header-admin">
                  <strong>{r.name}</strong>
                  <span>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span>
                </div>
                <p>{r.text}</p>
                <button className="admin-btn danger small" onClick={() => deleteReview(r.id)}>O'chirish</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// VIDEOLAR bo'limi
// =====================================================================
function VideosSection() {
  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2>&#127916; Videolarni qo'shish — Yo'riqnoma</h2>
        <p className="admin-section-desc">Ustozdan lavhalar bo'limiga video qo'shish uchun quyidagi ko'rsatmalarni bajaring.</p>
      </div>

      <div className="admin-card">
        <h3>&#128249; 1-usul: YouTube video</h3>
        <ol className="instructions-list">
          <li>YouTube'ga videoni yuklang yoki kanal sahifasiga o'ting.</li>
          <li>Video ostidagi <strong>Ulashish (Share)</strong> tugmasini bosing.</li>
          <li>Ko'rsatilgan havolani nusxa oling. Masalan: <code>https://youtu.be/AbCdEfGhIjK</code></li>
          <li><code>frontend/src/pages/Landing.js</code> faylini oching.</li>
          <li>Fayl boshidagi <code>mentorVideos</code> massivini toping va <code>videoUrl</code> ni to'ldiring:</li>
        </ol>
        <div className="code-block">
          <pre>{`const mentorVideos = [
  { videoUrl: 'https://youtu.be/AbCdEfGhIjK', id: 1 },
  { videoUrl: 'https://youtu.be/BBBBBBBBBBB', id: 2 },
  { videoUrl: null, id: 3 }, // hali yo'q bo'lsa null
];`}</pre>
        </div>
      </div>

      <div className="admin-card">
        <h3>&#128226; 2-usul: Telegram havola</h3>
        <ol className="instructions-list">
          <li>Telegram kanalingizdagi videoni oching.</li>
          <li>Video ustida o'ng tugma (yoki "..." menyu) bosing → <strong>Havolani nusxalash</strong>.</li>
          <li>Havola shunday ko'rinadi: <code>https://t.me/yourChannel/123</code></li>
          <li>Xuddi yuqoridagi kabi <code>mentorVideos</code> ichiga joylashtiring.</li>
        </ol>
        <div className="code-block">
          <pre>{`{ videoUrl: 'https://t.me/aishauzbikiyya_admin/42', id: 1 }`}</pre>
        </div>
      </div>

      <div className="admin-card">
        <h3>&#128225; 3-usul: Telegram Post embed (to'liq)</h3>
        <ol className="instructions-list">
          <li>Kelajakda saytga bevosita Telegram post ulash mumkin.</li>
          <li>Buning uchun admin kanaldagi postni <strong>public</strong> qiling.</li>
          <li>Post havolasini <code>videoUrl</code> ga kiriting.</li>
          <li>Sayt avtomatik "Telegramda ko'rish" tugmasini ko'rsatadi.</li>
        </ol>
        <div className="info-note">
          &#9432; Hozir faqat havola ko'rsatiladi. Keyingi versiyada video thumbnailni avtomatik olish qo'shiladi.
        </div>
      </div>
    </div>
  );
}
