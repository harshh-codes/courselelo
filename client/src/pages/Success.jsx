import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

function Success() {
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const confirmPayment = async () => {
      const courseId = new URLSearchParams(location.search).get('courseId');
      const token = localStorage.getItem('token');

      if (!courseId) { setStatus('error'); setMessage('No course ID found in URL.'); return; }
      if (!token) { setStatus('error'); setMessage('You must be logged in.'); return; }

      try {
        await axios.post('http://localhost:5000/api/payments/verify-enrollment', { courseId }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStatus('success');
        setMessage('Your enrollment is confirmed!');
        setTimeout(() => navigate(`/course/${courseId}`), 3000);
      } catch {
        setStatus('error');
        setMessage('Verification failed. Please contact support.');
      }
    };
    confirmPayment();
  }, [location, navigate]);

  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="fade-in" style={{
        textAlign: 'center',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)',
        padding: '3.5rem 2.5rem',
        maxWidth: 480,
        width: '100%',
        boxShadow: 'var(--shadow-xl)',
      }}>
        {status === 'verifying' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>⏳</div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.6rem', marginBottom: '0.75rem' }}>
              Verifying Payment
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>Please wait while we confirm your enrollment...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem' }}>✅</div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.6rem', color: 'var(--accent-green)', marginBottom: '0.75rem' }}>
              Payment Successful!
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              {message} Redirecting you to the course...
            </p>
            <Link to="/dashboard" className="btn outline">Go to Dashboard</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>❌</div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.6rem', color: 'var(--accent-red)', marginBottom: '0.75rem' }}>
              Verification Failed
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{message}</p>
            <Link to="/dashboard" className="btn">← Go to Dashboard</Link>
          </>
        )}
      </div>
    </div>
  );
}

export default Success;
