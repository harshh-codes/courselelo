import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const FEATURES = [
  { icon: '🎯', title: 'Expert Instructors', desc: 'Learn from industry professionals with real-world experience' },
  { icon: '📱', title: 'Learn Anywhere', desc: 'Access your courses on any device, anytime, at your own pace' },
  { icon: '🏆', title: 'Earn Certificates', desc: 'Get recognized with certificates upon course completion' },
  { icon: '💬', title: 'Community', desc: 'Join thousands of learners and grow together' },
];

const CATEGORIES = [
  { icon: '💻', name: 'Web Development', count: '120+ courses', color: '#3b82f6' },
  { icon: '🤖', name: 'Machine Learning', count: '80+ courses', color: '#8b5cf6' },
  { icon: '📊', name: 'Data Science', count: '95+ courses', color: '#14b8a6' },
  { icon: '📱', name: 'Mobile Dev', count: '60+ courses', color: '#f59e0b' },
  { icon: '🎨', name: 'UI/UX Design', count: '45+ courses', color: '#ec4899' },
  { icon: '☁️', name: 'Cloud & DevOps', count: '70+ courses', color: '#22c55e' },
];

function Home() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('https://courselelo.onrender.com/api/courses')
      .then(res => { setCourses(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="fade-in">

      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hero-badge">🚀 India's fastest growing EdTech Platform</div>
        <h1>
          Unlock Your Potential<br />
          <span>with Expert Courses</span>
        </h1>
        <p>Learn from world-class instructors at your own pace. Gain real, industry-relevant skills and advance your career.</p>
        <div className="hero-actions">
          <Link to="/register" className="btn btn-lg">Start Learning Free →</Link>
          <Link to="/login" className="btn btn-lg outline">Sign In</Link>
        </div>

        <div className="hero-stats">
          {[
            { value: '10k+', label: 'Active Learners' },
            { value: '500+', label: 'Expert Courses' },
            { value: '100+', label: 'Top Instructors' },
            { value: '95%', label: 'Satisfaction Rate' },
          ].map(s => (
            <div key={s.label} className="hero-stat-item">
              <div className="hero-stat-value">{s.value}</div>
              <div className="hero-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FULL-WIDTH CATEGORY SCROLL STRIP ─── */}
      <section style={{
        margin: '0 -2.5rem',
        padding: '2rem 2.5rem',
        background: 'rgba(255,255,255,0.02)',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '4rem',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase' }}>Browse by Category</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => (
            <Link
              key={cat.name}
              to="/register"
              style={{
                flex: '0 0 auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '1.25rem 1.5rem',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
                minWidth: 140,
                transition: 'all 0.2s',
                cursor: 'pointer',
                textDecoration: 'none',
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = cat.color; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 'var(--radius-md)',
                background: `${cat.color}18`,
                border: `1px solid ${cat.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem',
              }}>{cat.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{cat.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{cat.count}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── FEATURED COURSES ─── */}
      <section style={{ marginBottom: '5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <div className="section-label">Explore</div>
            <h2 className="section-title" style={{ margin: 0 }}>Featured Courses</h2>
          </div>
          <Link to="/register" className="btn outline btn-sm">Browse All Courses</Link>
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>Loading courses...</div>
        ) : courses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <h3>No courses yet</h3>
            <p>Instructors haven't published any courses yet. Check back soon!</p>
          </div>
        ) : (
          <div className="course-grid">
            {courses.slice(0, 6).map(c => (
              <div key={c._id} className="course-card">
                <div style={{ position: 'relative', height: 190, overflow: 'hidden' }}>
                  <img
                    src={c.imageUrl || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800'}
                    alt={c.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s ease' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,9,18,0.5) 0%, transparent 60%)' }} />
                  <div style={{ position: 'absolute', bottom: '0.75rem', right: '0.75rem' }}>
                    <span style={{ background: 'rgba(6,9,18,0.8)', color: 'var(--text-secondary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, backdropFilter: 'blur(4px)' }}>
                      {c.lessons?.length || 0} modules
                    </span>
                  </div>
                </div>
                <div className="course-info">
                  <div className="course-category">Online Course</div>
                  <h3 className="course-title">{c.title}</h3>
                  <p className="course-instructor">by {c.instructorId?.name || 'CourseLelo Instructor'}</p>
                  <div className="course-price">₹{c.price?.toLocaleString()}</div>
                  <Link to={`/course/${c._id}`} className="btn" style={{ width: '100%', marginTop: '0.25rem' }}>
                    View Course →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── WHY COURSELELO FEATURE GRID ─── */}
      <section style={{
        margin: '0 -2.5rem',
        padding: '4rem 2.5rem',
        background: 'linear-gradient(135deg, rgba(59,130,246,0.04) 0%, rgba(139,92,246,0.04) 100%)',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '4rem',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div className="section-label">Why CourseLelo</div>
          <h2 className="section-title" style={{ margin: '0 auto 0.5rem' }}>Everything you need to succeed</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto', fontSize: '0.95rem' }}>
            A complete learning ecosystem — from beginner fundamentals to advanced specializations.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem', maxWidth: 1100, margin: '0 auto' }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              padding: '1.75rem',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              transition: 'transform 0.2s, border-color 0.2s',
            }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'var(--border-light)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{f.icon}</div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{f.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── INSTRUCTOR CTA ─── */}
      <section style={{
        padding: '3.5rem',
        borderRadius: 'var(--radius-xl)',
        background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.1) 100%)',
        border: '1px solid rgba(59,130,246,0.15)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative blobs inside CTA */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -30, width: 160, height: 160, background: 'radial-gradient(circle, rgba(59,130,246,0.12), transparent)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏫</div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '1rem' }}>
            Ready to become an Instructor?
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '480px', margin: '0 auto 2rem', fontSize: '1rem' }}>
            Share your knowledge with thousands of learners across India. Create your course in minutes.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-lg">Start Teaching Today →</Link>
            <Link to="/login" className="btn btn-lg outline">Sign In as Instructor</Link>
          </div>
        </div>
      </section>

    </div>
  );
}

export default Home;
