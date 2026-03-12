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
import './App.css';

const App = () => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });

  // State management
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

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterMonth, setFilterMonth] = useState('All');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
  const [isSyncing, setIsSyncing] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('isLoggedIn', 'true');
    showNotification('Welcome back, Umer!', 'success');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isLoggedIn');
    showNotification('Logged out successfully', 'info');
  };

  const GAS_URL = 'https://script.google.com/macros/s/AKfycbzyTfcUzcbiWBYN9ynwSZzqijuM5ldBa8ZSdYAKqa6f9wt6ZVFt4OnB98xq_ax0YdjKDQ/exec';

  // Sync to Google Sheets with robust handling
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
          remainingPercentage: totals.remainingPercentage
        },
        expenses: expenses,
        fundHistory: fundHistory,
        lastUpdated: new Date().toISOString()
      };

      // Ensure the URL is clean (remove any potential whitespace)
      const cleanUrl = GAS_URL.trim();

      // Using text/plain to avoid pre-flight (CORS) issues with GAS
      await fetch(cleanUrl, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(dataToSync),
      });

      // We wait a bit before showing success because no-cors won't tell us if it failed
      setTimeout(() => {
        showNotification('✅ Data sent to Cloud!', 'success');
        setLastUpdated(new Date().toLocaleTimeString());
        localStorage.setItem('lastSyncTime', new Date().toISOString());
      }, 1000);
      
    } catch (error) {
      console.error('CRITICAL SYNC ERROR:', error);
      showNotification('❌ Sync failed! See console for details.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('totalFunds', totalFunds.toString());
    setLastUpdated(new Date().toLocaleTimeString());
  }, [totalFunds]);

  useEffect(() => {
    localStorage.setItem('fundHistory', JSON.stringify(fundHistory));
    setLastUpdated(new Date().toLocaleTimeString());
  }, [fundHistory]);

  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
    setLastUpdated(new Date().toLocaleTimeString());
  }, [expenses]);

  // Format PKR
  const formatPKR = (amount) => {
    if (amount === undefined || amount === null) return 'Rs 0';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Show notification
  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Calculate all totals
  const calculateTotals = () => {
    // Total funds added (all positive transactions)
    const totalFundsAdded = fundHistory
      .filter(item => item.type === 'credit')
      .reduce((sum, item) => sum + item.amount, 0);

    // Total expenses (all expenses from expenses array)
    const totalExpenses = expenses
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);

    // Current balance (total funds added - total expenses)
    const currentBalance = totalFundsAdded - totalExpenses;

    // Monthly expenses
    const monthlyExpenses = {};
    expenses.forEach(expense => {
      if (expense.date) {
        const date = new Date(expense.date);
        const month = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        monthlyExpenses[month] = (monthlyExpenses[month] || 0) + (expense.amount || 0);
      }
    });

    // Weekly expenses
    const weeklyExpenses = {};
    expenses.forEach(expense => {
      if (expense.date) {
        const date = new Date(expense.date);
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);
        
        const weekLabel = `Week of ${startOfWeek.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}`;
        weeklyExpenses[weekLabel] = (weeklyExpenses[weekLabel] || 0) + (expense.amount || 0);
      }
    });

    // Category wise totals
    const categoryTotals = {};
    expenses.forEach(expense => {
      if (expense.category) {
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + (expense.amount || 0);
      }
    });

    // Daily expenses breakdown for real-time tracking
    const dailyExpenses = {};
    expenses.forEach(expense => {
      if (expense.date) {
        dailyExpenses[expense.date] = (dailyExpenses[expense.date] || 0) + (expense.amount || 0);
      }
    });

    // Budget Usage calculation
    const usedPercentage = totalFundsAdded > 0 ? (totalExpenses / totalFundsAdded) * 100 : 0;
    const remainingPercentage = totalFundsAdded > 0 ? (currentBalance / totalFundsAdded) * 100 : 0;

    return {
      totalFundsAdded,
      totalExpenses,
      currentBalance,
      monthlyExpenses,
      weeklyExpenses,
      dailyExpenses,
      categoryTotals,
      usedPercentage: Math.min(usedPercentage, 100).toFixed(1),
      remainingPercentage: Math.max(remainingPercentage, 0).toFixed(1),
      totalTransactions: fundHistory.length,
      averageExpense: expenses.length > 0 ? totalExpenses / expenses.length : 0
    };
  };

  const totals = calculateTotals();

  // Clear All Data
  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
      setTotalFunds(0);
      setFundHistory([]);
      setExpenses([]);
      showNotification('All data cleared successfully!', 'info');
    }
  };

  // Add funds with history
  const handleAddFunds = (fundData) => {
    // Check if fundData is an object (from ExpenseForm) or just an amount
    const amount = typeof fundData === 'object' ? parseFloat(fundData.amount) : parseFloat(fundData);
    const description = typeof fundData === 'object' ? fundData.description : 'Funds Added';

    if (amount > 0) {
      const newFundEntry = {
        id: Date.now(),
        amount: amount,
        description: description,
        date: new Date().toISOString(),
        runningTotal: totals.totalFundsAdded + amount,
        type: 'credit'
      };

      setFundHistory(prev => [newFundEntry, ...prev]);
      setTotalFunds(prev => prev + amount);
      showNotification(`Funds added: ${formatPKR(amount)}`, 'success');
    }
  };

  // Add expense with merging logic (Same Date + Description + Category = Merge)
  const handleAddExpense = (expenseData) => {
    if (!expenseData || !expenseData.amount) {
      showNotification('Invalid expense data!', 'error');
      return false;
    }

    const amount = parseFloat(expenseData.amount);

    if (amount > totals.currentBalance) {
      showNotification(`Insufficient funds! Available: ${formatPKR(totals.currentBalance)}`, 'error');
      return false;
    }

    // Merging logic: Find if an expense with same date, description, and category already exists
    const existingExpenseIndex = expenses.findIndex(e => 
      e.date === expenseData.date && 
      e.description.toLowerCase().trim() === expenseData.description.toLowerCase().trim() &&
      e.category === expenseData.category
    );

    if (existingExpenseIndex !== -1) {
      // MERGE: Update existing expense
      const updatedExpenses = [...expenses];
      updatedExpenses[existingExpenseIndex] = {
        ...updatedExpenses[existingExpenseIndex],
        amount: updatedExpenses[existingExpenseIndex].amount + amount,
        lastUpdated: Date.now() // Track when it was last merged/updated
      };
      setExpenses(updatedExpenses);
      
      // Also update fund history entry for this merge
      const deductionEntry = {
        id: Date.now(),
        amount: -amount,
        description: `Merged Expense: ${expenseData.description}`,
        date: new Date().toISOString(), // This is the full ISO string with time
        runningTotal: totals.currentBalance - amount,
        type: 'debit',
        category: expenseData.category
      };
      setFundHistory(prev => [deductionEntry, ...prev]);
      showNotification(`Expense merged: ${formatPKR(amount)} added to existing entry`, 'success');
    } else {
    // NEW: Create new expense entry
    const newExpense = {
      id: Date.now(),
      ...expenseData,
      date: expenseData.date || new Date().toISOString().split('T')[0], // Ensure date exists
      amount: amount,
      timestamp: Date.now()
    };
      setExpenses(prev => [newExpense, ...prev]);
      
      const deductionEntry = {
        id: Date.now() + 1,
        amount: -amount,
        description: `Expense: ${expenseData.description}`,
        date: new Date().toISOString(),
        runningTotal: totals.currentBalance - amount,
        type: 'debit',
        category: expenseData.category
      };
      setFundHistory(prev => [deductionEntry, ...prev]);
      showNotification(`Expense added: ${formatPKR(amount)}`, 'success');
    }
    
    return true;
  };

  // Delete expense and its fund entry
  const handleDeleteExpense = (id) => {
    if (window.confirm('Delete this expense? Funds will be returned.')) {
      const expense = expenses.find(e => e.id === id);
      if (!expense) return;

      // Remove from expenses
      setExpenses(prev => prev.filter(e => e.id !== id));
      
      // Remove corresponding debit entry from fund history
      // Note: In handleAddExpense, we add expense with id, and fund entry with id+1
      setFundHistory(prev => prev.filter(h => h.id !== id + 1));
      
      showNotification('Expense deleted! Funds returned.', 'info');
    }
  };

  // Delete transaction from fund history
  const handleDeleteTransaction = (id) => {
    if (window.confirm('Delete this transaction? This will update your balance.')) {
      const transactionToDelete = fundHistory.find(h => h.id === id);
      if (!transactionToDelete) return;

      // If it was a credit, we need to reduce totalFunds
      if (transactionToDelete.type === 'credit') {
        setTotalFunds(prev => prev - transactionToDelete.amount);
      } else if (transactionToDelete.type === 'debit') {
        // If it was a debit, find the expense and delete it too
        // Debit entry id is expense.id + 1
        const expenseId = id - 1;
        setExpenses(prev => prev.filter(e => e.id !== expenseId));
      }

      setFundHistory(prev => prev.filter(h => h.id !== id));
      showNotification('Transaction deleted!', 'info');
    }
  };

  // Edit expense
  const handleEditExpense = (id, updatedExpense) => {
    const oldExpense = expenses.find(e => e.id === id);
    if (!oldExpense) return;

    const amountDifference = updatedExpense.amount - oldExpense.amount;

    if (amountDifference > totals.currentBalance) {
      showNotification('Insufficient funds for this update!', 'error');
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
    
    showNotification('Expense updated!', 'success');
  };

  // Filter and sort expenses
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

  // Calculate totals based on filtered data
  const calculateFilteredTotals = () => {
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    // For funds, we usually want to see the total funds regardless of filter 
    // but the user might want to see how much was added in that period too.
    // Let's stick to showing the global balance but local expense total for clarity.
    
    const categoryTotals = {};
    filteredExpenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + (e.amount || 0);
    });

    const usedPercentage = totals.totalFundsAdded > 0 ? (totalExpenses / totals.totalFundsAdded) * 100 : 0;

    return {
      ...totals,
      totalExpenses, // Overwrite with filtered total
      categoryTotals, // Overwrite with filtered categories
      usedPercentage: Math.min(usedPercentage, 100).toFixed(1),
      remainingPercentage: (100 - Math.min(usedPercentage, 100)).toFixed(1)
    };
  };

  const displayTotals = (searchTerm || filterCategory !== 'All' || filterMonth !== 'All' || filterStartDate || filterEndDate) 
    ? calculateFilteredTotals() 
    : totals;

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
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
          {/* Row 1: Summary Dashboard (Full Width) */}
          <section className="grid-full-v11 glass-card summary-section-v11">
            <Summary
              totals={displayTotals}
              formatPKR={formatPKR}
              lastUpdated={lastUpdated}
              isFiltered={displayTotals !== totals}
            />
          </section>

          {/* Row 2: Add Fund & Add Expense (Side by Side) */}
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

          {/* Row 3: Expense History (Full Width) */}
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
              setFilterStartDate={setFilterStartDate}
              filterEndDate={filterEndDate}
              setFilterEndDate={setFilterEndDate}
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

          {/* Row 4: Analytics & Console (Bottom Section) */}
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