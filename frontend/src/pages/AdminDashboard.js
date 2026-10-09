import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css';

const API = process.env.REACT_APP_API_URL || '';

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
    if (!authKey) {
      navigate('/admin');
      return;
    }
    try {
      const resG = await fetch(`${API}/api/admin/groups`, { headers: { 'x-admin-key': authKey } });
      if (resG.status === 401) {
        sessionStorage.removeItem('admin_auth');
        navigate('/admin');
        return;
      }
      const groupsData = await resG.json();
      const [resR, resRev] = await Promise.allSettled([
        fetch(`${API}/api/results`).then(r => r.json()),
        fetch(`${API}/api/reviews`).then(r => r.json()),
      ]);

      let groupCount = (groupsData && groupsData.groups) ? groupsData.groups.length : 0;
      let resultsCount = (resR.status === 'fulfilled' && resR.value.results) ? resR.value.results.length : 0;
      let reviewsCount = (resRev.status === 'fulfilled' && resRev.value.reviews) ? resRev.value.reviews.length : 0;

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
          {activeTab === 'videos' && <VideosSection />}
          {activeTab === 'settings' && <SettingsSection />}
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
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
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
                      <span className="group-code">ID: #{g.id}</span>
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
    setResults((prev) => prev.filter((r) => r.id !== id));
    try {
      const res = await fetch(`${API}/api/admin/results/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': sessionStorage.getItem('admin_auth') || '' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Natijani o‘chirishda xatolik');
      showToast("Natija muvaffaqiyatli o'chirildi!");
      if (onDataChange) onDataChange();
    } catch (err) {
      showToast(err.message || 'O‘chirishda xatolik', 'error');
      loadResults();
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
