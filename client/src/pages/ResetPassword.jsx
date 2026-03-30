import { useState } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';

function ResetPassword() {
  const { id, token } = useParams();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`http://localhost:5000/api/auth/reset-password/${id}/${token}`, { password });
      setMessage(res.data.msg);
    } catch (err) {
      setMessage(err.response?.data?.msg || 'Error resetting password.');
    }
  };

  return (
    <div className="form-container">
      <h2>Secure Password Reset</h2>
      {message ? (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#38bdf8', marginBottom: '1.5rem', fontWeight: 'bold' }}>{message}</p>
          <Link to="/login" className="btn outline">Go back to Login</Link>
        </div>
      ) : (
        <form onSubmit={handleReset}>
          <div className="form-group">
            <label>Establish a New Password</label>
            <input type="password" required onChange={e => setPassword(e.target.value)} placeholder="Enter a secure password..." />
          </div>
          <button type="submit" className="btn" style={{ background: '#10b981' }}>Reset & Save Configuration</button>
        </form>
      )}
    </div>
  );
}

export default ResetPassword;
