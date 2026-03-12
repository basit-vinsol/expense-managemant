import React, { useState } from 'react';
import './Login.css';
import logo from '../assets/vinlogo.png';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Real-time feel delay
    setTimeout(() => {
      if (username === 'umervinsol' && password === 'umer123@') {
        onLogin();
      } else {
        setError('Invalid username or password');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="login-screen-v17">
      <div className="login-card-v17 glass-card">
        <div className="login-header-v17">
          <img src={logo} alt="Vinsol Logo" className="login-logo-v17" />
          <h2>Expense Management</h2>
          <p>Please sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form-v17">
          <div className="login-group-v17">
            <label>Username</label>
            <div className="login-input-wrapper-v17">
              <span className="login-icon-v17">👤</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          <div className="login-group-v17">
            <label>Password</label>
            <div className="login-input-wrapper-v17">
              <span className="login-icon-v17">🔒</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          {error && <div className="login-error-v17">❌ {error}</div>}

          <button type="submit" className="login-btn-v17" disabled={isLoading}>
            {isLoading ? (
              <span className="loading-spinner-v17"></span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="login-footer-v17">
          <span>Protected by Vinsol Security</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
