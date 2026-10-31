import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css';

const API = process.env.REACT_APP_API_URL || '';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('grades');
  const [stats, setStats] = useState({
    group_count: 0,
    students: 0,
    active_students: 0,
    pending_enrollments: 0,
    results: 0,
    reviews: 0,
    pending_reviews: 0,
    groups: [],
    bot: null,
    botUpdatedAt: null,
  });
  const [statsError, setStatsError] = useState('');

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
    if (!authKey) {
      navigate('/admin');
      return;
    }
    try {
      const response = await fetch(`${API}/api/admin/dashboard-stats`, {
        headers: { 'x-admin-key': authKey },
      });
      if (response.status === 401) {
        sessionStorage.removeItem('admin_auth');
        navigate('/admin');
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Statistikani yuklab bo‘lmadi');
      setStats((previous) => ({ ...previous, ...data.stats }));
      setStatsError('');
    } catch (err) {
      setStatsError(err.message || 'Statistikani yuklab bo‘lmadi');
    }
  };

  useEffect(() => {
    loadGlobalStats();
    const interval = setInterval(loadGlobalStats, 30000);
    return () => clearInterval(interval);
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
            className={'admin-nav-item' + (activeTab === 'books' ? ' active' : '')}
            onClick={() => setActiveTab('books')}
          >
            <span className="admin-nav-icon">📖</span>
            <span>PDF Darsliklar / Kitoblar</span>
          </button>

          <button
            className={'admin-nav-item' + (activeTab === 'videos' ? ' active' : '')}
            onClick={() => setActiveTab('videos')}
          >
            <span className="admin-nav-icon">🎬</span>
            <span>Videolar & Qo'llanma</span>
          </button>

          <button
            className={'admin-nav-item' + (activeTab === 'settings' ? ' active' : '')}
            onClick={() => setActiveTab('settings')}
          >
            <span className="admin-nav-icon">⚙️</span>
            <span>Sozlamalar</span>
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
        {statsError && <div className="admin-alert alert-danger"><span>⚠️</span><span>{statsError}</span></div>}
        <section className="admin-quick-stats">
          <div className="quick-stat-card">
            <div className="stat-icon-wrap" style={{ background: 'rgba(26, 122, 94, 0.12)', color: '#1A7A5E' }}>
              📚
            </div>
            <div>
              <span className="stat-label">Guruhlar</span>
              <strong className="stat-num">{stats.group_count} ta</strong>
            </div>
          </div>

          <div className="quick-stat-card">
            <div className="stat-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563EB' }}>
              👥
            </div>
            <div>
              <span className="stat-label">Barcha o‘quvchilar</span>
              <strong className="stat-num">{stats.students} nafar</strong>
            </div>
          </div>

          <div className="quick-stat-card">
            <div className="stat-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
              ✅
            </div>
            <div>
              <span className="stat-label">Faol o‘quvchilar</span>
              <strong className="stat-num">{stats.active_students} nafar</strong>
            </div>
          </div>

          <div className="quick-stat-card">
            <div className="stat-icon-wrap" style={{ background: 'rgba(217, 119, 6, 0.12)', color: '#D97706' }}>
              📝
            </div>
            <div>
              <span className="stat-label">Tasdiq kutayotgan sharhlar</span>
              <strong className="stat-num">{stats.pending_reviews} ta</strong>
            </div>
          </div>

          <div className="quick-stat-card">
            <div className="stat-icon-wrap" style={{ background: 'rgba(217, 119, 6, 0.12)', color: '#D97706' }}>
              🏆
            </div>
            <div>
              <span className="stat-label">Saytga yuklangan natijalar</span>
              <strong className="stat-num">{stats.results} ta</strong>
            </div>
          </div>

          <div className="quick-stat-card">
            <div className="stat-icon-wrap" style={{ background: 'rgba(197, 152, 88, 0.18)', color: '#8C5A3C' }}>
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
          {activeTab === 'books' && <BooksSection onDataChange={loadGlobalStats} />}
          {activeTab === 'videos' && <VideosSection />}
          {activeTab === 'settings' && <SettingsSection />}
        </div>

        <section className="admin-card admin-live-stats">
          <div className="admin-live-stats-header">
            <div>
              <h3 className="admin-card-title">📊 Tizim faolligi</h3>
              <p>Bot va sayt statistikasi har 30 soniyada yangilanadi.</p>
            </div>
            <button type="button" className="admin-btn small" onClick={loadGlobalStats}>🔄 Yangilash</button>
          </div>
          <div className="admin-live-stat-grid">
            <div><span>Saytdagi faol guruhlar</span><strong>{stats.group_count}</strong></div>
            <div><span>O‘quvchilar</span><strong>{stats.students}</strong></div>
            <div><span>Yuborilgan testlar</span><strong>{stats.bot?.tests ?? '—'}</strong></div>
            <div><span>Bot foydalanuvchilari</span><strong>{stats.bot?.users ?? '—'}</strong></div>
          </div>
          <div className="admin-group-stats">
            {stats.groups.length === 0 ? (
              <p>Hozircha guruh statistikasi yo‘q.</p>
            ) : (
              <div className="admin-group-column-chart" role="img" aria-label="Har bir guruhdagi o‘quvchilar soni">
                {stats.groups.map((group) => {
                  const maxStudents = Math.max(1, ...stats.groups.map((item) => Number(item.students) || 0));
                  const studentCount = Number(group.students) || 0;
                  const percent = Math.max(5, Math.round((studentCount / maxStudents) * 100));
                  return (
                    <div className="admin-group-column" key={group.id} title={`${group.name}: ${studentCount} o‘quvchi`}>
                      <div className="admin-group-column-value">{studentCount}</div>
                      <div className="admin-group-column-track">
                        <span style={{ height: `${percent}%` }} />
                      </div>
                      <div className="admin-group-column-label">{group.name}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <small className="admin-sync-time">
            Bot statistikasi: {stats.botUpdatedAt ? new Date(stats.botUpdatedAt).toLocaleString('uz-UZ') : 'sinxronlash kutilmoqda'}
          </small>
        </section>
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
          className={'admin-bottom-item' + (activeTab === 'books' ? ' active' : '')}
          onClick={() => setActiveTab('books')}
        >
          <span className="bottom-icon">📖</span>
          <span>Kitoblar</span>
        </button>

        <button
          className={'admin-bottom-item' + (activeTab === 'videos' ? ' active' : '')}
          onClick={() => setActiveTab('videos')}
        >
          <span className="bottom-icon">🎬</span>
          <span>Qo'llanma</span>
        </button>

        <button
          className={'admin-bottom-item' + (activeTab === 'settings' ? ' active' : '')}
          onClick={() => setActiveTab('settings')}
        >
          <span className="bottom-icon">⚙️</span>
          <span>Sozlamalar</span>
        </button>
      </nav>
    </div>
  );
}

// =====================================================================
// BAHOLAR & GURUHLAR BO'LIMI (12 Darslik Oylik Jurnal)
// =====================================================================
function GradesSection({ onDataChange }) {
  const getCurrentMonthStr = () => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(new Date());
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    return `${year}-${month}`;
  };

  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
  const currentMonthRef = useRef(getCurrentMonthStr());
  const [availableMonths, setAvailableMonths] = useState([getCurrentMonthStr()]);
  const [newMonthInput, setNewMonthInput] = useState('');
  const [showAddMonth, setShowAddMonth] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [studentStats, setStudentStats] = useState({
    totalStudents: 0,
    improvedCount: 0,
    declinedCount: 0,
    unchangedCount: 0,
    noDataCount: 0,
    students: [],
  });
  const [msg, setMsg] = useState({ text: '', type: 'success' });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const formatMonthName = (mStr) => {
    if (!mStr) return '';
    const monthsMap = {
      '01': 'Yanvar', '02': 'Fevral', '03': 'Mart', '04': 'Aprel',
      '05': 'May', '06': 'Iyun', '07': 'Iyul', '08': 'Avgust',
      '09': 'Sentyabr', '10': 'Oktyabr', '11': 'Noyabr', '12': 'Dekabr'
    };
    const parts = mStr.split('-');
    if (parts.length === 2 && monthsMap[parts[1]]) {
      return `${monthsMap[parts[1]]} ${parts[0]}`;
    }
    return mStr;
  };

  const showToast = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: 'success' }), 3500);
  };

  const loadGroups = async () => {
    try {
      const res = await fetch(`${API}/api/admin/groups`, {
        headers: { 'x-admin-key': sessionStorage.getItem('admin_auth') || '' }
      });
      if (res.status === 401) {
        sessionStorage.removeItem('admin_auth');
        window.location.href = '/admin';
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Guruhlarni yuklashda xatolik');
      const grps = data.groups || [];
      setGroups(grps);
      if (onDataChange) onDataChange();
      // Birinchi guruhni avtomatik tanlash
      if (grps.length > 0 && !selectedGroup) {
        loadStudents(grps[0].id, selectedMonth);
      }
    } catch (err) {
      showToast(err.message || 'Server bilan bog‘lanishda xatolik', 'error');
    }
  };

  const loadStudents = async (groupId, month = selectedMonth) => {
    setSelectedGroup(groupId);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/groups/${groupId}/students?month=${encodeURIComponent(month)}`, {
        headers: { 'x-admin-key': sessionStorage.getItem('admin_auth') || '' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'O‘quvchilarni yuklashda xatolik');
      setStudents(data.students || []);
      if (data.available_months && data.available_months.length > 0) {
        setAvailableMonths(data.available_months);
      }
      if (groupId) {
        const statsRes = await fetch(`${API}/api/admin/groups/${groupId}/stats?month=${encodeURIComponent(month)}`, {
          headers: { 'x-admin-key': sessionStorage.getItem('admin_auth') || '' }
        });
        const statsData = await statsRes.json();
        if (statsRes.ok && statsData.stats) {
          setStudentStats(statsData.stats);
        }
      }
    } catch (err) {
      setStudents([]);
      setStudentStats({ totalStudents: 0, improvedCount: 0, declinedCount: 0, unchangedCount: 0, noDataCount: 0, students: [] });
      showToast(err.message || 'O‘quvchilarni olishda xatolik', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentMonth = getCurrentMonthStr();
      if (currentMonth === currentMonthRef.current) return;

      currentMonthRef.current = currentMonth;
      setSelectedMonth(currentMonth);
      setAvailableMonths((previous) => (
        previous.includes(currentMonth) ? previous : [currentMonth, ...previous]
      ));
      if (selectedGroup) {
        loadStudents(selectedGroup, currentMonth);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [selectedGroup]);

  const handleMonthSelect = (month) => {
    setSelectedMonth(month);
    if (selectedGroup) {
      loadStudents(selectedGroup, month);
    }
  };

  const handleAddNewMonth = (e) => {
    if (e) e.preventDefault();
    if (!newMonthInput.trim()) return;
    const m = newMonthInput.trim();
    if (!availableMonths.includes(m)) {
      setAvailableMonths((prev) => [m, ...prev]);
    }
    setSelectedMonth(m);
    setNewMonthInput('');
    setShowAddMonth(false);
    if (selectedGroup) {
      loadStudents(selectedGroup, m);
    }
  };

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
        loadStudents(data.group.id, selectedMonth);
      }
    } catch (err) {
      showToast(err.message || 'Xatolik yuz berdi', 'error');
    }
    setLoading(false);
  };

  const deleteGroup = async (groupId, groupName, e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    const confirmed = window.confirm(`Haqiqatan ham "${groupName}" guruhini va uning barcha oylik baholarini butunlay o'chirmoqchimisiz?`);
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/groups/${groupId}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': sessionStorage.getItem('admin_auth') || '' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Guruhni o‘chirishda xatolik');
      
      showToast(`"${groupName}" guruhi muvaffaqiyatli o'chirildi!`);
      
      // Ro'yxatdan zudlik bilan o'chirish (optimistic UI update)
      setGroups((prev) => {
        const remaining = prev.filter((g) => g.id !== groupId);
        if (selectedGroup === groupId) {
          if (remaining.length > 0) {
            setSelectedGroup(remaining[0].id);
            loadStudents(remaining[0].id, selectedMonth);
          } else {
            setSelectedGroup(null);
            setStudents([]);
            setStudentStats({ totalStudents: 0, improvedCount: 0, declinedCount: 0, unchangedCount: 0, noDataCount: 0, students: [] });
          }
        }
        return remaining;
      });

      if (onDataChange) onDataChange();
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
          month_key: selectedMonth
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'O‘quvchi qo‘shishda xatolik');
      setNewStudentName('');
      showToast("O'quvchi guruhga qo'shildi!");
      loadStudents(selectedGroup, selectedMonth);
    } catch (err) {
      showToast(err.message || 'Xatolik yuz berdi', 'error');
    }
    setLoading(false);
  };

  const updateLessonGrade = async (studentId, lessonNum, grade) => {
    // Optimistic UI update
    setStudents((prev) =>
      prev.map((s) => {
        const sId = s.telegram_id || s.id;
        if (sId === studentId) {
          const updatedGrades = { ...(s.lesson_grades || {}) };
          if (grade === null || grade === '' || grade === undefined) {
            delete updatedGrades[lessonNum];
            delete updatedGrades[String(lessonNum)];
          } else {
            updatedGrades[String(lessonNum)] = Number(grade);
          }
          const validGrades = Object.values(updatedGrades).map(Number).filter((n) => Number.isFinite(n) && n >= 0 && n <= 5);
          const newTotal = validGrades.reduce((a, b) => a + b, 0);
          return {
            ...s,
            lesson_grades: updatedGrades,
            current_month_points: newTotal,
            total_points: newTotal,
          };
        }
        return s;
      })
    );

    try {
      const res = await fetch(`${API}/api/admin/students/${studentId}/lesson-grade`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': sessionStorage.getItem('admin_auth') || ''
        },
        body: JSON.stringify({
          group_id: selectedGroup,
          lesson_num: lessonNum,
          grade: grade === '' || grade === undefined ? null : grade,
          month_key: selectedMonth
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bahoni saqlashda xatolik');
      showToast(`${lessonNum}-dars bahosi saqlandi!`);
      // Yangilangan statistikani qayta yuklash
      if (selectedGroup) {
        const statsRes = await fetch(`${API}/api/admin/groups/${selectedGroup}/stats?month=${encodeURIComponent(selectedMonth)}`, {
          headers: { 'x-admin-key': sessionStorage.getItem('admin_auth') || '' }
        });
        const statsData = await statsRes.json();
        if (statsRes.ok && statsData.stats) setStudentStats(statsData.stats);
      }
    } catch (err) {
      showToast(err.message || 'Bahoni saqlashda xatolik', 'error');
      loadStudents(selectedGroup, selectedMonth);
    }
  };

  const deleteStudent = async (studentId, studentName = '') => {
    const promptText = studentName
      ? `"${studentName}" o'quvchisini guruhdan o'chirmoqchimisiz?`
      : "Haqiqatan ham ushbu o'quvchini guruhdan o'chirmoqchimisiz?";
    if (!window.confirm(promptText)) return;

    // Darhol ekrandan olib tashlash (tezkor optimistic UI)
    setStudents((prev) => prev.filter((s) => String(s.telegram_id || s.id) !== String(studentId)));

    try {
      const res = await fetch(`${API}/api/admin/groups/${selectedGroup}/students/${studentId}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': sessionStorage.getItem('admin_auth') || '' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'O‘quvchini o‘chirishda xatolik');
      showToast(studentName ? `"${studentName}" guruhdan o'chirildi!` : "O'quvchi guruhdan muvaffaqiyatli o'chirildi!");

      // Yangilangan statistikani qayta yuklash
      if (selectedGroup) {
        const statsRes = await fetch(`${API}/api/admin/groups/${selectedGroup}/stats?month=${encodeURIComponent(selectedMonth)}`, {
          headers: { 'x-admin-key': sessionStorage.getItem('admin_auth') || '' }
        });
        const statsData = await statsRes.json();
        if (statsRes.ok && statsData.stats) setStudentStats(statsData.stats);
      }
    } catch (err) {
      showToast(err.message || 'O‘quvchini o‘chirishda xatolik', 'error');
      loadStudents(selectedGroup, selectedMonth);
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
          <h2>📚 Baholar & 12 Darslik Oylik Jurnal</h2>
          <p className="admin-section-desc">
            Guruhlar yarating, o'quvchilarni qo'shing va har bir oy uchun 12 ta dars bo'yicha baholang.
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

      {/* Asosiy 2 ustunli blok */}
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
                  <div
                    key={g.id}
                    className={`group-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => loadStudents(g.id, selectedMonth)}
                    style={{ cursor: 'pointer', position: 'relative' }}
                  >
                    <div className="group-item-info">
                      <span className="group-name">{g.name}</span>
                      <span className="group-code">ID: #{g.id} · Bot kodi: <strong>{g.access_code || 'Kod yo‘q'}</strong></span>
                    </div>
                    <div className="group-item-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        className="group-delete-btn"
                        onClick={(e) => deleteGroup(g.id, g.name, e)}
                        title="Guruhni o'chirish"
                      >
                        🗑️
                      </button>
                      <span className="group-item-chevron">{isSelected ? '●' : '→'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* O'ng ustun: Tanlangan guruh o'quvchilari va 12 dars jurnali */}
        <div className="admin-card col-students">
          {selectedGroup ? (
            <>
              {/* Guruh boshqaruv paneli */}
              <div className="students-header-bar">
                <div>
                  <h3 className="admin-card-title" style={{ margin: 0 }}>
                    <span>👥 {currentGroupObj ? currentGroupObj.name : 'Guruh'}</span>
                  </h3>
                  <span className="group-id-pill">Guruh ID: #{selectedGroup}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="badge-count">{students.length} nafar o'quvchi</span>
                  <button
                    type="button"
                    className="admin-btn small danger"
                    onClick={(e) => deleteGroup(selectedGroup, currentGroupObj ? currentGroupObj.name : 'Guruh', e)}
                    title="Shu guruhni o'chirish"
                  >
                    🗑️ Guruhni o'chirish
                  </button>
                </div>
              </div>

              {/* OYLIK BAHOLASH VA OYNI TANLASH PANELI */}
              <div className="month-selector-bar">
                <div className="month-selector-header">
                  <span className="month-selector-label">📅 Baholash Oyi:</span>
                  <strong className="current-month-display">{formatMonthName(selectedMonth)}</strong>
                </div>

                <div className="month-pills-list">
                  {availableMonths.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`month-pill-btn ${selectedMonth === m ? 'active' : ''}`}
                      onClick={() => handleMonthSelect(m)}
                    >
                      {formatMonthName(m)}
                      {m === getCurrentMonthStr() ? ' (Hozirgi)' : ''}
                    </button>
                  ))}

                  {!showAddMonth ? (
                    <button
                      type="button"
                      className="month-pill-btn add-new-month"
                      onClick={() => setShowAddMonth(true)}
                    >
                      ➕ Boshqa oy qo'shish
                    </button>
                  ) : (
                    <form onSubmit={handleAddNewMonth} className="add-month-inline-form">
                      <input
                        type="month"
                        value={newMonthInput}
                        onChange={(e) => setNewMonthInput(e.target.value)}
                        className="admin-input-compact"
                        required
                        autoFocus
                      />
                      <button type="submit" className="admin-btn small primary">Ochish</button>
                      <button type="button" className="admin-btn small" onClick={() => setShowAddMonth(false)}>✕</button>
                    </form>
                  )}
                </div>
              </div>

              {/* Yangi o'quvchi qo'shish shakli — faqat ism */}
              <form onSubmit={addStudent} className="add-student-form">
                <input
                  type="text"
                  placeholder="O'quvchi ismi (masalan: Fotima)... *"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="admin-input"
                  style={{ flex: 1 }}
                  required
                />
                <button type="submit" className="admin-btn primary" disabled={loading}>
                  + O'quvchi qo'shish
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

              {/* O'quvchilar o'sishi faqat hozirgacha baho qo'yilgan darslar asosida */}
              <div className="grade-chart-card">
                <div className="grade-chart-header">
                  <div>
                    <h4>📈 {currentGroupObj ? currentGroupObj.name : 'Guruh'} — o‘quvchilar o‘sishi</h4>
                    <p>{formatMonthName(selectedMonth)} oyida hozirgacha baho qo‘yilgan darslar taqqoslanadi</p>
                  </div>
                  <div className="chart-stat-badges">
                    <div className="mini-stat-badge">
                      <span className="mini-stat-title">O‘sdi</span>
                      <strong className="mini-stat-val text-green">{studentStats.improvedCount} nafar</strong>
                    </div>
                    <div className="mini-stat-badge">
                      <span className="mini-stat-title">Pasaydi</span>
                      <strong className="mini-stat-val text-gold">{studentStats.declinedCount} nafar</strong>
                    </div>
                    <div className="mini-stat-badge">
                      <span className="mini-stat-title">O‘zgarmadi</span>
                      <strong className="mini-stat-val">{studentStats.unchangedCount} nafar</strong>
                    </div>
                    <div className="mini-stat-badge">
                      <span className="mini-stat-title">Taqqoslash yo‘q</span>
                      <strong className="mini-stat-val">{studentStats.noDataCount} nafar</strong>
                    </div>
                  </div>
                </div>

                <div className="student-progress-chart" role="img" aria-label="O‘quvchilar o‘sish holati diagrammasi">
                  {[
                    { label: 'O‘sdi', count: studentStats.improvedCount, className: 'progress-chart-up' },
                    { label: 'O‘zgarmadi', count: studentStats.unchangedCount, className: 'progress-chart-same' },
                    { label: 'Pasaydi', count: studentStats.declinedCount, className: 'progress-chart-down' },
                    { label: 'Trend uchun baho kam', count: studentStats.noDataCount, className: 'progress-chart-no-data' },
                  ].map((item) => {
                    const height = studentStats.totalStudents > 0
                      ? Math.max(item.count > 0 ? 8 : 0, (item.count / studentStats.totalStudents) * 100)
                      : 0;

                    return (
                      <div className="student-progress-chart-item" key={item.label}>
                        <strong>{item.count}</strong>
                        <div className="student-progress-chart-track">
                          <div
                            className={`student-progress-chart-bar ${item.className}`}
                            style={{ height: `${height}%` }}
                          />
                        </div>
                        <span>{item.label}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="student-progress-table-wrap">
                  {studentStats.students.length === 0 ? (
                    <p className="student-progress-empty">Bu guruhda o‘quvchilar yo‘q.</p>
                  ) : (
                    <table className="student-progress-table">
                      <thead>
                        <tr>
                          <th>O‘quvchi</th>
                          <th>Avvalgi darslar o‘rtachasi</th>
                          <th>So‘nggi darslar o‘rtachasi</th>
                          <th>Hozirgacha o‘rtacha</th>
                          <th>Farq</th>
                          <th>Holat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentStats.students.map((student) => {
                          const statusLabels = {
                            improved: ['O‘sdi', 'progress-up'],
                            declined: ['Pasaydi', 'progress-down'],
                            unchanged: ['O‘zgarmadi', 'progress-same'],
                            'no-data': ['Trend uchun baho kam', 'progress-no-data'],
                          };
                          const [statusLabel, statusClass] = statusLabels[student.status];
                          const formatAverage = (value) => value === null ? '—' : `${value.toFixed(2)} / 5`;
                          const formatDifference = (value) => {
                            if (value === null) return '—';
                            if (value === 0) return '0';
                            return `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
                          };

                          return (
                            <tr key={student.telegram_id}>
                              <td className="progress-student-name">{student.full_name}</td>
                              <td>{formatAverage(student.earlierAverage)} <small>({student.earlierGradedLessons} dars)</small></td>
                              <td>{formatAverage(student.recentAverage)} <small>({student.recentGradedLessons} dars)</small></td>
                              <td>{formatAverage(student.currentAverage)}</td>
                              <td className={student.difference > 0 ? 'progress-difference-up' : student.difference < 0 ? 'progress-difference-down' : ''}>
                                {formatDifference(student.difference)}
                              </td>
                              <td><span className={`progress-status ${statusClass}`}>{statusLabel}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* O'quvchilar ro'yxati — 12 ta dars jurnali */}
              {filteredStudents.length === 0 ? (
                <div className="admin-empty-state">
                  <span className="empty-icon">👨‍🎓</span>
                  <p>Bu guruhda {formatMonthName(selectedMonth)} uchun o'quvchilar topilmadi.</p>
                  <small>Yuqoridagi shakldan o'quvchi ismini kiritib qo'shing.</small>
                </div>
              ) : (
                <div className="students-cards-container">
                  {filteredStudents
                    .sort((a, b) => (b.current_month_points || 0) - (a.current_month_points || 0))
                    .map((s, idx) => {
                      const sId = s.telegram_id || s.id || idx;
                      const grades = s.lesson_grades || {};
                      const gradedLessons = Object.values(grades).filter((v) => v !== null && v !== undefined && v !== '');
                      const totalPts = s.current_month_points || 0;
                      const avgGrade = gradedLessons.length > 0 ? (totalPts / gradedLessons.length).toFixed(1) : '0';

                      return (
                        <div className="student-journal-card" key={sId}>
                          <div className="student-journal-top">
                            <div className="student-main-info">
                              <span className={`rank-badge rank-${idx + 1}`}>
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                              </span>
                              <div>
                                <strong className="student-name">{s.full_name}</strong>
                                <div className="student-journal-meta">
                                  <span className="badge-total-pts">Talaba raqami: #{s.student_code || '—'}</span>
                                  <span className="badge-total-pts">Jami: {totalPts} ball</span>
                                  <span className="badge-avg-pts">O'rtacha: {avgGrade} ★</span>
                                  <span className="badge-lessons-count">{gradedLessons.length}/12 dars baholandi</span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="admin-btn-icon-delete"
                              onClick={() => deleteStudent(sId, s.full_name)}
                              title="O‘quvchini guruhdan o‘chirish"
                            >
                              🗑️
                            </button>
                          </div>

                          {/* 12 ta Dars Katakchalari */}
                          <div className="lessons-journal-grid">
                            {Array.from({ length: 12 }, (_, i) => {
                              const lessonNum = i + 1;
                              const currentGrade = grades[lessonNum] ?? grades[String(lessonNum)];
                              const hasGrade = currentGrade !== undefined && currentGrade !== null && currentGrade !== '';

                              return (
                                <div className={`lesson-cell ${hasGrade ? 'has-grade grade-' + currentGrade : 'empty'}`} key={lessonNum}>
                                  <div className="lesson-cell-header">
                                    <span className="lesson-cell-title">{lessonNum}-dars</span>
                                    {hasGrade && <span className="lesson-score-pill">{currentGrade} ball</span>}
                                  </div>
                                  <select
                                    className="lesson-grade-select"
                                    value={hasGrade ? currentGrade : ''}
                                    onChange={(e) => updateLessonGrade(sId, lessonNum, e.target.value)}
                                    title={`${lessonNum}-dars bahosini tanlang (${formatMonthName(selectedMonth)})`}
                                  >
                                    <option value="">— (Bo'sh)</option>
                                    <option value="5">5 ball ★★★★★</option>
                                    <option value="4">4 ball ★★★★</option>
                                    <option value="3">3 ball ★★★</option>
                                    <option value="2">2 ball ★★</option>
                                    <option value="1">1 ball ★</option>
                                    <option value="0">0 ball (Qatnashmadi)</option>
                                  </select>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
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
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

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

  const uploadResult = async (event) => {
    event.preventDefault();
    if (!file) {
      setMessage('Natija rasmini tanlang.');
      return;
    }

    setUploading(true);
    setMessage('');
    const form = new FormData();
    form.append('image', file);
    form.append('caption', caption.trim());

    try {
      const response = await fetch(`${API}/api/admin/results`, {
        method: 'POST',
        headers: { 'x-admin-key': sessionStorage.getItem('admin_auth') || '' },
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Natijani yuklab bo‘lmadi');
      setFile(null);
      setCaption('');
      setMessage('Natija saytga yuklandi.');
      await loadResults();
    } catch (error) {
      setMessage(error.message || 'Natijani yuklashda xatolik yuz berdi.');
    } finally {
      setUploading(false);
    }
  };

  const deleteResult = async (id) => {
    if (!window.confirm("Haqiqatan ham ushbu natijani o'chirmoqchimisiz?")) return;
    try {
      const response = await fetch(`${API}/api/admin/results/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': sessionStorage.getItem('admin_auth') || '' },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Natijani o‘chirib bo‘lmadi');
      setMessage('Natija o‘chirildi.');
      await loadResults();
    } catch (error) {
      setMessage(error.message || 'Natijani o‘chirishda xatolik yuz berdi.');
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div>
          <h2>🏆 O'quvchilar Natijalari (Skrinshotlar)</h2>
          <p className="admin-section-desc">
            Natijalarni shu saytdan yuklang — ular ommaga saytda ko'rsatiladi.
          </p>
        </div>
      </div>

      {message && <div className="admin-alert">{message}</div>}

      <div className="admin-card">
        <h3 className="admin-card-title">➕ Yangi natija yuklash</h3>
        <form onSubmit={uploadResult} className="admin-form-col">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const selectedFile = event.target.files?.[0] || null;
              if (selectedFile && selectedFile.size > 5 * 1024 * 1024) {
                setMessage('Rasm hajmi 5 MB dan oshmasligi kerak.');
                event.target.value = '';
                setFile(null);
                return;
              }
              setFile(selectedFile);
              setMessage('');
            }}
            required
          />
          <input
            type="text"
            placeholder="Izoh (masalan: o‘quvchi — C1 sertifikati)"
            value={caption}
            maxLength={500}
            onChange={(event) => setCaption(event.target.value)}
            className="admin-input"
          />
          <button type="submit" className="admin-btn primary" disabled={uploading || !file}>
            {uploading ? 'Yuklanmoqda...' : 'Saytga yuklash'}
          </button>
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
            <small>Birinchi natijani yuqoridagi forma orqali yuklang.</small>
          </div>
        ) : (
          <div className="results-admin-grid">
            {results.map((r) => (
              <div key={r.id} className="result-admin-card">
                <div className="result-img-wrapper">
                  <img
                    src={r.has_image ? `${API}/api/results/${r.id}/image` : `${API}/uploads/${r.filename}`}
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
  const [status, setStatus] = useState('pending');
  const [reviews, setReviews] = useState([]);
  const [msg, setMsg] = useState({ text: '', type: 'success' });
  const [busyReviewId, setBusyReviewId] = useState(null);

  const showToast = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: 'success' }), 3500);
  };

  const loadReviews = async () => {
    try {
      const res = await fetch(`${API}/api/admin/reviews?status=${status}`, {
        headers: { 'x-admin-key': sessionStorage.getItem('admin_auth') || '' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sharhlarni yuklab bo‘lmadi');
      setReviews(data.reviews || []);
      if (onDataChange) onDataChange();
    } catch (err) {
      showToast(err.message || 'Sharhlarni yuklab bo‘lmadi', 'error');
    }
  };

  useEffect(() => {
    loadReviews();
    const interval = setInterval(loadReviews, 15000);
    return () => clearInterval(interval);
  }, [status]);

  const deleteReview = async (id) => {
    if (!window.confirm("Haqiqatan ham ushbu sharhni o'chirmoqchimisiz?")) return;
    setReviews((prev) => prev.filter((r) => r.id !== id));
    try {
      const res = await fetch(`${API}/api/admin/reviews/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': sessionStorage.getItem('admin_auth') || '' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sharh o‘chirishda xatolik');
      showToast("Sharh muvaffaqiyatli o'chirildi!");
      if (onDataChange) onDataChange();
    } catch (err) {
      showToast(err.message || 'O‘chirishda xatolik', 'error');
      loadReviews();
    }
  };

  const updateReviewStatus = async (review, nextStatus) => {
    setBusyReviewId(review.id);
    try {
      const res = await fetch(`${API}/api/admin/reviews/${review.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': sessionStorage.getItem('admin_auth') || '',
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sharh holatini yangilab bo‘lmadi');
      showToast(nextStatus === 'approved' ? 'Sharh saytda e’lon qilindi.' : 'Sharh rad etildi.');
      await loadReviews();
    } catch (err) {
      showToast(err.message || 'Sharh holatini yangilab bo‘lmadi', 'error');
    } finally {
      setBusyReviewId(null);
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div>
          <h2>💬 O'quvchilar Sharhlari</h2>
          <p className="admin-section-desc">Botdan kelgan sharhlar tasdiqlanmaguncha saytda ko‘rinmaydi.</p>
        </div>
      </div>

      {msg.text && (
        <div className={`admin-alert ${msg.type === 'error' ? 'alert-danger' : 'alert-success'}`}>
          <span>{msg.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{msg.text}</span>
        </div>
      )}

      {/* Sharhlar ro'yxati */}
      <div className="admin-card">
        <div className="review-status-filters">
          {[
            ['pending', 'Kutilayotgan'],
            ['approved', 'Saytda e’lon qilingan'],
            ['rejected', 'Rad etilgan'],
            ['all', 'Barchasi'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`admin-btn small ${status === value ? 'primary' : ''}`}
              onClick={() => setStatus(value)}
            >
              {label}
            </button>
          ))}
          <button type="button" className="admin-btn small" onClick={loadReviews}>🔄 Yangilash</button>
        </div>
        <h3 className="admin-card-title">
          <span>Sharhlar: {status === 'pending' ? 'kutilmoqda' : status === 'approved' ? 'e’lon qilingan' : status === 'rejected' ? 'rad etilgan' : 'barcha holatlar'}</span>
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
                    <span className="avatar-circle">{(rev.name || 'O').charAt(0).toUpperCase()}</span>
                    <strong>{rev.name}</strong>
                  </div>
                  <span className="stars-gold">
                    {'★'.repeat(rev.stars || 5)}
                    {'☆'.repeat(5 - (rev.stars || 5))}
                  </span>
                </div>
                <p className="review-admin-text">"{rev.text}"</p>
                <small className={`review-status-badge review-status-${rev.status}`}>
                  {rev.status === 'pending' ? 'Tasdiq kutilmoqda' : rev.status === 'approved' ? 'Saytda ko‘rinadi' : 'Rad etilgan'}
                  {rev.telegram_id ? ' · Telegram botdan' : ''}
                </small>
                <div className="review-admin-footer">
                  {rev.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        className="admin-btn primary small"
                        disabled={busyReviewId === rev.id}
                        onClick={() => updateReviewStatus(rev, 'approved')}
                      >
                        ✅ Tasdiqlash
                      </button>
                      <button
                        type="button"
                        className="admin-btn small"
                        disabled={busyReviewId === rev.id}
                        onClick={() => updateReviewStatus(rev, 'rejected')}
                      >
                        Rad etish
                      </button>
                    </>
                  )}
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
            Sayt boshqaruvi va o‘quvchilar uchun Telegram bot bo‘yicha qo‘llanma.
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
            <strong>Eslatma:</strong> Guruhlar, o'quvchilar, baholar va natijalar galereyasidagi rasmlar PostgreSQL bazasida saqlanadi. PDF kitoblar Render diskida saqlanadi; doimiy disk ulanmagan bo'lsa, redeploy vaqtida ularni qayta yuklash kerak bo'lishi mumkin.
          </p>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// SOZLAMALAR BO'LIMI — Parolni o'zgartirish
// =====================================================================
function SettingsSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: 'success' });

  const showToast = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: 'success' }), 4000);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Yangi parollar bir-biriga mos kelmadi!', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Yangi parol kamida 6 ta belgidan iborat bo\'lishi kerak!', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': currentPassword,
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');
      // sessionStorage da yangi parolni saqlash
      sessionStorage.setItem('admin_auth', newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('✅ Parol muvaffaqiyatli o\'zgartirildi! Keyingi kirishda yangi paroldan foydalaning.');
    } catch (err) {
      showToast(err.message || 'Server bilan bog\'lanishda xatolik', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div>
          <h2>⚙️ Sozlamalar</h2>
          <p className="admin-section-desc">Admin panel sozlamalari va xavfsizlik</p>
        </div>
      </div>

      {msg.text && (
        <div className={`admin-toast ${msg.type}`} style={{ marginBottom: '20px', position: 'relative', top: 0 }}>
          {msg.text}
        </div>
      )}

      <div className="admin-card" style={{ maxWidth: '520px' }}>
        <h3 className="admin-card-title">🔑 Parolni o'zgartirish</h3>
        <p style={{ color: '#6B7280', marginBottom: '20px', fontSize: '0.95rem', lineHeight: '1.6' }}>
          Hozirgi parolni kiritib, yangi parol o'rnating. Server qayta ishga tushganda parol asl holatiga qaytadi — doimiy o'zgartirish uchun backend <code>.env</code> faylini yangilang.
        </p>

        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="admin-field">
            <label>Hozirgi parol</label>
            <div className="password-input-wrap">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Hozirgi parolni kiriting"
                className="admin-input"
                required
              />
              <button type="button" className="toggle-password-btn" onClick={() => setShowCurrent(!showCurrent)}>
                {showCurrent ? '👁️' : '🔒'}
              </button>
            </div>
          </div>

          <div className="admin-field">
            <label>Yangi parol</label>
            <div className="password-input-wrap">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Yangi parol (kamida 6 ta belgi)"
                className="admin-input"
                minLength={6}
                required
              />
              <button type="button" className="toggle-password-btn" onClick={() => setShowNew(!showNew)}>
                {showNew ? '👁️' : '🔒'}
              </button>
            </div>
          </div>

          <div className="admin-field">
            <label>Yangi parolni tasdiqlang</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Yangi parolni qayta kiriting"
              className="admin-input"
              required
            />
          </div>

          <button
            type="submit"
            className="admin-btn primary"
            disabled={loading}
            style={{ marginTop: '6px' }}
          >
            {loading ? 'O\'zgartirilmoqda...' : '🔑 Parolni o\'zgartirish'}
          </button>
        </form>
      </div>

      <div className="admin-card" style={{ maxWidth: '520px', marginTop: '20px' }}>
        <h3 className="admin-card-title">ℹ️ Muhim eslatma</h3>
        <div className="admin-info-box">
          <p style={{ lineHeight: '1.7' }}>
            <strong>Server qayta ishga tushganda</strong> parol <code>.env</code> faylidagi
            <code> ADMIN_PASSWORD</code> qiymatiga qaytadi. Doimiy o'zgartirish uchun
            Render dashboard yoki <code>backend/.env</code> faylida
            <code> ADMIN_PASSWORD</code> ni yangilang.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PDF DARSLIKLAR VA KITOBLAR BO'LIMI (BOOKS SECTION)
// ============================================================
function BooksSection() {
  const [books, setBooks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [bookTitle, setBookTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [attachModalBook, setAttachModalBook] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState('');

  const authKey = sessionStorage.getItem('admin_auth') || '';

  const loadData = async () => {
    setLoading(true);
    try {
      const [booksRes, groupsRes] = await Promise.all([
        fetch(`${API}/api/admin/books`, { headers: { 'x-admin-key': authKey } }),
        fetch(`${API}/api/admin/groups`, { headers: { 'x-admin-key': authKey } }),
      ]);
      const booksData = await booksRes.json();
      const groupsData = await groupsRes.json();
      setBooks(booksData.books || []);
      setGroups(groupsData.groups || []);
    } catch (err) {
      setMessage({ type: 'danger', text: 'Ma\'lumotlarni yuklashda xatolik: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setMessage({ type: 'danger', text: 'Iltimos, PDF fayl tanlang!' });
      return;
    }
    setUploading(true);
    setMessage({ type: '', text: '' });

    const formData = new FormData();
    formData.append('title', bookTitle || selectedFile.name.replace(/\.pdf$/i, ''));
    formData.append('pdf', selectedFile);

    try {
      const res = await fetch(`${API}/api/admin/books`, {
        method: 'POST',
        headers: { 'x-admin-key': authKey },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kitobni yuklab bo‘lmadi');
      setMessage({ type: 'success', text: data.message || 'Kitob muvaffaqiyatli yuklandi!' });
      setBookTitle('');
      setSelectedFile(null);
      // File input reset
      const fileInput = document.getElementById('book-pdf-input');
      if (fileInput) fileInput.value = '';
      loadData();
    } catch (err) {
      setMessage({ type: 'danger', text: err.message });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Haqiqatan ham "${title}" kitobini o'chirmoqchimisiz?`)) return;
    try {
      const res = await fetch(`${API}/api/admin/books/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': authKey },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'O‘chirishda xatolik');
      setMessage({ type: 'success', text: 'Kitob muvaffaqiyatli o‘chirildi!' });
      loadData();
    } catch (err) {
      setMessage({ type: 'danger', text: err.message });
    }
  };

  const handleAttach = async (e) => {
    e.preventDefault();
    if (!attachModalBook) return;
    try {
      const res = await fetch(`${API}/api/admin/groups/${selectedGroupId}/attach-book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': authKey,
        },
        body: JSON.stringify({ bookId: attachModalBook.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Biriktirishda xatolik');
      setMessage({ type: 'success', text: data.message || 'Kitob guruhga muvaffaqiyatli biriktirildi!' });
      setAttachModalBook(null);
      setSelectedGroupId('');
      loadData();
    } catch (err) {
      setMessage({ type: 'danger', text: err.message });
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="admin-tab-content">
      <div className="admin-tab-header">
        <div>
          <h2>📚 PDF Darsliklar va Kitoblar</h2>
          <p>Arab tili o'quv qo'llanmalari, kitoblarni yuklash va guruhlarga biriktirish.</p>
        </div>
        <button type="button" className="admin-btn small" onClick={loadData}>🔄 Yangilash</button>
      </div>

      {message.text && (
        <div className={`admin-alert alert-${message.type}`} style={{ marginBottom: '20px' }}>
          <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{message.text}</span>
        </div>
      )}

      {/* Yangi PDF Kitob yuklash formasi */}
      <div className="admin-card" style={{ marginBottom: '28px' }}>
        <h3 className="admin-card-title">📤 Yangi PDF Kitob yuklash</h3>
        <form onSubmit={handleUpload} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
          <div className="admin-field" style={{ margin: 0 }}>
            <label>Kitob / Darslik nomi:</label>
            <input
              type="text"
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              placeholder="Masalan: Boshlang'ich Arab tili qo'llanmasi"
              className="admin-input"
            />
          </div>

          <div className="admin-field" style={{ margin: 0 }}>
            <label>PDF Fayl:</label>
            <input
              id="book-pdf-input"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setSelectedFile(e.target.files[0] || null)}
              required
              className="admin-input"
              style={{ padding: '8px 12px' }}
            />
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="admin-btn primary"
            style={{ height: '42px', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span>{uploading ? '⏳' : '📥'}</span>
            <span>{uploading ? 'Yuklanmoqda...' : 'Yuklash'}</span>
          </button>
        </form>
      </div>

      {/* Yuklangan kitoblar ro'yxati */}
      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="admin-card-title" style={{ margin: 0 }}>
            📖 Yuklangan Kitoblar Kutubxonasi ({books.length} ta)
          </h3>
        </div>

        {loading ? (
          <div className="admin-empty-state"><p>Yuklanmoqda...</p></div>
        ) : books.length === 0 ? (
          <div className="admin-empty-state">
            <span className="empty-icon">📚</span>
            <p>Hozircha hech qanday PDF kitob yuklanmagan.</p>
            <small>Yuqoridagi formadan foydalanib birinchi darslikni yuklang.</small>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
            {books.map((b) => (
              <div
                key={b.id}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '1.8rem' }}>📕</div>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: '#0f172a' }}>{b.title}</h4>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Hajmi: {formatFileSize(b.file_size)}</span>
                    </div>
                  </div>

                  {b.attachedGroups && b.attachedGroups.length > 0 && (
                    <div style={{ marginTop: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: '600' }}>Biriktirilgan guruhlar: </span>
                      {b.attachedGroups.map((g) => (
                        <span
                          key={g.id}
                          style={{
                            display: 'inline-block',
                            background: '#e0f2fe',
                            color: '#0369a1',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            marginRight: '6px',
                            marginTop: '4px',
                          }}
                        >
                          👥 {g.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                  <a
                    href={`${API}${b.pdf_path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="admin-btn small"
                    style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}
                  >
                    📄 Ochish
                  </a>

                  <button
                    type="button"
                    className="admin-btn small"
                    style={{ background: '#f1f5f9', color: '#0f172a' }}
                    onClick={() => {
                      setAttachModalBook(b);
                      setSelectedGroupId(groups[0]?.id || '');
                    }}
                  >
                    👥 Guruhga
                  </button>

                  <button
                    type="button"
                    className="admin-btn small danger"
                    onClick={() => handleDelete(b.id, b.title)}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Guruhga biriktirish modali */}
      {attachModalBook && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#0f172a' }}>
              👥 Guruhga kitob biriktirish
            </h3>
            <p style={{ margin: '0 0 18px 0', color: '#64748b', fontSize: '0.88rem' }}>
              <strong>"{attachModalBook.title}"</strong> kitobini qaysi o'quv guruhiga biriktirmoqchisiz?
            </p>

            <form onSubmit={handleAttach}>
              <div className="admin-field">
                <label>Guruhni tanlang:</label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="admin-input"
                  required
                >
                  <option value="">-- Guruhni tanlang --</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => setAttachModalBook(null)}
                >
                  Bekor qilish
                </button>
                <button type="submit" className="admin-btn primary">
                  ✅ Biriktirish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
