import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [testUrl, setTestUrl] = useState('');

  const handleForgot = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('https://courselelo.onrender.com/api/auth/forgot-password', { email });
      setMessage(res.data.msg);
      // Because we're using a dummy local Ethereal account, we give the user the magic link here so they can click it
      if (res.data.testEmailUrl) setTestUrl(res.data.testEmailUrl);
    } catch (err) {
      setMessage(err.response?.data?.msg || 'Error requesting reset logic.');
    }
  };

  return (
    <div className="form-container">
      <h2>Forgot Password</h2>
      <p style={{ color: '#94a3b8', marginBottom: '1.5rem', textAlign: 'center' }}>Enter your email address to receive a secure reset link.</p>
      {message && <p style={{ color: '#38bdf8', marginBottom: '1rem', fontWeight: 'bold', textAlign: 'center' }}>{message}</p>}
      <form onSubmit={handleForgot}>
        <div className="form-group">
          <label>Email Address</label>
          <input type="email" required onChange={e => setEmail(e.target.value)} placeholder="hello@courselelo.com" />
        </div>
        <button type="submit" className="btn">Send Reset Link</button>
      </form>

      {testUrl && (
        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(56, 189, 248, 0.1)', border: '1px dashed #38bdf8', borderRadius: '8px' }}>
          <p style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>DEVELOPMENT TEST EMAIL RECEIVED:</p>
          <a href={testUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', fontWeight: 'bold' }}>Click here to view your inbox & Reset Link!</a>
        </div>
      )}

      <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
        <Link to="/login" style={{ color: '#cbd5e1' }}>&larr; Return to Sign In</Link>
      </p>
    </div>
  );
}

export default ForgotPassword;
