import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import CourseDetail from './pages/CourseDetail';
import Dashboard from './pages/Dashboard';
import Success from './pages/Success';
import './index.css';

// Live ticker items across the top announcement bar
const TICKER_ITEMS = [
  '🚀 New Course Added: Full Stack with Next.js 15',
  '🎓 50+ Instructors now live on CourseLelo',
  '💡 Tip: Complete your first module to earn a streak badge',
  '🔥 Trending: Machine Learning with Python 2026',
  '⚡ Limited Offer: Use code LEARN50 for ₹50 off any course',
  '🌟 CourseLelo is now India\'s fastest growing EdTech platform',
];

function AnnouncementBar() {
  const token = localStorage.getItem('token');
  if (!token) return null; // only show when logged in
  return (
    <div style={{
      background: 'linear-gradient(90deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))',
      borderBottom: '1px solid rgba(59,130,246,0.12)',
      overflow: 'hidden',
      height: 36,
      display: 'flex',
      alignItems: 'center',
    }}>
      <div style={{
        display: 'flex',
        gap: '4rem',
        animation: 'marquee 40s linear infinite',
        whiteSpace: 'nowrap',
        paddingLeft: '100%',
      }}>
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
          <span key={i} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {item}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

function Navbar() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <nav className="navbar">
      <div className="logo">
        <Link to="/">CourseLelo</Link>
      </div>

      {/* Center: quick links */}
      {token && (
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {[
            { to: '/dashboard', label: 'Dashboard' },
            { to: '/dashboard', label: 'My Learning' },
          ].map(l => (
            <Link key={l.label} to={l.to} style={{
              padding: '0.35rem 0.85rem',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 500,
              transition: 'color 0.2s',
            }}
              onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}

      <div className="nav-links">
        {token ? (
          <>
            {user && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.3rem 0.75rem',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-full)',
                marginRight: '0.5rem',
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'var(--gradient-accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: 800, color: 'white',
                }}>
                  {user.name?.slice(0, 2).toUpperCase()}
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {user.name?.split(' ')[0]}
                </span>
              </div>
            )}
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Sign In</Link>
            <Link to="/register" className="nav-badge" style={{ marginLeft: '0.5rem' }}>Get Started →</Link>
          </>
        )}
      </div>
    </nav>
  );
}

function BackButton() {
  const location = useLocation();
  const navigate = useNavigate();
  if (location.pathname === '/') return null;
  return (
    <button
      onClick={() => navigate(-1)}
      style={{
        marginBottom: '1.5rem', background: 'transparent',
        color: 'var(--text-muted)', border: 'none', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        fontSize: '0.85rem', fontWeight: 500, transition: 'color 0.2s', padding: 0,
      }}
      onMouseOver={e => e.currentTarget.style.color = 'var(--text-secondary)'}
      onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
    >
      ← Back
    </button>
  );
}

// ── Full-width feature strips rendered OUTSIDE the max-width content box ──
function PageSideFeatures() {
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';
  if (!isDashboard) return null;

  const token = localStorage.getItem('token');
  if (!token) return null;

  return null; // Handled inline in Dashboard now; side glow comes from CSS
}

function App() {
  return (
    <Router>
      <div className="app">
        <AnnouncementBar />
        <Navbar />
        <div className="content">
          <BackButton />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:id/:token" element={<ResetPassword />} />
            <Route path="/course/:id" element={<CourseDetail />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/success" element={<Success />} />
          </Routes>
        </div>

        {/* Global floating decorative blobs - pure aesthetic */}
        <div style={{
          position: 'fixed', top: '15%', left: 0,
          width: 220, height: 220,
          background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
        }} />
        <div style={{
          position: 'fixed', bottom: '20%', right: 0,
          width: 260, height: 260,
          background: 'radial-gradient(circle, rgba(139,92,246,0.06), transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
        }} />
        <div style={{
          position: 'fixed', top: '55%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 300,
          background: 'radial-gradient(ellipse, rgba(20,184,166,0.03), transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
        }} />

        {/* Left side floating label */}
        <div style={{
          position: 'fixed', left: 16, top: '50%', transform: 'translateY(-50%) rotate(-90deg)',
          transformOrigin: 'center center',
          fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.06)',
          letterSpacing: '3px', textTransform: 'uppercase',
          pointerEvents: 'none', zIndex: 0, whiteSpace: 'nowrap',
        }}>
          CourseLelo — Learn · Grow · Achieve
        </div>

        {/* Right side floating label */}
        <div style={{
          position: 'fixed', right: 16, top: '50%', transform: 'translateY(-50%) rotate(90deg)',
          transformOrigin: 'center center',
          fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.06)',
          letterSpacing: '3px', textTransform: 'uppercase',
          pointerEvents: 'none', zIndex: 0, whiteSpace: 'nowrap',
        }}>
          Powered by CourseLelo © 2026
        </div>
      </div>
    </Router>
  );
}

export default App;
