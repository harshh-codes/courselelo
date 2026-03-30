import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

function CourseDetail() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));

    const fetchCourseAndAccess = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/courses/${id}`);
        setCourse(res.data);
        if (token) {
          try {
            const check = await axios.get(`http://localhost:5000/api/payments/check/${id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setHasAccess(check.data.hasAccess);
          } catch (e) {}
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourseAndAccess();
  }, [id]);

  const loadRazorpayScript = () => new Promise(resolve => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  const handleEnroll = async () => {
    const token = localStorage.getItem('token');
    if (!token) return window.location.href = '/login';
    try {
      const res = await axios.post(
        'http://localhost:5000/api/payments/create-razorpay-order',
        { courseId: course._id, title: course.title, price: course.price },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.isMockMode) {
        if (window.confirm('DEVELOPMENT MODE\n\nRazorpay keys are not yet configured.\nPress OK to simulate a successful payment and enroll.')) {
          window.location.href = `/success?courseId=${course._id}`;
        }
        return;
      }
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) return alert('Failed to load Razorpay');
      const options = {
        key: res.data.key_id,
        amount: res.data.amount,
        currency: res.data.currency,
        name: 'CourseLelo',
        description: course.title,
        order_id: res.data.orderId,
        handler: async (response) => {
          // Pass the payment ID so the backend can trigger instructor payout
          await fetch('http://localhost:5000/api/payments/verify-enrollment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({ courseId: course._id, razorpayPaymentId: response.razorpay_payment_id }),
          });
          window.location.href = `/success?courseId=${course._id}`;
        },
        prefill: { name: user?.name || '', email: user?.email || '' },
        theme: { color: '#3b82f6' }
      };
      new window.Razorpay(options).open();
    } catch (err) {
      alert('Payment gateway failed. Please try again.');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: 'var(--text-muted)' }}>
      Loading course...
    </div>
  );

  if (!course) return <div style={{ color: 'var(--text-secondary)', padding: '4rem 0', textAlign: 'center' }}>Course not found.</div>;

  const isInstructorOwned = user && (user.role === 'admin' || user.id === course.instructorId?._id);
  const fullyUnlocked = hasAccess || isInstructorOwned;

  return (
    <div className="fade-in">
      {/* ─── COURSE HERO ─── */}
      <div style={{
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
        marginBottom: '2rem',
        position: 'relative',
      }}>
        <img
          src={course.imageUrl || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200'}
          alt={course.title}
          style={{ width: '100%', height: 320, objectFit: 'cover', display: 'block' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(6,9,18,0.9) 0%, transparent 60%)',
        }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '2rem' }}>
          <div className="badge badge-blue" style={{ marginBottom: '0.75rem' }}>Online Course</div>
          <h1 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
            fontWeight: 800,
            letterSpacing: '-0.5px',
            color: 'var(--text-primary)',
            lineHeight: 1.2
          }}>
            {course.title}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            by <strong style={{ color: 'var(--text-primary)' }}>{course.instructorId?.name || 'CourseLelo Instructor'}</strong>
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '2rem', alignItems: 'start' }}>
        {/* ─── LEFT COLUMN ─── */}
        <div>
          {/* About */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">About this Course</span>
            </div>
            <div className="panel-body">
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>{course.description}</p>
            </div>
          </div>

          {/* Modules */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Course Curriculum</span>
              <span className="badge badge-blue">{course.lessons?.length || 0} Modules</span>
            </div>
            <div>
              {!course.lessons || course.lessons.length === 0 ? (
                <div className="empty-state" style={{ padding: '2.5rem' }}>
                  <div className="empty-state-icon">📂</div>
                  <h3>No modules yet</h3>
                  <p>The instructor hasn't uploaded any modules yet.</p>
                </div>
              ) : (
                course.lessons.map((lesson, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem 1.5rem',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36,
                      borderRadius: '50%',
                      background: fullyUnlocked ? 'rgba(59,130,246,0.12)' : 'var(--bg-surface)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.85rem',
                      color: fullyUnlocked ? 'var(--accent-blue-light)' : 'var(--text-muted)',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      {fullyUnlocked ? '▶' : '🔒'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                        {index + 1}. {lesson.title}
                      </div>
                      {fullyUnlocked && lesson.videoUrl ? (
                        <a
                          href={lesson.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.8rem', color: 'var(--accent-blue-light)', marginTop: '0.2rem', display: 'block' }}
                        >
                          Open Video Material →
                        </a>
                      ) : (
                        !fullyUnlocked && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Enroll to unlock</span>
                        )
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ─── RIGHT COLUMN / PURCHASE CARD ─── */}
        <div style={{ position: 'sticky', top: '80px' }}>
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            boxShadow: 'var(--shadow-xl)',
          }}>
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '2.5rem',
              fontWeight: 900,
              color: 'var(--accent-green)',
              letterSpacing: '-1px',
              marginBottom: '1.5rem'
            }}>
              ₹{course.price?.toLocaleString()}
            </div>

            {fullyUnlocked ? (
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.85rem 1.25rem',
                  background: 'rgba(34,197,94,0.08)',
                  border: '1px solid rgba(34,197,94,0.2)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--accent-green)',
                  fontWeight: 700,
                  marginBottom: '1rem',
                }}>
                  ✓ You're Enrolled
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                  You have full access to all modules above.
                </p>
              </div>
            ) : (
              <>
                <button
                  onClick={handleEnroll}
                  className="btn btn-green btn-lg"
                  style={{ width: '100%', marginBottom: '1rem' }}
                >
                  Enroll Now via Razorpay
                </button>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
                  🔒 Secure payment · Full course access · Instant enrollment
                </div>
              </>
            )}

            <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '1.5rem', paddingTop: '1.5rem' }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                This course includes
              </div>
              {[
                ['📹', `${course.lessons?.length || 0} video modules`],
                ['📱', 'Access on mobile & desktop'],
                ['♾️', 'Lifetime access'],
                ['🏆', 'Certificate of completion'],
              ].map(([icon, text]) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.6rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>{icon}</span>{text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CourseDetail;
