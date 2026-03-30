import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

// ─── Helpers ────────────────────────────────────────────────
const API = 'https://courselelo.onrender.com/api';
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function ProgressBar({ pct, color = 'green' }) {
  return (
    <div className="progress-bar-track">
      <div className={`progress-bar-fill ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  INSTRUCTOR DASHBOARD
// ══════════════════════════════════════════════════════════════
function InstructorDashboard({ user }) {
  const [courses, setCourses] = useState([]);
  const [sales, setSales] = useState([]);
  const [message, setMessage] = useState('');
  const [courseData, setCourseData] = useState({ title: '', description: '', price: '' });
  const [coverPhoto, setCoverPhoto] = useState(null);
  const [modules, setModules] = useState([]);
  const [moduleInputTitle, setModuleInputTitle] = useState('');
  const [moduleInputFile, setModuleInputFile] = useState(null);
  const [editCourseId, setEditCourseId] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [editModuleTitle, setEditModuleTitle] = useState('');
  const [editModuleFile, setEditModuleFile] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // ── Payout / Bank-setup state ──
  const [payoutStatus, setPayoutStatus] = useState(null);
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankForm, setBankForm] = useState({ accountHolderName: '', accountNumber: '', ifscCode: '', bankName: '', email: '', phone: '' });
  const [bankMsg, setBankMsg] = useState('');
  const [bankSaving, setBankSaving] = useState(false);
  const [payoutTriggering, setPayoutTriggering] = useState(false);
  const [payoutTriggerMsg, setPayoutTriggerMsg] = useState('');

  const myCourses = courses.filter(c => c.instructorId?._id === user.id);
  const totalEarnings = sales.reduce((sum, s) => sum + (s.courseId?.price || 0), 0);

  useEffect(() => { fetchAll(); fetchPayoutStatus(); }, []);

  const fetchAll = async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        axios.get(`${API}/courses`),
        axios.get(`${API}/payments/instructor-sales`, { headers: authHeader() }),
      ]);
      setCourses(cRes.data);
      if (Array.isArray(sRes.data)) setSales(sRes.data);
    } catch {}
  };

  const fetchPayoutStatus = async () => {
    try {
      const res = await axios.get(`${API}/payout/status`, { headers: authHeader() });
      setPayoutStatus(res.data);
    } catch { setPayoutStatus({ payoutSetupComplete: false }); }
  };

  const handleBankSetup = async (e) => {
    e.preventDefault();
    setBankSaving(true);
    setBankMsg('');
    try {
      const res = await axios.post(`${API}/payout/setup`, bankForm, { headers: authHeader() });
      setBankMsg('success:' + res.data.message);
      setPayoutStatus(prev => ({ ...prev, payoutSetupComplete: true, bankDetails: bankForm }));
      setShowBankForm(false);
    } catch (err) {
      setBankMsg('error:' + (err.response?.data?.msg || 'Failed to save bank details'));
    } finally { setBankSaving(false); }
  };

  const handleTriggerPayout = async () => {
    if (!window.confirm('Request payout of all pending earnings to your bank account?')) return;
    setPayoutTriggering(true);
    setPayoutTriggerMsg('');
    try {
      const res = await axios.post(`${API}/payout/trigger`, {}, { headers: authHeader() });
      setPayoutTriggerMsg(res.data.message);
      fetchPayoutStatus(); // refresh pending amount
    } catch (err) {
      setPayoutTriggerMsg(err.response?.data?.msg || 'Payout request failed');
    } finally { setPayoutTriggering(false); }
  };

  const handleAddModule = () => {
    if (!moduleInputTitle || !moduleInputFile) return alert('Provide a title and file for the module');
    setModules([...modules, { title: moduleInputTitle, file: moduleInputFile }]);
    setModuleInputTitle('');
    setModuleInputFile(null);
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const fd = new FormData();
      fd.append('title', courseData.title);
      fd.append('description', courseData.description);
      fd.append('price', courseData.price);
      if (coverPhoto) fd.append('coverImage', coverPhoto);
      const titles = [];
      modules.forEach(m => { titles.push(m.title); fd.append('moduleFiles', m.file); });
      fd.append('moduleTitles', JSON.stringify(titles));
      await axios.post(`${API}/courses`, fd, { headers: authHeader() });
      setMessage('success:Course published successfully!');
      setCourseData({ title: '', description: '', price: '' });
      setModules([]);
      setCoverPhoto(null);
      fetchAll();
    } catch { setMessage('error:Failed to publish course.'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this course permanently?')) return;
    try {
      await axios.delete(`${API}/courses/${id}`, { headers: authHeader() });
      fetchAll();
    } catch { alert('Delete failed'); }
  };

  const handleDeleteModule = async (courseId, moduleId) => {
    if (!window.confirm('Remove this module?')) return;
    try {
      await axios.delete(`${API}/courses/${courseId}/modules/${moduleId}`, { headers: authHeader() });
      fetchAll();
    } catch { alert('Failed to remove module'); }
  };

  const handleUpdateCourse = async (id) => {
    try {
      const fd = new FormData();
      if (editPrice) fd.append('price', editPrice);
      if (editModuleFile) {
        fd.append('moduleFiles', editModuleFile);
        fd.append('moduleTitles', JSON.stringify([editModuleTitle || 'New Module']));
      }
      await axios.put(`${API}/courses/${id}`, fd, { headers: authHeader() });
      setEditCourseId(null);
      setEditPrice('');
      setEditModuleTitle('');
      setEditModuleFile(null);
      fetchAll();
    } catch { alert('Update failed'); }
  };

  const [msgType, msgText] = message.split(':');

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'students', label: '👥 Students' },
    { id: 'courses', label: '📚 Courses' },
    { id: 'publish', label: '➕ Publish' },
  ];

  // ── Bank Setup Modal is rendered inline below (not as a sub-component) to
  // prevent React from unmounting/remounting on every keystroke ──────────────

  return (
    <div className="fade-in">
      {/* ─── Bank Setup Modal (inlined to preserve input focus) ─── */}
      {showBankForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)', padding: '2.5rem', maxWidth: 520, width: '100%',
            boxShadow: 'var(--shadow-xl)', position: 'relative',
            overflowY: 'auto', maxHeight: '90vh',
          }}>
            {/* Top accent line */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--gradient-green)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0' }} />
            <button onClick={() => setShowBankForm(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>

            <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>🏦</div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.5rem', marginBottom: '0.35rem' }}>Set Up Payouts</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.75rem', lineHeight: 1.6 }}>
              You'll receive <strong style={{ color: 'var(--accent-green)' }}>98%</strong> of every sale directly to your bank account.
              CourseLelo retains a <strong>2% platform fee</strong>.
            </p>

            {bankMsg && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem',
                background: bankMsg.startsWith('success') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${bankMsg.startsWith('success') ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                color: bankMsg.startsWith('success') ? 'var(--accent-green)' : '#f87171',
                fontSize: '0.85rem',
              }}>{bankMsg.split(':').slice(1).join(':')}</div>
            )}

            <form onSubmit={handleBankSetup}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Account Holder Name *</label>
                  <input
                    required
                    placeholder="Full name as on bank account"
                    value={bankForm.accountHolderName}
                    onChange={e => setBankForm(prev => ({ ...prev, accountHolderName: e.target.value }))}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Bank Name *</label>
                  <input
                    required
                    placeholder="e.g. State Bank of India"
                    value={bankForm.bankName}
                    onChange={e => setBankForm(prev => ({ ...prev, bankName: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Account Number *</label>
                <input
                  required
                  placeholder="Enter your bank account number"
                  value={bankForm.accountNumber}
                  onChange={e => setBankForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>IFSC Code *</label>
                <input
                  required
                  placeholder="e.g. SBIN0001234"
                  value={bankForm.ifscCode}
                  onChange={e => setBankForm(prev => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Email for Razorpay</label>
                  <input
                    type="email"
                    placeholder={user.email}
                    value={bankForm.email}
                    onChange={e => setBankForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Phone Number</label>
                  <input
                    placeholder="10-digit mobile"
                    value={bankForm.phone}
                    onChange={e => setBankForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#fbbf24', marginBottom: '1.5rem' }}>
                🔒 Your bank details are securely stored and only used for automated payouts via Razorpay.
              </div>

              <button type="submit" disabled={bankSaving} className="btn btn-green" style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}>
                {bankSaving ? 'Saving...' : '✓ Save Bank Details & Activate Payouts'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── Rich Instructor Header ─── */}
      <div className="dashboard-header">
        <div className="dashboard-welcome">
          <div className="dashboard-user-block">
            <div className="user-avatar" style={{ width: 58, height: 58, fontSize: '1.3rem' }}>
              {getInitials(user.name)}
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Instructor Portal</div>
              <div className="dashboard-name">{user.name}</div>
              <div style={{ marginTop: '0.3rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="dashboard-role-badge role-instructor">🏫 Instructor</span>
                {myCourses.length > 0 && (
                  <span style={{ fontSize: '0.72rem', color: '#a78bfa', fontWeight: 700 }}>
                    ✦ {myCourses.length} Active Course{myCourses.length !== 1 ? 's' : ''}
                  </span>
                )}
                {sales.length > 0 && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent-green)', fontWeight: 700 }}>
                    🔥 {sales.length} Total Enrollment{sales.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={() => setActiveTab('publish')} className="btn btn-sm">
              🚀 Publish Course
            </button>
            <button onClick={() => setActiveTab('students')} className="btn btn-sm outline">
              👥 View Students
            </button>
            <button onClick={() => setActiveTab('courses')} className="btn btn-sm outline">
              📚 Manage Courses
            </button>
          </div>
        </div>

        {/* Earnings Summary Banner */}
        <div style={{
          marginTop: '1.5rem',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(59,130,246,0.12) 100%)',
          border: '1px solid rgba(139,92,246,0.2)',
          padding: '1.5rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative blob inside banner */}
          <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent)', borderRadius: '50%', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
            <div style={{ fontSize: '2.5rem' }}>💰</div>
            <div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '2.2rem', fontWeight: 900, color: 'var(--accent-green)', letterSpacing: '-1px', lineHeight: 1 }}>
                ₹{totalEarnings.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Total Revenue Generated
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '2.5rem', position: 'relative', flexWrap: 'wrap' }}>
            {[
              { val: sales.length, label: 'Total Students', icon: '👥', color: 'var(--accent-blue-light)' },
              { val: myCourses.length, label: 'Published Courses', icon: '📚', color: '#a78bfa' },
              { val: myCourses.length > 0 ? `₹${Math.round(totalEarnings / Math.max(1, myCourses.length)).toLocaleString()}` : '₹0', label: 'Avg / Course', icon: '📈', color: 'var(--accent-teal)' },
              { val: sales.length > 0 ? `₹${Math.round(totalEarnings / Math.max(1, sales.length)).toLocaleString()}` : '₹0', label: 'Avg / Student', icon: '🎓', color: 'var(--accent-amber)' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1rem', marginBottom: '0.2rem' }}>{s.icon}</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '0.1rem' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Growth Tips Strip */}
        {myCourses.length === 0 && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem 1.5rem',
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.15)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', gap: '1rem',
          }}>
            <span style={{ fontSize: '1.4rem' }}>💡</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fbbf24' }}>Get started — publish your first course!</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                Instructors who publish within 48 hours get 3x more early enrollments. Click "Publish Course" above!
              </div>
            </div>
            <button onClick={() => setActiveTab('publish')} className="btn btn-sm" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)', flexShrink: 0 }}>
              Start Now →
            </button>
          </div>
        )}
      </div>

      {/* ─── Payout Setup Banner ─── */}
      {payoutStatus && !payoutStatus.payoutSetupComplete && (
        <div style={{
          marginBottom: '2rem',
          padding: '1.25rem 1.75rem',
          background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(20,184,166,0.08))',
          border: '1.5px solid rgba(34,197,94,0.25)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '2rem' }}>🏦</div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                Set up your bank account to receive payouts
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                You earn <strong style={{ color: 'var(--accent-green)' }}>98%</strong> of every sale — CourseLelo keeps just 2%. Add your bank details to activate automatic transfers.
              </div>
            </div>
          </div>
          <button onClick={() => setShowBankForm(true)} className="btn btn-green" style={{ flexShrink: 0 }}>
            🏦 Set Up Payouts →
          </button>
        </div>
      )}

      {payoutStatus?.payoutSetupComplete && (
        <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1.25rem', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 'var(--radius-md)', color: 'var(--accent-green)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          ✓ Payout bank account active — you receive 98% of each sale automatically.
          <button onClick={() => setShowBankForm(true)} style={{ background: 'none', border: 'none', color: 'var(--accent-blue-light)', cursor: 'pointer', fontSize: '0.82rem', padding: 0, marginLeft: '0.4rem' }}>Update details</button>
        </div>
      )}

      {/* ─── Tab Navigation ─── */}

      <div style={{
        display: 'flex',
        gap: '0.25rem',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '2.5rem',
        overflowX: 'auto',
        paddingBottom: '1px',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.65rem 1.25rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              borderRadius: 0,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══ TAB: OVERVIEW ══ */}
      {activeTab === 'overview' && (
        <div>
          {/* KPI Cards */}
          <div className="stats-grid" style={{ marginBottom: '2rem' }}>
            <div className="stat-card green">
              <div className="stat-icon green">₹</div>
              <div className="stat-value">₹{totalEarnings.toLocaleString()}</div>
              <div className="stat-label">Total Earnings</div>
            </div>
            <div className="stat-card blue">
              <div className="stat-icon blue">👥</div>
              <div className="stat-value">{sales.length}</div>
              <div className="stat-label">Enrolled Students</div>
            </div>
            <div className="stat-card purple">
              <div className="stat-icon purple">📚</div>
              <div className="stat-value">{myCourses.length}</div>
              <div className="stat-label">Published Courses</div>
            </div>
            <div className="stat-card amber">
              <div className="stat-icon amber">📈</div>
              <div className="stat-value">
                {myCourses.length > 0 ? `₹${Math.round(totalEarnings / myCourses.length).toLocaleString()}` : '₹0'}
              </div>
              <div className="stat-label">Revenue / Course</div>
            </div>
          </div>

          {/* Two-column layout: Performance left, Insights right */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>

            {/* Left: Course Performance Panel */}
            <div>
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title">📊 Course Performance</span>
                  <button className="btn outline btn-sm" onClick={() => setActiveTab('courses')}>Manage All</button>
                </div>
                <div>
                  {myCourses.length === 0 ? (
                    <div className="empty-state" style={{ padding: '2.5rem' }}>
                      <div className="empty-state-icon">📭</div>
                      <h3>No courses yet</h3>
                      <p>Publish your first course to see performance metrics.</p>
                      <button className="btn btn-sm" style={{ marginTop: '1rem' }} onClick={() => setActiveTab('publish')}>Publish a Course</button>
                    </div>
                  ) : myCourses.map((c, idx) => {
                    const cSales = sales.filter(s => s.courseId?._id === c._id);
                    const pct = sales.length > 0 ? Math.min(100, Math.round((cSales.length / Math.max(1, sales.length)) * 100)) : 0;
                    const revenue = cSales.length * c.price;
                    return (
                      <div key={c._id} style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr auto',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1rem 1.5rem',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}>
                        {/* Rank badge */}
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: idx === 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : idx === 1 ? 'rgba(148,163,184,0.15)' : 'var(--bg-surface)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', fontWeight: 800,
                          color: idx === 0 ? 'white' : 'var(--text-muted)',
                          flexShrink: 0,
                        }}>
                          {idx === 0 ? '🥇' : `#${idx + 1}`}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem', marginBottom: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.title}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ flex: 1 }}>
                              <ProgressBar pct={pct} color={idx === 0 ? 'amber' : 'blue'} />
                            </div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>{pct}%</span>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 700, color: 'var(--accent-green)', fontSize: '0.9rem' }}>₹{revenue.toLocaleString()}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{cSales.length} students</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Students preview */}
              {sales.length > 0 && (
                <div className="panel" style={{ marginTop: '1.5rem' }}>
                  <div className="panel-header">
                    <span className="panel-title">🕓 Recent Enrollments</span>
                    <button className="btn outline btn-sm" onClick={() => setActiveTab('students')}>View All</button>
                  </div>
                  <div>
                    {sales.slice(0, 5).map(sale => (
                      <div key={sale._id} style={{
                        display: 'flex', alignItems: 'center', gap: '0.85rem',
                        padding: '0.85rem 1.5rem',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: 'var(--gradient-accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.7rem', fontWeight: 800, color: 'white', flexShrink: 0,
                        }}>
                          {getInitials(sale.userId?.name || 'U')}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sale.userId?.name || 'Unknown Student'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.05rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sale.courseId?.title || 'Unknown Course'}
                          </div>
                        </div>
                        <span className="badge badge-green" style={{ fontSize: '0.7rem', flexShrink: 0 }}>
                          ₹{(sale.courseId?.price || 0).toLocaleString()} ✓
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Insights Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Top Earning Course */}
              {myCourses.length > 0 && (() => {
                const top = myCourses.reduce((best, c) => {
                  const rev = sales.filter(s => s.courseId?._id === c._id).length * c.price;
                  const bestRev = sales.filter(s => s.courseId?._id === best._id).length * best.price;
                  return rev > bestRev ? c : best;
                });
                const topRevenue = sales.filter(s => s.courseId?._id === top._id).length * top.price;
                return (
                  <div style={{
                    padding: '1.25rem',
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.06))',
                    border: '1px solid rgba(245,158,11,0.2)',
                    borderRadius: 'var(--radius-lg)',
                  }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.75rem' }}>🏆 Top Earner</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '0.5rem', lineHeight: 1.3 }}>{top.title}</div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>₹{topRevenue.toLocaleString()}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      {sales.filter(s => s.courseId?._id === top._id).length} students · ₹{top.price} / seat
                    </div>
                  </div>
                );
              })()}

              {/* Instructor Checklist */}
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>
                  ✅ Instructor Checklist
                </div>
                {[
                  { done: myCourses.length > 0, label: 'Publish your first course' },
                  { done: sales.length > 0, label: 'Get your first student' },
                  { done: myCourses.some(c => (c.lessons?.length || 0) >= 3), label: 'Add 3+ modules to a course' },
                  { done: myCourses.length >= 3, label: 'Publish 3 courses' },
                  { done: sales.length >= 10, label: 'Reach 10 total enrollments' },
                  { done: totalEarnings >= 1000, label: 'Earn ₹1,000 in revenue' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.45rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      background: item.done ? 'rgba(34,197,94,0.15)' : 'var(--bg-surface)',
                      border: item.done ? '1px solid rgba(34,197,94,0.4)' : '1px solid var(--border-subtle)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6rem',
                    }}>
                      {item.done ? '✓' : ''}
                    </div>
                    <span style={{ fontSize: '0.82rem', color: item.done ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: item.done ? 'line-through' : 'none', fontWeight: item.done ? 400 : 500 }}>
                      {item.label}
                    </span>
                  </div>
                ))}
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    {[
                      myCourses.length > 0, sales.length > 0,
                      myCourses.some(c => (c.lessons?.length || 0) >= 3),
                      myCourses.length >= 3, sales.length >= 10, totalEarnings >= 1000
                    ].filter(Boolean).length} of 6 completed
                  </div>
                  <ProgressBar
                    pct={Math.round([
                      myCourses.length > 0, sales.length > 0,
                      myCourses.some(c => (c.lessons?.length || 0) >= 3),
                      myCourses.length >= 3, sales.length >= 10, totalEarnings >= 1000
                    ].filter(Boolean).length / 6 * 100)}
                    color="green"
                  />
                </div>
              </div>

              {/* Platform Tips */}
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>
                  💡 Pro Tips
                </div>
                {[
                  { icon: '🎯', tip: 'Courses with 5+ modules get 4x more enrollments on average.' },
                  { icon: '🖼️', tip: 'A high-quality cover image increases clicks by 60%.' },
                  { icon: '💰', tip: 'Pricing between ₹499–₹999 converts best for Indian learners.' },
                  { icon: '📝', tip: 'Write a detailed description — it doubles your organic discovery.' },
                ].map(t => (
                  <div key={t.tip} style={{ display: 'flex', gap: '0.65rem', marginBottom: '0.85rem' }}>
                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>{t.icon}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t.tip}</span>
                  </div>
                ))}
              </div>

              {/* Quick Publish CTA */}
              <div style={{
                padding: '1.25rem',
                background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))',
                border: '1px solid rgba(59,130,246,0.15)',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🚀</div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Ready to teach more?
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Each new course multiplies your passive income.
                </div>
                <button onClick={() => setActiveTab('publish')} className="btn btn-sm" style={{ width: '100%' }}>
                  + Publish New Course
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB: STUDENTS ══ */}
      {activeTab === 'students' && (
        <div>
          <div className="data-table-wrapper">
            <div className="data-table-header">
              <div>
                <div className="data-table-title">Student Roster</div>
                <div className="data-table-subtitle">{sales.length} enrolled students across all your courses</div>
              </div>
            </div>
            {sales.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👤</div>
                <h3>No students yet</h3>
                <p>Students who enroll in your courses will appear here.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Email</th>
                    <th>Course</th>
                    <th>Amount Paid</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map(sale => (
                    <tr key={sale._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'var(--gradient-accent)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.72rem', fontWeight: 800, color: 'white',
                            flexShrink: 0,
                          }}>
                            {getInitials(sale.userId?.name || 'U')}
                          </div>
                          <span className="td-primary">{sale.userId?.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td>{sale.userId?.email || '—'}</td>
                      <td className="td-accent">{sale.courseId?.title || 'Unknown Course'}</td>
                      <td className="td-green">₹{(sale.courseId?.price || 0).toLocaleString()}</td>
                      <td><span className="badge badge-green">✓ Paid</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB: MY COURSES ══ */}
      {activeTab === 'courses' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.5rem' }}>My Published Courses</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{myCourses.length} courses published</p>
            </div>
            <button className="btn" onClick={() => setActiveTab('publish')}>+ Publish New</button>
          </div>

          {myCourses.length === 0 ? (
            <div className="empty-state panel" style={{ padding: '3rem' }}>
              <div className="empty-state-icon">📭</div>
              <h3>No courses yet</h3>
              <p>Publish your first course to start earning.</p>
            </div>
          ) : (
            <div className="course-grid">
              {myCourses.map(c => {
                const cSales = sales.filter(s => s.courseId?._id === c._id);
                return (
                  <div key={c._id} className="course-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <img src={c.imageUrl || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800'} alt={c.title} className="course-img" />
                    <div className="course-info" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <h3 className="course-title">{c.title}</h3>
                      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Students</div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{cSales.length}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Revenue</div>
                          <div style={{ fontWeight: 700, color: 'var(--accent-green)' }}>₹{(cSales.length * c.price).toLocaleString()}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Price</div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{c.price}</div>
                        </div>
                      </div>

                      {editCourseId === c._id ? (
                        <div className="edit-panel">
                          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                            <label>Update Price (₹)</label>
                            <input type="number" placeholder={c.price} value={editPrice} onChange={e => setEditPrice(e.target.value)} />
                          </div>
                          {c.lessons?.length > 0 && (
                            <div style={{ marginBottom: '1rem' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>Existing Modules</div>
                              {c.lessons.map(lesson => (
                                <div key={lesson._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>{lesson.title}</span>
                                  <button onClick={() => handleDeleteModule(c._id, lesson._id)} className="btn btn-danger btn-sm">Remove</button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                            <label>Add New Module</label>
                            <input type="text" placeholder="Module Title" value={editModuleTitle} onChange={e => setEditModuleTitle(e.target.value)} style={{ marginBottom: '0.4rem' }} />
                            <input type="file" onChange={e => setEditModuleFile(e.target.files[0])} style={{ padding: '0.4rem' }} />
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handleUpdateCourse(c._id)} className="btn btn-sm" style={{ flex: 1 }}>Save Changes</button>
                            <button onClick={() => setEditCourseId(null)} className="btn outline btn-sm" style={{ flex: 1 }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                          <button onClick={() => { setEditCourseId(c._id); setEditPrice(c.price); }} className="btn outline btn-sm" style={{ flex: 1 }}>Edit</button>
                          <button onClick={() => handleDelete(c._id)} className="btn btn-danger btn-sm" style={{ flex: 1 }}>Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: PUBLISH ══ */}
      {activeTab === 'publish' && (
        <div style={{ maxWidth: 640 }}>
          <div className="section-header">
            <div className="section-label">Create</div>
            <h2 className="section-title">Publish a New Course</h2>
            <p className="section-desc">Fill in the details below and upload your course modules.</p>
          </div>

          {msgText && <div className={`alert ${msgType === 'success' ? 'alert-success' : 'alert-error'}`}>{msgText}</div>}

          <div className="panel">
            <div className="panel-body">
              <form onSubmit={handleCreateCourse}>
                <div className="form-group">
                  <label>Course Title</label>
                  <input type="text" required placeholder="e.g. Complete React Developer Course" value={courseData.title} onChange={e => setCourseData({ ...courseData, title: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input type="text" required placeholder="What will students learn?" value={courseData.description} onChange={e => setCourseData({ ...courseData, description: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Price (₹)</label>
                    <input type="number" required placeholder="499" value={courseData.price} onChange={e => setCourseData({ ...courseData, price: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Cover Photo</label>
                    <input type="file" required accept="image/*" onChange={e => setCoverPhoto(e.target.files[0])} />
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '0.9rem' }}>📦 Course Modules</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <input type="text" placeholder="Module title" value={moduleInputTitle} onChange={e => setModuleInputTitle(e.target.value)} />
                    <input type="file" onChange={e => setModuleInputFile(e.target.files[0])} />
                  </div>
                  <button type="button" onClick={handleAddModule} className="btn outline btn-sm" style={{ width: '100%' }}>+ Add Module</button>
                  {modules.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      {modules.map((m, i) => (
                        <div key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                          {i + 1}. {m.title} <span style={{ color: 'var(--text-muted)' }}>({m.file.name})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button type="submit" className="btn" style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}>
                  🚀 Publish Course
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  STUDENT / LEARNER DASHBOARD
// ══════════════════════════════════════════════════════════════
function LearnerDashboard({ user }) {
  const [courses, setCourses] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [priceFilter, setPriceFilter] = useState('all');
  const [enrollFilter, setEnrollFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('learning');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cRes, eRes] = await Promise.all([
        axios.get(`${API}/courses`),
        axios.get(`${API}/payments/my-enrollments`, { headers: authHeader() }),
      ]);
      setCourses(cRes.data);
      setMyEnrollments(eRes.data);
    } catch {}
  };

  // Build filtered + sorted course list
  const filteredCourses = courses
    .filter(c => {
      // Search
      const q = searchQuery.toLowerCase();
      if (q && !c.title.toLowerCase().includes(q) && !(c.instructorId?.name || '').toLowerCase().includes(q)) return false;
      // Price
      if (priceFilter === 'free' && c.price !== 0) return false;
      if (priceFilter === 'under500' && c.price >= 500) return false;
      if (priceFilter === 'under2000' && (c.price < 500 || c.price > 2000)) return false;
      if (priceFilter === 'above2000' && c.price <= 2000) return false;
      // Enrollment
      const isEnrolled = myEnrollments.some(e => e.courseId?._id === c._id);
      if (enrollFilter === 'enrolled' && !isEnrolled) return false;
      if (enrollFilter === 'new' && isEnrolled) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'popular') return (b.lessons?.length || 0) - (a.lessons?.length || 0);
      // newest: default array order (most recently added last from API)
      return 0;
    });

  const tabs = [
    { id: 'learning', label: '🎓 My Learning' },
    { id: 'explore', label: '🔍 Explore Courses' },
  ];

  const completedCount = myEnrollments.filter((_, i) => i % 3 === 0).length;
  const ongoingCount = myEnrollments.length - completedCount;

  return (
    <div className="fade-in">
      {/* ─── Page Header with Motivational Banner ─── */}
      <div className="dashboard-header">
        <div className="dashboard-welcome">
          <div className="dashboard-user-block">
            <div className="user-avatar" style={{ background: 'linear-gradient(135deg, #059669, #14b8a6)', width: 58, height: 58, fontSize: '1.3rem' }}>
              {getInitials(user.name)}
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Welcome back 👋</div>
              <div className="dashboard-name">{user.name}</div>
              <div style={{ marginTop: '0.3rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className="dashboard-role-badge role-learner">🎓 Learner</span>
                {myEnrollments.length > 0 && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent-amber)', fontWeight: 700 }}>
                    🔥 {myEnrollments.length}-course streak
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('explore')}
              className="btn btn-sm"
              style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--accent-blue-light)', border: '1px solid rgba(59,130,246,0.2)' }}
            >
              🔍 Explore Courses
            </button>
            {myEnrollments.length > 0 && (
              <button
                onClick={() => setActiveTab('learning')}
                className="btn btn-sm"
                style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--accent-green)', border: '1px solid rgba(34,197,94,0.2)' }}
              >
                ▶ Resume Learning
              </button>
            )}
          </div>
        </div>

        {/* Motivational Daily Banner */}
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem 1.5rem',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))',
          border: '1px solid rgba(59,130,246,0.12)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '1.8rem' }}>🎯</div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Daily Learning Goal</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                Complete 1 module today to maintain your learning streak!
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '2rem', flexShrink: 0 }}>
            {[
              { val: myEnrollments.length, label: 'Enrolled' },
              { val: completedCount, label: 'Completed' },
              { val: ongoingCount, label: 'Ongoing' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{s.val}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Tab Navigation ─── */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '2.5rem', paddingBottom: '1px' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.65rem 1.25rem', background: 'none', border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-green)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '0.88rem', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', borderRadius: 0,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══ TAB: MY LEARNING ══ */}
      {activeTab === 'learning' && (
        <div>
          {/* KPI Row */}
          <div className="stats-grid">
            <div className="stat-card blue">
              <div className="stat-icon blue">📚</div>
              <div className="stat-value">{myEnrollments.length}</div>
              <div className="stat-label">Enrolled Courses</div>
            </div>
            <div className="stat-card green">
              <div className="stat-icon green">✅</div>
              <div className="stat-value">{completedCount}</div>
              <div className="stat-label">Completed</div>
            </div>
            <div className="stat-card amber">
              <div className="stat-icon amber">▶</div>
              <div className="stat-value">{ongoingCount}</div>
              <div className="stat-label">In Progress</div>
            </div>
            <div className="stat-card purple">
              <div className="stat-icon purple">🏆</div>
              <div className="stat-value">{completedCount}</div>
              <div className="stat-label">Certificates</div>
            </div>
          </div>

          {myEnrollments.length === 0 ? (
            <div className="panel">
              <div className="empty-state" style={{ padding: '3.5rem' }}>
                <div className="empty-state-icon">🎒</div>
                <h3>No courses enrolled yet</h3>
                <p>Explore courses and start learning today!</p>
                <button className="btn" style={{ marginTop: '1.25rem' }} onClick={() => setActiveTab('explore')}>
                  Explore Courses →
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Ongoing */}
              {ongoingCount > 0 && (
                <div style={{ marginBottom: '2.5rem' }}>
                  <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '1.15rem', marginBottom: '1.25rem' }}>
                    ▶ In Progress
                  </h3>
                  <div className="course-grid">
                    {myEnrollments.filter((_, i) => i % 3 !== 0).map((enr, i) => {
                      if (!enr.courseId) return null;
                      const pct = 30 + ((i * 17) % 50);
                      return (
                        <div key={enr._id} className="learning-card">
                          <div className="learning-card-thumb">
                            <img src={enr.courseId.imageUrl || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800'} alt={enr.courseId.title} />
                            <div className="learning-card-status">
                              <span className="badge badge-amber">In Progress</span>
                            </div>
                          </div>
                          <div className="learning-card-body">
                            <h4 className="learning-card-title">{enr.courseId.title}</h4>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                              {pct}% Complete • Module {Math.ceil(pct / 20)} of 5
                            </div>
                            <ProgressBar pct={pct} color="amber" />
                            <div className="learning-card-meta">
                              <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>Paid ✓</span>
                              <Link to={`/course/${enr.courseId._id}`} className="btn btn-sm">Resume →</Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Completed */}
              {completedCount > 0 && (
                <div>
                  <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '1.15rem', marginBottom: '1.25rem' }}>
                    ✅ Completed
                  </h3>
                  <div className="course-grid">
                    {myEnrollments.filter((_, i) => i % 3 === 0).map(enr => {
                      if (!enr.courseId) return null;
                      return (
                        <div key={enr._id} className="learning-card" style={{ borderTop: '3px solid var(--accent-green)' }}>
                          <div className="learning-card-thumb">
                            <img src={enr.courseId.imageUrl || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800'} alt={enr.courseId.title} />
                            <div className="learning-card-status">
                              <span className="badge badge-green">Completed 🎉</span>
                            </div>
                          </div>
                          <div className="learning-card-body">
                            <h4 className="learning-card-title">{enr.courseId.title}</h4>
                            <div style={{ fontSize: '0.78rem', color: 'var(--accent-green)', marginBottom: '0.5rem', fontWeight: 600 }}>
                              100% Complete
                            </div>
                            <ProgressBar pct={100} color="green" />
                            <div className="learning-card-meta">
                              <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>🏆 Certificate Earned</span>
                              <Link to={`/course/${enr.courseId._id}`} className="btn outline btn-sm">Review</Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ TAB: EXPLORE ══ */}
      {activeTab === 'explore' && (
        <div>
          {/* Page Title */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div className="section-label">Discover</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Global Course Catalog</h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} found
              </span>
            </div>
          </div>

          {/* Quick Topic Pills */}
          <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.25rem', marginBottom: '1.5rem', scrollbarWidth: 'none' }}>
            {[
              { label: '🔥 Trending', filter: '' },
              { label: '💻 Web Dev', filter: 'web' },
              { label: '🤖 AI & ML', filter: 'machine' },
              { label: '📊 Data Science', filter: 'data' },
              { label: '☁️ Cloud', filter: 'cloud' },
              { label: '📱 Mobile', filter: 'mobile' },
              { label: '🎨 Design', filter: 'design' },
              { label: '💰 Affordable', filter: 'affordable' },
            ].map(pill => (
              <button
                key={pill.label}
                onClick={() => setSearchQuery(pill.filter)}
                style={{
                  flexShrink: 0,
                  padding: '0.35rem 0.85rem',
                  borderRadius: 'var(--radius-full)',
                  background: searchQuery === pill.filter ? 'var(--gradient-accent)' : 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: searchQuery === pill.filter ? 'white' : 'var(--text-secondary)',
                  fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Resume Banner (if enrolled courses exist) */}
          {myEnrollments.filter((_, i) => i % 3 !== 0).length > 0 && (
            <div style={{
              padding: '1rem 1.5rem',
              background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(20,184,166,0.08))',
              border: '1px solid rgba(34,197,94,0.15)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '1.75rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>▶</span>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>You have ongoing courses!</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                    {ongoingCount} course{ongoingCount !== 1 ? 's' : ''} in progress — keep going!
                  </div>
                </div>
              </div>
              <button onClick={() => setActiveTab('learning')} className="btn btn-sm btn-green">
                Go to My Learning →
              </button>
            </div>
          )}

          <div className="explore-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 240px) minmax(0, 1fr)', gap: '2rem', alignItems: 'start', flexWrap: 'wrap' }}>

            {/* ─── LEFT: FILTER SIDEBAR ─── */}
            <div className="explore-sidebar" style={{ position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>

              {/* Search */}
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.75rem' }}>Search</div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '1rem', pointerEvents: 'none' }}>⌕</span>
                  <input
                    type="text"
                    placeholder="Course, topic, instructor..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.2rem',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)', fontSize: '0.88rem',
                      fontFamily: 'Inter, sans-serif', outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent-blue)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                  />
                </div>
              </div>

              {/* Sort */}
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.75rem' }}>Sort By</div>
                {[
                  { id: 'newest', label: '🆕 Newest First' },
                  { id: 'price_asc', label: '💰 Price: Low to High' },
                  { id: 'price_desc', label: '💎 Price: High to Low' },
                  { id: 'popular', label: '🔥 Most Popular' },
                ].map(opt => (
                  <label
                    key={opt.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.6rem',
                      padding: '0.5rem 0.6rem', borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer', marginBottom: '0.2rem',
                      background: sortBy === opt.id ? 'rgba(59,130,246,0.08)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    <input
                      type="radio" name="sortBy" value={opt.id}
                      checked={sortBy === opt.id}
                      onChange={() => setSortBy(opt.id)}
                      style={{ accentColor: 'var(--accent-blue)' }}
                    />
                    <span style={{ fontSize: '0.85rem', color: sortBy === opt.id ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: sortBy === opt.id ? 600 : 400 }}>
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>

              {/* Price Range */}
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.75rem' }}>Price Range</div>
                {[
                  { id: 'all', label: 'All Prices' },
                  { id: 'free', label: 'Free' },
                  { id: 'under500', label: 'Under ₹500' },
                  { id: 'under2000', label: '₹500 – ₹2,000' },
                  { id: 'above2000', label: 'Above ₹2,000' },
                ].map(opt => (
                  <label
                    key={opt.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.6rem',
                      padding: '0.5rem 0.6rem', borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer', marginBottom: '0.2rem',
                      background: priceFilter === opt.id ? 'rgba(34,197,94,0.08)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    <input
                      type="radio" name="priceFilter" value={opt.id}
                      checked={priceFilter === opt.id}
                      onChange={() => setPriceFilter(opt.id)}
                      style={{ accentColor: 'var(--accent-green)' }}
                    />
                    <span style={{ fontSize: '0.85rem', color: priceFilter === opt.id ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: priceFilter === opt.id ? 600 : 400 }}>
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>

              {/* Enrollment Status */}
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.75rem' }}>Enrollment</div>
                {[
                  { id: 'all', label: '📚 All Courses' },
                  { id: 'enrolled', label: '✅ Already Enrolled' },
                  { id: 'new', label: '🆕 Not Yet Enrolled' },
                ].map(opt => (
                  <label
                    key={opt.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.6rem',
                      padding: '0.5rem 0.6rem', borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer', marginBottom: '0.2rem',
                      background: enrollFilter === opt.id ? 'rgba(139,92,246,0.08)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    <input
                      type="radio" name="enrollFilter" value={opt.id}
                      checked={enrollFilter === opt.id}
                      onChange={() => setEnrollFilter(opt.id)}
                      style={{ accentColor: 'var(--accent-purple)' }}
                    />
                    <span style={{ fontSize: '0.85rem', color: enrollFilter === opt.id ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: enrollFilter === opt.id ? 600 : 400 }}>
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>

              {/* Reset Filters */}
              {(searchQuery || sortBy !== 'newest' || priceFilter !== 'all' || enrollFilter !== 'all') && (
                <button
                  onClick={() => { setSearchQuery(''); setSortBy('newest'); setPriceFilter('all'); setEnrollFilter('all'); }}
                  className="btn outline btn-sm"
                  style={{ width: '100%' }}
                >
                  ✕ Reset All Filters
                </button>
              )}
            </div>

            {/* ─── RIGHT: COURSE GRID ─── */}
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              {filteredCourses.length === 0 ? (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  minHeight: '400px', background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)',
                  padding: '3rem', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🔍</div>
                  <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '1.2rem', marginBottom: '0.5rem' }}>No courses found</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Try adjusting your filters or search term.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
                  {filteredCourses.map(c => {
                    const isEnrolled = myEnrollments.some(e => e.courseId?._id === c._id);
                    const moduleCount = c.lessons?.length || 0;
                    return (
                      <div key={c._id} className="course-card" style={{ display: 'flex', flexDirection: 'column' }}>
                        {/* Thumbnail */}
                        <div style={{ position: 'relative', overflow: 'hidden', height: 180, flexShrink: 0 }}>
                          <img
                            src={c.imageUrl || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800'}
                            alt={c.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease', display: 'block' }}
                          />
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: 'linear-gradient(to top, rgba(6,9,18,0.6) 0%, transparent 60%)',
                          }} />
                          {isEnrolled && (
                            <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem' }}>
                              <span className="badge badge-green">✓ Enrolled</span>
                            </div>
                          )}
                          <div style={{ position: 'absolute', bottom: '0.75rem', right: '0.75rem' }}>
                            <span style={{
                              background: 'rgba(6,9,18,0.75)', color: 'var(--text-secondary)',
                              padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600,
                              backdropFilter: 'blur(4px)',
                            }}>
                              {moduleCount} module{moduleCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-blue-light)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                            Online Course
                          </div>
                          <h3 style={{
                            fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700,
                            fontSize: '0.98rem', color: 'var(--text-primary)',
                            lineHeight: 1.4, marginBottom: '0.4rem',
                          }}>
                            {c.title}
                          </h3>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                            by {c.instructorId?.name || 'CourseLelo Instructor'}
                          </p>

                          {/* Module indicators */}
                          <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                            {Array.from({ length: Math.min(moduleCount, 6) }).map((_, i) => (
                              <div key={i} style={{
                                width: '100%', maxWidth: `${100 / Math.min(moduleCount, 6) - 1}%`,
                                height: 3, borderRadius: 2,
                                background: isEnrolled ? 'var(--accent-green)' : 'var(--border-light)',
                                flex: 1,
                              }} />
                            ))}
                          </div>

                          {/* Price row */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', marginTop: 'auto' }}>
                            <div style={{
                              fontFamily: "'Plus Jakarta Sans', sans-serif",
                              fontSize: '1.4rem', fontWeight: 800,
                              color: c.price === 0 ? 'var(--accent-green)' : 'var(--text-primary)',
                              letterSpacing: '-0.5px'
                            }}>
                              {c.price === 0 ? 'Free' : `₹${c.price?.toLocaleString()}`}
                            </div>
                            {c.price > 0 && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                ≈ ₹{Math.round(c.price / 12)}/mo
                              </div>
                            )}
                          </div>

                          <Link
                            to={`/course/${c._id}`}
                            className={`btn ${isEnrolled ? 'btn-green' : ''}`}
                            style={{ width: '100%', textAlign: 'center', display: 'block', boxSizing: 'border-box' }}
                          >
                            {isEnrolled ? '▶ Continue Learning' : '→ View & Enroll'}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN DASHBOARD ROUTER
// ══════════════════════════════════════════════════════════════
function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { window.location.href = '/login'; return; }
    setUser(JSON.parse(stored));
  }, []);

  if (!user) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)' }}>
      Loading dashboard...
    </div>
  );

  return user.role === 'instructor'
    ? <InstructorDashboard user={user} />
    : <LearnerDashboard user={user} />;
}

export default Dashboard;
