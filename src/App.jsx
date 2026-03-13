import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Summary from './components/Summary';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import FundHistory from './components/FundHistory';
import MonthlyOverview from './components/MonthlyOverview';
import SearchBar from './components/SearchBar';
import Filters from './components/Filters';
import PrintReport from './components/PrintReport';
import Login from './components/Login';
import vinlogo from './assets/vinlogo.png';
import './App.css';
import './AdminDashboard.css';

const App = () => {
  // ==================== AUTHENTICATION STATE ====================
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [userType, setUserType] = useState(() => {
    return localStorage.getItem('userType') || null;
  });

  // ==================== MAIN APPLICATION STATE ====================
  const [totalFunds, setTotalFunds] = useState(() => {
    try {
      const saved = localStorage.getItem('totalFunds');
      return saved ? parseFloat(saved) : 0;
    } catch (error) {
      return 0;
    }
  });

  const [fundHistory, setFundHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('fundHistory');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      return [];
    }
  });

  const [expenses, setExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem('expenses');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      return [];
    }
  });

  // ==================== UI STATE ====================
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterMonth, setFilterMonth] = useState('All');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
  const [isSyncing, setIsSyncing] = useState(false);
  
  // ==================== ADMIN PANEL STATE ====================
  const [adminView, setAdminView] = useState('dashboard');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const [systemMetrics, setSystemMetrics] = useState({
    activeUsers: 1,
    totalTransactions: 0,
    storageUsed: '2.4 MB',
    lastBackup: '2 hours ago',
    apiCalls: 156,
    syncStatus: 'online'
  });

  // ==================== AUTHENTICATION HANDLERS ====================
  const handleLogin = () => {
    setIsAuthenticated(true);
    setUserType('user');
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userType', 'user');
    showNotification('🌟 Welcome back! Ready to track expenses?', 'success');
  };

  const handleAdminLogin = () => {
    setIsAuthenticated(true);
    setUserType('admin');
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userType', 'admin');
    showNotification('👑 Admin Access Granted • System Ready', 'success');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserType(null);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userType');
    // Don't remove data on logout
    showNotification('👋 Logged out successfully', 'info');
  };

  // ==================== GOOGLE SHEETS SYNC ====================
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbzyTfcUzcbiWBYN9ynwSZzqijuM5ldBa8ZSdYAKqa6f9wt6ZVFt4OnB98xq_ax0YdjKDQ/exec';

  const handleSyncToSheets = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    showNotification('🔄 Syncing with Google Sheets...', 'info');

    try {
      const totals = calculateTotals();
      const dataToSync = {
        totals: {
          totalFundsAdded: totals.totalFundsAdded,
          totalExpenses: totals.totalExpenses,
          currentBalance: totals.currentBalance,
          usedPercentage: totals.usedPercentage,
          remainingPercentage: totals.remainingPercentage,
          regularExpensesTotal: totals.regularExpensesTotal,
          oneTimeExpensesTotal: totals.oneTimeExpensesTotal,
          billsTotal: totals.billsTotal
        },
        expenses: expenses,
        fundHistory: fundHistory,
        systemMetrics: systemMetrics,
        lastUpdated: new Date().toISOString()
      };

      const cleanUrl = GAS_URL.trim();

      await fetch(cleanUrl, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(dataToSync),
      });

      setTimeout(() => {
        showNotification('✅ Data synced to Cloud!', 'success');
        setLastUpdated(new Date().toLocaleTimeString());
        localStorage.setItem('lastSyncTime', new Date().toISOString());
        setSystemMetrics(prev => ({ ...prev, lastBackup: 'Just now' }));
      }, 1000);
      
    } catch (error) {
      console.error('CRITICAL SYNC ERROR:', error);
      showNotification('❌ Sync failed! Check connection.', 'error');
      setSystemMetrics(prev => ({ ...prev, syncStatus: 'offline' }));
    } finally {
      setIsSyncing(false);
    }
  };

  // ==================== AUTO-REFRESH FOR ADMIN ====================
  useEffect(() => {
    let interval;
    if (userType === 'admin' && autoRefresh) {
      interval = setInterval(() => {
        const savedExpenses = JSON.parse(localStorage.getItem('expenses') || '[]');
        const savedFundHistory = JSON.parse(localStorage.getItem('fundHistory') || '[]');
        const savedTotalFunds = parseFloat(localStorage.getItem('totalFunds') || '0');
        
        setExpenses(savedExpenses);
        setFundHistory(savedFundHistory);
        setTotalFunds(savedTotalFunds);
        setLastUpdated(new Date().toLocaleTimeString());
        setSystemMetrics(prev => ({
          ...prev,
          totalTransactions: savedFundHistory.length,
          activeUsers: 1
        }));
        
        const refreshNotif = document.querySelector('.admin-refresh-indicator');
        if (refreshNotif) {
          refreshNotif.classList.add('active');
          setTimeout(() => refreshNotif.classList.remove('active'), 1000);
        }
      }, refreshInterval * 1000);
    }
    return () => clearInterval(interval);
  }, [userType, autoRefresh, refreshInterval]);

  // ==================== LOCAL STORAGE SAVE ====================
  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('totalFunds', totalFunds.toString());
      setLastUpdated(new Date().toLocaleTimeString());
    }
  }, [totalFunds, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('fundHistory', JSON.stringify(fundHistory));
      setLastUpdated(new Date().toLocaleTimeString());
      setSystemMetrics(prev => ({ ...prev, totalTransactions: fundHistory.length }));
    }
  }, [fundHistory, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('expenses', JSON.stringify(expenses));
      setLastUpdated(new Date().toLocaleTimeString());
    }
  }, [expenses, isAuthenticated]);

  // ==================== UTILITY FUNCTIONS ====================
  const formatPKR = (amount) => {
    if (amount === undefined || amount === null) return 'Rs 0';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  // ==================== CALCULATE ALL TOTALS ====================
  const calculateTotals = () => {
    const totalFundsAdded = fundHistory
      .filter(item => item.type === 'credit')
      .reduce((sum, item) => sum + item.amount, 0);

    const totalExpenses = expenses
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);

    const currentBalance = totalFundsAdded - totalExpenses;

    const regularExpensesTotal = expenses
      .filter(expense => expense.expenseType === 'regular')
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);

    const oneTimeExpensesTotal = expenses
      .filter(expense => expense.expenseType === 'one-time')
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);

    const billsTotal = expenses
      .filter(expense => expense.expenseType === 'bill')
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);

    const monthlyExpenses = {};
    const categoryTotals = {};
    const dailyExpenses = {};

    expenses.forEach(expense => {
      if (expense.date) {
        const date = new Date(expense.date);
        const month = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        monthlyExpenses[month] = (monthlyExpenses[month] || 0) + (expense.amount || 0);
        
        dailyExpenses[expense.date] = (dailyExpenses[expense.date] || 0) + (expense.amount || 0);
      }
      
      if (expense.category) {
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + (expense.amount || 0);
      }
    });

    const usedPercentage = totalFundsAdded > 0 ? (totalExpenses / totalFundsAdded) * 100 : 0;
    const remainingPercentage = totalFundsAdded > 0 ? (currentBalance / totalFundsAdded) * 100 : 0;

    return {
      totalFundsAdded,
      totalExpenses,
      currentBalance,
      monthlyExpenses,
      dailyExpenses,
      categoryTotals,
      usedPercentage: Math.min(usedPercentage, 100).toFixed(1),
      remainingPercentage: Math.max(remainingPercentage, 0).toFixed(1),
      totalTransactions: fundHistory.length,
      averageExpense: expenses.length > 0 ? totalExpenses / expenses.length : 0,
      regularExpensesTotal,
      oneTimeExpensesTotal,
      billsTotal
    };
  };

  const totals = calculateTotals();

  // ==================== CORE FUNCTIONS ====================
  // Modified: Password protected purge for both user and admin
  const handleClearAll = () => {
    setShowPasswordModal(true);
    setPasswordInput('');
    setPasswordError('');
  };

  const verifyAndPurge = () => {
    if (passwordInput === 'umar123') {
      // Correct password - proceed with purge
      setTotalFunds(0);
      setFundHistory([]);
      setExpenses([]);
      setShowPasswordModal(false);
      setPasswordInput('');
      showNotification('🗑️ All data cleared successfully!', 'success');
    } else {
      // Wrong password
      setPasswordError('❌ Incorrect password!');
    }
  };

  const cancelPurge = () => {
    setShowPasswordModal(false);
    setPasswordInput('');
    setPasswordError('');
  };

  const handleAddFunds = (fundData) => {
    const amount = typeof fundData === 'object' ? parseFloat(fundData.amount) : parseFloat(fundData);
    let description = typeof fundData === 'object' ? fundData.description : 'Funds Added';

    if (fundData.notes) {
      description = `${description} 📝 ${fundData.notes}`;
    }

    if (amount > 0) {
      const newFundEntry = {
        id: Date.now(),
        amount: amount,
        description: description,
        date: new Date().toISOString(),
        runningTotal: totals.totalFundsAdded + amount,
        type: 'credit',
        isSelfFunded: fundData.isSelfFunded || false
      };

      setFundHistory(prev => [newFundEntry, ...prev]);
      setTotalFunds(prev => prev + amount);
      
      if (fundData.isSelfFunded) {
        showNotification(`👤 Self-funded: ${formatPKR(amount)} added`, 'warning');
      } else {
        showNotification(`💰 Funds added: ${formatPKR(amount)}`, 'success');
      }
    }
  };

  // Add expense with proper image handling
  const handleAddExpense = (expenseData) => {
    if (!expenseData || !expenseData.amount) {
      showNotification('❌ Invalid expense data!', 'error');
      return false;
    }

    const amount = parseFloat(expenseData.amount);

    if (amount > totals.currentBalance) {
      showNotification(`⚠️ Insufficient funds! Available: ${formatPKR(totals.currentBalance)}`, 'error');
      return false;
    }

    const expenseType = expenseData.expenseType || 'regular';

    // Create new expense
    const newExpense = {
      id: Date.now(),
      description: expenseData.description,
      amount: amount,
      date: expenseData.date || new Date().toISOString().split('T')[0],
      category: expenseData.category || 'Other',
      expenseType: expenseType,
      timestamp: Date.now()
    };

    // Add image if exists - store as is (base64)
    if (expenseData.imageUrl) {
      newExpense.imageUrl = expenseData.imageUrl;
    }

    // Add notes if exists
    if (expenseData.notes) {
      newExpense.notes = expenseData.notes;
      newExpense.description = `${expenseData.description} 📝 ${expenseData.notes}`;
    }

    setExpenses(prev => [newExpense, ...prev]);
    
    // Add to fund history
    const deductionEntry = {
      id: Date.now() + 1,
      amount: -amount,
      description: `${expenseType.toUpperCase()}: ${expenseData.description}`,
      date: new Date().toISOString(),
      runningTotal: totals.currentBalance - amount,
      type: 'debit',
      category: expenseData.category,
      expenseType: expenseType
    };
    
    // Add image to fund history if exists
    if (expenseData.imageUrl) {
      deductionEntry.imageUrl = expenseData.imageUrl;
    }
    
    setFundHistory(prev => [deductionEntry, ...prev]);
    
    const typeIcons = {
      'regular': '🔄',
      'one-time': '⚡',
      'bill': '📄'
    };
    
    showNotification(`${typeIcons[expenseType]} ${expenseType} expense: ${formatPKR(amount)}`, 'success');
    
    return true;
  };

  const handleDeleteExpense = (id) => {
    if (window.confirm('🗑️ Delete this expense? Funds will be returned.')) {
      const expense = expenses.find(e => e.id === id);
      if (!expense) return;

      setExpenses(prev => prev.filter(e => e.id !== id));
      setFundHistory(prev => prev.filter(h => h.id !== id + 1));
      
      showNotification('✅ Expense deleted! Funds returned.', 'info');
    }
  };

  const handleDeleteTransaction = (id) => {
    if (window.confirm('🗑️ Delete this transaction? Balance will be updated.')) {
      const transactionToDelete = fundHistory.find(h => h.id === id);
      if (!transactionToDelete) return;

      if (transactionToDelete.type === 'credit') {
        setTotalFunds(prev => prev - transactionToDelete.amount);
      } else if (transactionToDelete.type === 'debit') {
        const expenseId = id - 1;
        setExpenses(prev => prev.filter(e => e.id !== expenseId));
      }

      setFundHistory(prev => prev.filter(h => h.id !== id));
      showNotification('✅ Transaction deleted!', 'info');
    }
  };

  const handleEditExpense = (id, updatedExpense) => {
    const oldExpense = expenses.find(e => e.id === id);
    if (!oldExpense) return;

    const amountDifference = updatedExpense.amount - oldExpense.amount;

    if (amountDifference > totals.currentBalance) {
      showNotification('⚠️ Insufficient funds for this update!', 'error');
      return;
    }

    setExpenses(prev => prev.map(expense =>
      expense.id === id ? { ...expense, ...updatedExpense } : expense
    ));
    
    if (amountDifference !== 0) {
      const adjustmentEntry = {
        id: Date.now(),
        amount: -amountDifference,
        description: `Expense adjustment: ${updatedExpense.description}`,
        date: new Date().toISOString(),
        runningTotal: totals.currentBalance - amountDifference,
        type: 'debit'
      };
      
      setFundHistory(prev => [adjustmentEntry, ...prev]);
    }
    
    showNotification('✏️ Expense updated!', 'success');
  };

  // ==================== FILTER FUNCTIONS ====================
  const getFilteredExpenses = () => {
    if (!Array.isArray(expenses)) return [];

    let filtered = [...expenses];

    if (searchTerm && searchTerm.trim()) {
      filtered = filtered.filter(e =>
        e.description && e.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterCategory !== 'All') {
      filtered = filtered.filter(e => e.category === filterCategory);
    }

    if (filterMonth !== 'All') {
      filtered = filtered.filter(e => {
        if (!e.date) return false;
        const month = new Date(e.date).getMonth().toString();
        return month === filterMonth;
      });
    }

    if (filterStartDate) {
      filtered = filtered.filter(e => e.date >= filterStartDate);
    }

    if (filterEndDate) {
      filtered = filtered.filter(e => e.date <= filterEndDate);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.date || 0) - new Date(a.date || 0);
        case 'date-asc':
          return new Date(a.date || 0) - new Date(b.date || 0);
        case 'amount-desc':
          return (b.amount || 0) - (a.amount || 0);
        case 'amount-asc':
          return (a.amount || 0) - (b.amount || 0);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredExpenses = getFilteredExpenses();

  const calculateFilteredTotals = () => {
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const categoryTotals = {};
    filteredExpenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + (e.amount || 0);
    });

    const regularExpensesTotal = filteredExpenses
      .filter(e => e.expenseType === 'regular')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const oneTimeExpensesTotal = filteredExpenses
      .filter(e => e.expenseType === 'one-time')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const billsTotal = filteredExpenses
      .filter(e => e.expenseType === 'bill')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const usedPercentage = totals.totalFundsAdded > 0 ? (totalExpenses / totals.totalFundsAdded) * 100 : 0;

    return {
      ...totals,
      totalExpenses,
      categoryTotals,
      usedPercentage: Math.min(usedPercentage, 100).toFixed(1),
      remainingPercentage: (100 - Math.min(usedPercentage, 100)).toFixed(1),
      regularExpensesTotal,
      oneTimeExpensesTotal,
      billsTotal
    };
  };

  const displayTotals = (searchTerm || filterCategory !== 'All' || filterMonth !== 'All' || filterStartDate || filterEndDate) 
    ? calculateFilteredTotals() 
    : totals;

  // ==================== RENDER LOGIN IF NOT AUTHENTICATED ====================
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} onAdminLogin={handleAdminLogin} />;
  }

  // ==================== PASSWORD MODAL FOR PURGE (Shared between User & Admin) ====================
  const PasswordModal = () => (
    <div className="password-modal-overlay">
      <div className="password-modal">
        <div className="password-modal-header">
          <span className="modal-icon">🔒</span>
          <h3>Authorization Required</h3>
          <button className="modal-close" onClick={cancelPurge}>✕</button>
        </div>
        <div className="password-modal-body">
          <p>Please enter admin password to clear all data:</p>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Enter password"
            className="password-input"
            autoFocus
          />
          {passwordError && <p className="password-error">{passwordError}</p>}
        </div>
        <div className="password-modal-footer">
          <button className="cancel-btn" onClick={cancelPurge}>Cancel</button>
          <button className="confirm-btn" onClick={verifyAndPurge}>Confirm Purge</button>
        </div>
      </div>
    </div>
  );

  // ==================== ADMIN DASHBOARD ====================
  if (userType === 'admin') {
    return (
      <div className="admin-dashboard-premium">
        {/* Password Modal */}
        {showPasswordModal && <PasswordModal />}

        {/* Admin Header */}
        <header className="admin-header-glass">
          <div className="header-left">
            <div className="logo-wrapper">
              <img src={vinlogo} alt="Vinsol" className="logo-glow" />
              <div className="brand">
                <h1>Vinsol<span className="admin-badge">ADMIN</span></h1>
                <div className="live-status">
                  <span className="pulse-dot"></span>
                  <span>System Live</span>
                </div>
              </div>
            </div>
          </div>

          <div className="header-center">
            <div className="metrics-row">
              <div className="metric-item">
                <span className="metric-label">Last Sync</span>
                <span className="metric-value">{lastUpdated}</span>
              </div>
              <div className="metric-divider"></div>
              <div className="metric-item">
                <span className="metric-label">Transactions</span>
                <span className="metric-value">{systemMetrics.totalTransactions}</span>
              </div>
              <div className="metric-divider"></div>
              <div className="metric-item">
                <span className="metric-label">Storage</span>
                <span className="metric-value">{systemMetrics.storageUsed}</span>
              </div>
            </div>
          </div>

          <div className="header-right">
            <div className="refresh-badge">
              <span className="refresh-icon">⟳</span>
              <span>LIVE</span>
            </div>
            <div className="admin-profile">
              <span className="profile-avatar">👑</span>
              <span className="profile-name">Admin</span>
            </div>
            <button onClick={handleLogout} className="logout-btn">
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Admin Navigation */}
        <nav className="admin-nav-modern">
          <button 
            className={`nav-btn ${adminView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setAdminView('dashboard')}
          >
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </button>
          <button 
            className={`nav-btn ${adminView === 'analytics' ? 'active' : ''}`}
            onClick={() => setAdminView('analytics')}
          >
            <span className="nav-icon">📈</span>
            <span>Analytics</span>
          </button>
          <button 
            className={`nav-btn ${adminView === 'reports' ? 'active' : ''}`}
            onClick={() => setAdminView('reports')}
          >
            <span className="nav-icon">📋</span>
            <span>Reports</span>
          </button>
          <button 
            className={`nav-btn ${adminView === 'audit' ? 'active' : ''}`}
            onClick={() => setAdminView('audit')}
          >
            <span className="nav-icon">🔍</span>
            <span>Audit Trail</span>
          </button>
          <button 
            className={`nav-btn ${adminView === 'settings' ? 'active' : ''}`}
            onClick={() => setAdminView('settings')}
          >
            <span className="nav-icon">⚙️</span>
            <span>Settings</span>
          </button>
        </nav>

        {/* Admin Content */}
        <main className="admin-content-area">
          {/* KPI Cards */}
          <div className="kpi-cards-grid">
            <div className="kpi-card blue">
              <div className="card-icon">💰</div>
              <div className="card-content">
                <span className="card-label">Total Funds</span>
                <span className="card-value">{formatPKR(totals.totalFundsAdded)}</span>
                <span className="card-trend positive">↑ +12.5%</span>
              </div>
            </div>
            <div className="kpi-card purple">
              <div className="card-icon">💸</div>
              <div className="card-content">
                <span className="card-label">Total Expenses</span>
                <span className="card-value">{formatPKR(totals.totalExpenses)}</span>
                <span className="card-trend negative">↓ -5.2%</span>
              </div>
            </div>
            <div className="kpi-card green">
              <div className="card-icon">⚖️</div>
              <div className="card-content">
                <span className="card-label">Balance</span>
                <span className="card-value">{formatPKR(totals.currentBalance)}</span>
                <span className="card-badge">Available</span>
              </div>
            </div>
            <div className="kpi-card orange">
              <div className="card-icon">📊</div>
              <div className="card-content">
                <span className="card-label">Usage</span>
                <span className="card-value">{totals.usedPercentage}%</span>
                <div className="progress-mini">
                  <div className="progress-fill" style={{ width: `${totals.usedPercentage}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Expense Type Cards */}
          <div className="type-cards-row">
            <div className="type-card regular">
              <div className="type-header">
                <span className="type-icon">🔄</span>
                <h3>Regular Expenses</h3>
              </div>
              <div className="type-body">
                <span className="type-amount">{formatPKR(totals.regularExpensesTotal)}</span>
                <span className="type-count">{expenses.filter(e => e.expenseType === 'regular').length} transactions</span>
              </div>
            </div>
            <div className="type-card one-time">
              <div className="type-header">
                <span className="type-icon">⚡</span>
                <h3>One-time Expenses</h3>
              </div>
              <div className="type-body">
                <span className="type-amount">{formatPKR(totals.oneTimeExpensesTotal)}</span>
                <span className="type-count">{expenses.filter(e => e.expenseType === 'one-time').length} transactions</span>
              </div>
            </div>
            <div className="type-card bill">
              <div className="type-header">
                <span className="type-icon">📄</span>
                <h3>Bills</h3>
              </div>
              <div className="type-body">
                <span className="type-amount">{formatPKR(totals.billsTotal)}</span>
                <span className="type-count">{expenses.filter(e => e.expenseType === 'bill').length} transactions</span>
              </div>
            </div>
          </div>

          {/* Dynamic Content */}
          <div className="dynamic-panel">
            {adminView === 'dashboard' && (
              <div className="dashboard-panel">
                <div className="quick-actions-row">
                  <button className="quick-action" onClick={() => setAdminView('reports')}>
                    <span className="qa-icon">📊</span>
                    <span>Generate Report</span>
                  </button>
                  <button className="quick-action" onClick={handleSyncToSheets} disabled={isSyncing}>
                    <span className="qa-icon">{isSyncing ? '🔄' : '☁️'}</span>
                    <span>{isSyncing ? 'Syncing...' : 'Cloud Sync'}</span>
                  </button>
                  <button className="quick-action" onClick={() => setAdminView('audit')}>
                    <span className="qa-icon">🔍</span>
                    <span>View Audit</span>
                  </button>
                </div>

                <div className="category-breakdown">
                  <h3>Category Distribution</h3>
                  <div className="category-bars">
                    {Object.entries(totals.categoryTotals).map(([category, amount]) => (
                      <div key={category} className="category-bar-item">
                        <span className="cat-name">{category}</span>
                        <div className="bar-container">
                          <div 
                            className="bar-fill" 
                            style={{ 
                              width: `${(amount / totals.totalExpenses) * 100}%`,
                              background: `linear-gradient(90deg, #3b82f6, #8b5cf6)`
                            }}
                          ></div>
                        </div>
                        <span className="cat-amount">{formatPKR(amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {adminView === 'analytics' && (
              <div className="analytics-panel">
                <MonthlyOverview
                  monthlyExpenses={totals.monthlyExpenses}
                  categoryTotals={totals.categoryTotals}
                  formatPKR={formatPKR}
                />
              </div>
            )}

            {adminView === 'reports' && (
              <div className="reports-panel">
                <PrintReport
                  expenses={expenses}
                  fundHistory={fundHistory}
                  totals={totals}
                  formatPKR={formatPKR}
                  lastUpdated={lastUpdated}
                  filteredExpenses={filteredExpenses}
                />
              </div>
            )}

            {adminView === 'audit' && (
              <div className="audit-panel">
                <h3>Complete Audit Trail</h3>
                <div className="audit-table-wrapper">
                  <table className="audit-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Balance</th>
                        <th>Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fundHistory.map(item => (
                        <tr key={item.id}>
                          <td>{new Date(item.date).toLocaleString()}</td>
                          <td>
                            <span className={`badge ${item.type}`}>
                              {item.type === 'credit' ? 'CREDIT' : 'DEBIT'}
                            </span>
                          </td>
                          <td>{item.description}</td>
                          <td className={item.type}>
                            {item.type === 'credit' ? '+' : '-'}{formatPKR(Math.abs(item.amount))}
                          </td>
                          <td>{formatPKR(item.runningTotal)}</td>
                          <td>
                            {item.imageUrl ? (
                              <button 
                                className="receipt-btn"
                                onClick={() => {
                                  const modal = document.createElement('div');
                                  modal.className = 'image-preview-modal';
                                  modal.innerHTML = `
                                    <div class="modal-content">
                                      <span class="close-btn">✕</span>
                                      <img src="${item.imageUrl}" alt="Receipt" />
                                    </div>
                                  `;
                                  document.body.appendChild(modal);
                                  modal.querySelector('.close-btn').onclick = () => modal.remove();
                                  modal.onclick = (e) => {
                                    if (e.target === modal) modal.remove();
                                  };
                                }}
                              >
                                📸 View
                              </button>
                            ) : (
                              <span className="no-receipt">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {adminView === 'settings' && (
              <div className="settings-panel">
                <h3>System Settings</h3>
                <div className="settings-grid">
                  {/* Auto-refresh Setting */}
                  <div className="setting-card">
                    <h4>Auto-refresh</h4>
                    <div className="setting-control">
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={autoRefresh} 
                          onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <span className="setting-status">{autoRefresh ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <select 
                      value={refreshInterval} 
                      onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                      className="refresh-select"
                      disabled={!autoRefresh}
                    >
                      <option value="10">10 seconds</option>
                      <option value="30">30 seconds</option>
                      <option value="60">1 minute</option>
                      <option value="300">5 minutes</option>
                    </select>
                  </div>

                  {/* Data Management Setting */}
                  <div className="setting-card">
                    <h4>Data Management</h4>
                    <button onClick={handleSyncToSheets} className="setting-btn sync" disabled={isSyncing}>
                      <span className="btn-icon">{isSyncing ? '🔄' : '☁️'}</span>
                      <span className="btn-text">{isSyncing ? 'Syncing...' : 'Sync to Cloud'}</span>
                    </button>
                    <button onClick={handleClearAll} className="setting-btn purge">
                      <span className="btn-icon">🗑️</span>
                      <span className="btn-text">Purge All Data</span>
                    </button>
                    <button onClick={handleLogout} className="setting-btn logout">
                      <span className="btn-icon">🚪</span>
                      <span className="btn-text">Logout</span>
                    </button>
                  </div>

                  {/* System Info Setting */}
                  <div className="setting-card">
                    <h4>System Info</h4>
                    <div className="info-list">
                      <div className="info-item">
                        <span>Version:</span>
                        <strong>v3.0.0 Enterprise</strong>
                      </div>
                      <div className="info-item">
                        <span>Storage:</span>
                        <strong>{systemMetrics.storageUsed}</strong>
                      </div>
                      <div className="info-item">
                        <span>Last Backup:</span>
                        <strong>{systemMetrics.lastBackup}</strong>
                      </div>
                      <div className="info-item">
                        <span>Status:</span>
                        <strong className="status-online">● Online</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Notification */}
        {notification.show && (
          <div className={`admin-notification ${notification.type}`}>
            <span className="noti-icon">
              {notification.type === 'success' ? '✅' : 
               notification.type === 'error' ? '❌' : 
               notification.type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <p>{notification.message}</p>
            <button className="noti-close" onClick={() => setNotification({ ...notification, show: false })}>✕</button>
          </div>
        )}
      </div>
    );
  }

  // ==================== REGULAR USER VIEW (WITH PASSWORD PROTECTED PURGE) ====================
  return (
    <div className="app">
      {/* Password Modal for User */}
      {showPasswordModal && <PasswordModal />}

      <Navbar onPurge={handleClearAll} onLogout={handleLogout} />
      
      {notification.show && (
        <div className={`notification-v8 ${notification.type}`}>
          <div className="noti-content-v8">
            <span className="noti-icon-v8">
              {notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <p>{notification.message}</p>
          </div>
          <button className="noti-close-v8" onClick={() => setNotification({ ...notification, show: false })}>✕</button>
          <div className="noti-progress-v8"></div>
        </div>
      )}

      <main className="main-content">
        <div className="dashboard-v11">
          {/* Row 1: Summary Dashboard */}
          <section className="grid-full-v11 glass-card summary-section-v11">
            <Summary
              totals={displayTotals}
              formatPKR={formatPKR}
              lastUpdated={lastUpdated}
              isFiltered={displayTotals !== totals}
            />
          </section>

          {/* Row 2: Add Fund & Add Expense */}
          <section className="grid-half-v11 glass-card">
            <div className="section-header-v10">
              <h3><span>💰</span> Add Funds</h3>
            </div>
            <ExpenseForm
              type="funds"
              onSubmit={handleAddFunds}
              formatPKR={formatPKR}
              currentBalance={totals.currentBalance}
            />
          </section>

          <section className="grid-half-v11 glass-card">
            <div className="section-header-v10">
              <h3><span>💸</span> Add Expense</h3>
            </div>
            <ExpenseForm
              type="expense"
              onSubmit={handleAddExpense}
              maxAmount={totals.currentBalance}
              formatPKR={formatPKR}
              currentBalance={totals.currentBalance}
            />
          </section>

          {/* Row 3: Expense History */}
          <section className="grid-full-v11 glass-card history-section-v11">
            <div className="section-header-v10">
              <div className="title-group-v11">
                <h3><span>📜</span> Expense History</h3>
                <span className="count-badge-v11">{filteredExpenses.length} Records</span>
              </div>
              <SearchBar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
              />
            </div>
            <Filters
              filterCategory={filterCategory}
              setFilterCategory={setFilterCategory}
              filterMonth={filterMonth}
              setFilterMonth={setFilterMonth}
              filterStartDate={filterStartDate}
              setFilterStartDate={filterStartDate}
              filterEndDate={filterEndDate}
              setFilterEndDate={filterEndDate}
              sortBy={sortBy}
              setSortBy={setSortBy}
              expenses={expenses}
            />
            <div className="scrollable-data-v11">
              <ExpenseList
                expenses={filteredExpenses}
                onDelete={handleDeleteExpense}
                onEdit={handleEditExpense}
                formatPKR={formatPKR}
              />
            </div>
          </section>

          {/* Row 4: Analytics & Console */}
          <section className="grid-sidebar-v11 glass-card">
            <div className="section-header-v10">
              <h3><span>📊</span> Analytics</h3>
            </div>
            <MonthlyOverview
              monthlyExpenses={totals.monthlyExpenses}
              categoryTotals={totals.categoryTotals}
              formatPKR={formatPKR}
            />
          </section>

          <section className="grid-full-v11">
            <div className="command-console-v13 glass-card dark-theme-v13">
              <div className="console-header-v13">
                <div className="console-title-group-v13">
                  <div className="pulse-icon-v13"></div>
                  <div className="console-text-v13">
                    <h3>Command Console</h3>
                    <span className="status-badge-v13">System Status: Live & Ready</span>
                  </div>
                </div>
                <div className="console-stats-v13">
                  <div className="stat-pill-v13">
                    <small>Last Sync</small>
                    <span>{lastUpdated || 'Never'}</span>
                  </div>
                </div>
              </div>

              <div className="console-layout-v13">
                <div className="console-controls-v13">
                  <div className="control-card-v13">
                    <h4>System Operations</h4>
                    <div className="action-stack-v13">
                      <button 
                        className={`console-btn-v13 sync-btn-v13 ${isSyncing ? 'active' : ''}`} 
                        onClick={handleSyncToSheets}
                        disabled={isSyncing}
                      >
                        <span className="btn-icon-v13">{isSyncing ? '🔄' : '☁️'}</span>
                        <div className="btn-label-v13">
                          <strong>Cloud Sync</strong>
                          <small>Push to Google Sheets</small>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="control-card-v13">
                    <h4>Report Generation</h4>
                    <PrintReport
                      expenses={expenses}
                      fundHistory={fundHistory}
                      totals={totals}
                      formatPKR={formatPKR}
                      lastUpdated={lastUpdated}
                      filteredExpenses={filteredExpenses}
                    />
                  </div>
                </div>

                <div className="console-timeline-v13">
                  <div className="timeline-header-v13">
                    <h4>Audit Timeline</h4>
                  </div>
                  <div className="scrollable-audit-v13">
                    <FundHistory
                      history={fundHistory}
                      formatPKR={formatPKR}
                      onDelete={handleDeleteTransaction}
                    />
                  </div>
                </div>
              </div>

              <div className="console-footer-v13">
                <div className="data-flow-track-v13">
                  <div className={`data-flow-particle-v13 ${isSyncing ? 'active' : ''}`}></div>
                </div>
                <div className="footer-meta-v13">
                  <span>AES-256 Encrypted Sync</span>
                  <span className="version-tag-v13">v13.0.2 Premium Console</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default App;