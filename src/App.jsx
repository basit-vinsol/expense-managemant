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
import Attendance from './components/Attendance';
import vinlogo from './assets/vinlogo.png';
import './App.css';
import './AdminDashboard.css';
import Swal from 'sweetalert2';

const App = () => {
  // ==================== AUTHENTICATION STATE ====================
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    return loggedIn;
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
  const [activeTab, setActiveTab] = useState('expenses');
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
    const sessionId = Date.now().toString();
    sessionStorage.setItem('sessionId', sessionId);
    localStorage.setItem('currentSessionId', sessionId);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userType', 'user');
    setIsAuthenticated(true);
    setUserType('user');
    showNotification('🌟 Welcome back! Ready to track expenses?', 'success');
  };

  const handleAdminLogin = () => {
    const sessionId = Date.now().toString();
    sessionStorage.setItem('sessionId', sessionId);
    localStorage.setItem('currentSessionId', sessionId);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userType', 'admin');
    setIsAuthenticated(true);
    setUserType('admin');
    showNotification('👑 Admin Access Granted • System Ready', 'success');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('sessionId');
    localStorage.removeItem('currentSessionId');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userType');
    setIsAuthenticated(false);
    setUserType(null);
    showNotification('👋 Logged out successfully', 'info');
  };

  // ==================== SINGLE SESSION ENFORCEMENT ====================
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'isLoggedIn' && !e.newValue) {
        setIsAuthenticated(false);
        setUserType(null);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ==================== GOOGLE SHEETS SYNC ====================
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbwOemeVXXKOdv8MBJK_0du2urz9zNkzz6qHVdDt1EK7gXqaSbzcK_J4WtByuCGY7w1owg/exec';

  const normalizeExpenseDate = (value) => {
    if (!value) return new Date().toISOString().split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString().split('T')[0] : parsed.toISOString().split('T')[0];
  };

  // ==================== CHECK STORAGE AVAILABILITY ====================
  const checkStorageAvailable = () => {
    try {
      const test = 'storage_test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  };

  const getStorageSize = () => {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length * 2; // UTF-16
      }
    }
    return (total / 1024 / 1024).toFixed(2); // MB
  };

  // ==================== HELPER: COMPRESS IMAGE TO BASE64 (THUMBNAIL) ====================
  const compressImageToBase64 = (file, maxWidth = 300, quality = 0.5) => {
    return new Promise((resolve, reject) => {
      // Check file size first
      if (file.size > 2 * 1024 * 1024) { // 2MB
        reject(new Error('Image too large! Please use image under 2MB.'));
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Reduce size more aggressively
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to JPEG with lower quality
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          
          // Check if compressed size is reasonable (under 100KB)
          const sizeInKB = (compressedBase64.length * 3) / 4 / 1024;
          if (sizeInKB > 150) {
            // Try again with even lower quality
            const smallerBase64 = canvas.toDataURL('image/jpeg', 0.3);
            resolve(smallerBase64);
          } else {
            resolve(compressedBase64);
          }
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  // ==================== CLEAN OLD IMAGES FROM STORAGE ====================
  const cleanStorage = () => {
    try {
      const expensesData = JSON.parse(localStorage.getItem('expenses') || '[]');
      const fundHistoryData = JSON.parse(localStorage.getItem('fundHistory') || '[]');
      
      // Keep only last 50 items with images
      const maxItems = 50;
      
      if (expensesData.length > maxItems) {
        const cleaned = expensesData.slice(0, maxItems);
        localStorage.setItem('expenses', JSON.stringify(cleaned));
        setExpenses(cleaned);
      }
      
      if (fundHistoryData.length > maxItems) {
        const cleaned = fundHistoryData.slice(0, maxItems);
        localStorage.setItem('fundHistory', JSON.stringify(cleaned));
        setFundHistory(cleaned);
      }
      
      const size = getStorageSize();
      setSystemMetrics(prev => ({ ...prev, storageUsed: `${size} MB` }));
      
      return true;
    } catch (e) {
      console.error('Clean storage error:', e);
      return false;
    }
  };

  // ==================== SAFE LOCALSTORAGE SET ====================
  const safeSetItem = (key, value) => {
    try {
      // Check if storage is available
      if (!checkStorageAvailable()) {
        showNotification('⚠️ Storage is full! Cleaning up old data...', 'warning');
        cleanStorage();
        return false;
      }
      
      // Check current storage size
      const currentSize = getStorageSize();
      if (parseFloat(currentSize) > 4.5) { // 4.5MB warning
        showNotification('⚠️ Storage is getting full (>4.5MB). Consider syncing and clearing old data.', 'warning');
      }
      
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        showNotification('⚠️ Storage is full! Cleaning up old data...', 'warning');
        cleanStorage();
        // Try again after cleaning
        try {
          localStorage.setItem(key, value);
          return true;
        } catch (e) {
          showNotification('❌ Storage is still full. Please clear some data manually.', 'error');
          return false;
        }
      }
      console.error('Storage error:', error);
      return false;
    }
  };

  // ==================== FETCH FROM GOOGLE SHEETS ====================
  const handleFetchFromSheets = async () => {
    if (isSyncing) return;
    
    const result = await Swal.fire({
      title: '📥 Fetch from Google Sheets?',
      text: 'This will download all cloud data and overwrite your local data. Are you sure?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, fetch data!',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }

    setIsSyncing(true);
    showNotification('📥 Fetching data from Google Sheets...', 'info');

    try {
      const cleanUrl = GAS_URL.trim();
      const response = await fetch(`${cleanUrl}?type=expenses`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const json = await response.json();

      if (!json.success) {
        throw new Error(json.message || 'Failed to fetch data from Google Sheets');
      }

      if (!json.data || !json.data.expenses || json.data.expenses.length === 0) {
        await Swal.fire({
          icon: 'info',
          title: '📭 No Cloud Data',
          text: 'No expenses found in Google Sheets.',
          confirmButtonColor: '#3085d6'
        });
        setIsSyncing(false);
        return;
      }

      const { summary, expenses: sheetExpenses, fundHistory: sheetFundHistory } = json.data;

      let processedExpenses = [];
      if (Array.isArray(sheetExpenses) && sheetExpenses.length > 0) {
        // Limit to 50 items to avoid storage issues
        const limited = sheetExpenses.slice(0, 50);
        processedExpenses = limited.map((expense) => ({
          ...expense,
          id: expense.id || Date.now() + Math.random(),
          date: normalizeExpenseDate(expense.date),
          amount: Number(expense.amount) || 0,
          expenseType: expense.expenseType || 'regular',
          imageUrl: expense.imageUrl || null,
          imageBase64: expense.imageBase64 || null
        }));
      }

      let processedFundHistory = [];
      if (Array.isArray(sheetFundHistory) && sheetFundHistory.length > 0) {
        const limited = sheetFundHistory.slice(0, 50);
        processedFundHistory = limited.map((item) => ({
          ...item,
          id: item.id || Date.now() + Math.random(),
          amount: Number(item.amount) || 0,
          date: item.date || new Date().toISOString(),
          runningTotal: Number(item.runningTotal) || 0,
          type: item.type || (Number(item.amount) >= 0 ? 'credit' : 'debit'),
          imageUrl: item.imageUrl || null,
          imageBase64: item.imageBase64 || null
        }));
      }

      // Safe set items
      safeSetItem('expenses', JSON.stringify(processedExpenses));
      setExpenses(processedExpenses);

      safeSetItem('fundHistory', JSON.stringify(processedFundHistory));
      setFundHistory(processedFundHistory);

      let totalFundsFromSheet = 0;
      if (summary) {
        totalFundsFromSheet = Number(summary.totalFundsAdded) || 0;
      } else {
        totalFundsFromSheet = processedFundHistory
          .filter(item => item.type === 'credit')
          .reduce((sum, item) => sum + item.amount, 0);
      }
      setTotalFunds(totalFundsFromSheet);
      safeSetItem('totalFunds', String(totalFundsFromSheet));

      setLastUpdated(new Date().toLocaleTimeString());
      const size = getStorageSize();
      setSystemMetrics(prev => ({ 
        ...prev, 
        totalTransactions: processedFundHistory.length,
        lastBackup: 'Just now',
        syncStatus: 'online',
        storageUsed: `${size} MB`
      }));

      await Swal.fire({
        icon: 'success',
        title: '✅ Fetch Successful!',
        text: `Imported ${processedExpenses.length} expenses and ${processedFundHistory.length} transactions from Google Sheets.`,
        confirmButtonColor: '#3085d6'
      });

      showNotification(`✅ Data successfully imported from Google Sheets! (${processedExpenses.length} expenses)`, 'success');
      
    } catch (error) {
      console.error('Fetch from Sheets error:', error);
      
      await Swal.fire({
        icon: 'error',
        title: '❌ Fetch Failed',
        text: error.message || 'Failed to fetch data from Google Sheets. Check your connection.',
        confirmButtonColor: '#d33'
      });
      
      showNotification(`❌ Failed to fetch from Google Sheets: ${error.message || 'Unknown error'}`, 'error');
      setSystemMetrics(prev => ({ ...prev, syncStatus: 'offline' }));
    } finally {
      setIsSyncing(false);
    }
  };

  // ==================== PUSH TO GOOGLE SHEETS ====================
  const handleSyncToSheets = async () => {
    if (isSyncing) return;
    
    const result = await Swal.fire({
      title: '☁️ Push to Google Sheets?',
      text: 'This will upload your local data to the cloud and overwrite existing cloud data. Are you sure?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, push data!',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }

    setIsSyncing(true);
    showNotification('🔄 Syncing with Google Sheets...', 'info');

    try {
      const totals = calculateTotals();
      
      const expensesWithImages = expenses.map(expense => ({
        ...expense,
        imageBase64: expense.imageBase64 || expense.imageUrl || null
      }));

      const fundHistoryWithImages = fundHistory.map(item => ({
        ...item,
        imageBase64: item.imageBase64 || item.imageUrl || null
      }));

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
        expenses: expensesWithImages,
        fundHistory: fundHistoryWithImages,
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

      await Swal.fire({
        icon: 'success',
        title: '✅ Sync Successful!',
        text: `Uploaded ${expenses.length} expenses and ${fundHistory.length} transactions to Google Sheets.`,
        confirmButtonColor: '#3085d6'
      });

      setTimeout(() => {
        showNotification('✅ Data synced to Cloud!', 'success');
        setLastUpdated(new Date().toLocaleTimeString());
        safeSetItem('lastSyncTime', new Date().toISOString());
        setSystemMetrics(prev => ({ ...prev, lastBackup: 'Just now' }));
      }, 1000);
      
    } catch (error) {
      console.error('CRITICAL SYNC ERROR:', error);
      
      await Swal.fire({
        icon: 'error',
        title: '❌ Sync Failed',
        text: error.message || 'Failed to sync with Google Sheets. Check your connection.',
        confirmButtonColor: '#d33'
      });
      
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
        try {
          const savedExpenses = JSON.parse(localStorage.getItem('expenses') || '[]');
          const savedFundHistory = JSON.parse(localStorage.getItem('fundHistory') || '[]');
          const savedTotalFunds = parseFloat(localStorage.getItem('totalFunds') || '0');
          
          setExpenses(savedExpenses);
          setFundHistory(savedFundHistory);
          setTotalFunds(savedTotalFunds);
          setLastUpdated(new Date().toLocaleTimeString());
          const size = getStorageSize();
          setSystemMetrics(prev => ({
            ...prev,
            totalTransactions: savedFundHistory.length,
            activeUsers: 1,
            storageUsed: `${size} MB`
          }));
          
          const refreshNotif = document.querySelector('.admin-refresh-indicator');
          if (refreshNotif) {
            refreshNotif.classList.add('active');
            setTimeout(() => refreshNotif.classList.remove('active'), 1000);
          }
        } catch (e) {
          console.error('Auto-refresh error:', e);
        }
      }, refreshInterval * 1000);
    }
    return () => clearInterval(interval);
  }, [userType, autoRefresh, refreshInterval]);

  // ==================== LOCAL STORAGE SAVE (SAFE) ====================
  useEffect(() => {
    if (isAuthenticated) {
      safeSetItem('totalFunds', totalFunds.toString());
      setLastUpdated(new Date().toLocaleTimeString());
      const size = getStorageSize();
      setSystemMetrics(prev => ({ ...prev, storageUsed: `${size} MB` }));
    }
  }, [totalFunds, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      safeSetItem('fundHistory', JSON.stringify(fundHistory));
      setLastUpdated(new Date().toLocaleTimeString());
      const size = getStorageSize();
      setSystemMetrics(prev => ({ ...prev, totalTransactions: fundHistory.length, storageUsed: `${size} MB` }));
    }
  }, [fundHistory, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      safeSetItem('expenses', JSON.stringify(expenses));
      setLastUpdated(new Date().toLocaleTimeString());
      const size = getStorageSize();
      setSystemMetrics(prev => ({ ...prev, storageUsed: `${size} MB` }));
    }
  }, [expenses, isAuthenticated]);

  // ==================== CLEAN STORAGE ON MOUNT ====================
  useEffect(() => {
    if (isAuthenticated) {
      cleanStorage();
      const size = getStorageSize();
      setSystemMetrics(prev => ({ ...prev, storageUsed: `${size} MB` }));
    }
  }, [isAuthenticated]);

  // ==================== UTILITY FUNCTIONS ====================
  const formatPKR = (amount) => {
    if (amount === undefined || amount === null) return 'Rs 0';
    
    if (amount < 0) {
      return `-${new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(Math.abs(amount))}`;
    }
    
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
  const handleClearAll = () => {
    setShowPasswordModal(true);
    setPasswordInput('');
    setPasswordError('');
  };

  const verifyAndPurge = () => {
    if (passwordInput === 'umar123') {
      try {
        const clearedExpenses = [];
        const clearedFundHistory = [];
        setTotalFunds(0);
        setFundHistory(clearedFundHistory);
        setExpenses(clearedExpenses);
        safeSetItem('totalFunds', '0');
        safeSetItem('fundHistory', JSON.stringify(clearedFundHistory));
        safeSetItem('expenses', JSON.stringify(clearedExpenses));
        setShowPasswordModal(false);
        setPasswordInput('');
        const size = getStorageSize();
        setSystemMetrics(prev => ({ ...prev, storageUsed: `${size} MB` }));
        showNotification('🗑️ All data cleared successfully!', 'success');
      } catch (error) {
        showNotification('❌ Error clearing data!', 'error');
      }
    } else {
      setPasswordError('❌ Incorrect password!');
    }
  };

  const cancelPurge = () => {
    setShowPasswordModal(false);
    setPasswordInput('');
    setPasswordError('');
  };

  // ==================== ADD FUNDS WITH IMAGE SUPPORT ====================
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
        imageBase64: fundData.imageBase64 || null,
        imageUrl: fundData.imageUrl || null
      };

      const nextFundHistory = [newFundEntry, ...fundHistory];
      const nextTotalFunds = totalFunds + amount;

      setFundHistory(nextFundHistory);
      setTotalFunds(nextTotalFunds);
      
      showNotification(`💰 Funds added: ${formatPKR(amount)}`, 'success');
    }
  };

  // ==================== ADD EXPENSE WITH IMAGE SUPPORT (FIXED) ====================
  const handleAddExpense = async (expenseData) => {
    if (!expenseData || !expenseData.amount) {
      showNotification('❌ Invalid expense data!', 'error');
      return false;
    }

    const amount = parseFloat(expenseData.amount);
    const expenseType = expenseData.expenseType || 'regular';

    // Handle image upload - compress with higher compression
    let imageBase64 = null;
    if (expenseData.imageFile) {
      try {
        // Check storage before processing image
        const currentSize = getStorageSize();
        if (parseFloat(currentSize) > 4.0) {
          showNotification('⚠️ Storage is full! Please sync and clear data first.', 'warning');
          return false;
        }
        
        // Compress with smaller size
        imageBase64 = await compressImageToBase64(expenseData.imageFile, 200, 0.4);
        showNotification('📸 Image compressed successfully!', 'info');
      } catch (error) {
        console.error('Image compression failed:', error);
        showNotification(`⚠️ ${error.message || 'Image upload failed, proceeding without image'}`, 'warning');
        imageBase64 = null;
      }
    }

    // Create new expense
    const newExpense = {
      id: Date.now(),
      description: expenseData.description,
      amount: amount,
      date: expenseData.date || new Date().toISOString().split('T')[0],
      category: expenseData.category || 'Other',
      expenseType: expenseType,
      timestamp: Date.now(),
      imageBase64: imageBase64 || null,
      imageUrl: expenseData.imageUrl || null
    };

    if (expenseData.notes) {
      newExpense.notes = expenseData.notes;
      newExpense.description = `${expenseData.description} 📝 ${expenseData.notes}`;
    }

    // Limit expenses to 50 items
    let nextExpenses = [newExpense, ...expenses];
    if (nextExpenses.length > 50) {
      nextExpenses = nextExpenses.slice(0, 50);
      showNotification('⚠️ Only last 50 expenses kept to save storage', 'warning');
    }
    setExpenses(nextExpenses);
    
    // Calculate new running total
    const newRunningTotal = totals.currentBalance - amount;
    
    // Add to fund history with image
    const deductionEntry = {
      id: Date.now() + 1,
      amount: -amount,
      description: `${expenseType.toUpperCase()}: ${expenseData.description}`,
      date: new Date().toISOString(),
      runningTotal: newRunningTotal,
      type: 'debit',
      category: expenseData.category,
      expenseType: expenseType,
      imageBase64: imageBase64 || null,
      imageUrl: expenseData.imageUrl || null
    };
    
    let nextFundHistory = [deductionEntry, ...fundHistory];
    if (nextFundHistory.length > 50) {
      nextFundHistory = nextFundHistory.slice(0, 50);
    }
    setFundHistory(nextFundHistory);
    
    const typeIcons = {
      'regular': '🔄',
      'one-time': '⚡',
      'bill': '📄'
    };
    
    if (newRunningTotal < 0) {
      showNotification(`⚠️ ${typeIcons[expenseType]} Expense added! Balance is now negative: ${formatPKR(newRunningTotal)}`, 'warning');
    } else {
      showNotification(`${typeIcons[expenseType]} ${expenseType} expense: ${formatPKR(amount)}`, 'success');
    }

    return true;
  };

  const handleDeleteExpense = (id) => {
    if (window.confirm('🗑️ Delete this expense? Funds will be returned.')) {
      const expense = expenses.find(e => e.id === id);
      if (!expense) return;

      const nextExpenses = expenses.filter(e => e.id !== id);
      const nextFundHistory = fundHistory.filter(h => h.id !== id + 1);

      setExpenses(nextExpenses);
      setFundHistory(nextFundHistory);
      
      showNotification('✅ Expense deleted! Funds returned.', 'info');
    }
  };

  const handleDeleteTransaction = (id) => {
    if (window.confirm('🗑️ Delete this transaction? Balance will be updated.')) {
      const transactionToDelete = fundHistory.find(h => h.id === id);
      if (!transactionToDelete) return;

      if (transactionToDelete.type === 'credit') {
        const nextTotalFunds = totalFunds - transactionToDelete.amount;
        setTotalFunds(nextTotalFunds);
        const nextFundHistory = fundHistory.filter(h => h.id !== id);
        setFundHistory(nextFundHistory);
        showNotification('✅ Transaction deleted!', 'info');
        return;
      } else if (transactionToDelete.type === 'debit') {
        const expenseId = id - 1;
        const nextExpenses = expenses.filter(e => e.id !== expenseId);
        const nextFundHistory = fundHistory.filter(h => h.id !== id);
        setExpenses(nextExpenses);
        setFundHistory(nextFundHistory);
        showNotification('✅ Transaction deleted!', 'info');
        return;
      }

      const nextFundHistory = fundHistory.filter(h => h.id !== id);
      setFundHistory(nextFundHistory);
      showNotification('✅ Transaction deleted!', 'info');
    }
  };

  const handleEditExpense = (id, updatedExpense) => {
    const oldExpense = expenses.find(e => e.id === id);
    if (!oldExpense) return;

    const amountDifference = updatedExpense.amount - oldExpense.amount;

    const nextExpenses = expenses.map(expense =>
      expense.id === id ? { ...expense, ...updatedExpense } : expense
    );
    setExpenses(nextExpenses);
    
    if (amountDifference !== 0) {
      const adjustmentEntry = {
        id: Date.now(),
        amount: -amountDifference,
        description: `Expense adjustment: ${updatedExpense.description}`,
        date: new Date().toISOString(),
        runningTotal: totals.currentBalance - amountDifference,
        type: 'debit',
        imageBase64: updatedExpense.imageBase64 || null
      };
      
      const nextFundHistory = [adjustmentEntry, ...fundHistory];
      setFundHistory(nextFundHistory);
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

  // ==================== PASSWORD MODAL FOR PURGE ====================
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
        {showPasswordModal && <PasswordModal />}

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

        <main className="admin-content-area">
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
                <span className="card-label">Current Balance</span>
                <span className={`card-value ${totals.currentBalance < 0 ? 'negative' : ''}`}>
                  {formatPKR(totals.currentBalance)}
                </span>
                {totals.currentBalance < 0 && (
                  <span className="card-badge negative">Overdraft</span>
                )}
              </div>
            </div>
            <div className="kpi-card orange">
              <div className="card-icon">📊</div>
              <div className="card-content">
                <span className="card-label">Usage</span>
                <span className="card-value">{totals.usedPercentage}%</span>
                <div className="progress-mini">
                  <div className="progress-fill" style={{ width: `${Math.min(totals.usedPercentage, 100)}%` }}></div>
                </div>
              </div>
            </div>
          </div>

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

          <div className="dynamic-panel">
            {adminView === 'dashboard' && (
              <div className="dashboard-panel">
                <div className="quick-actions-row">
                  <button className="quick-action" onClick={() => setAdminView('reports')}>
                    <span className="qa-icon">📊</span>
                    <span>Generate Report</span>
                  </button>
                  <button className="quick-action" onClick={() => setAdminView('audit')}>
                    <span className="qa-icon">🔍</span>
                    <span>View Audit</span>
                  </button>
                  <button className="quick-action" onClick={() => setAdminView('analytics')}>
                    <span className="qa-icon">📈</span>
                    <span>Analytics</span>
                  </button>
                  <button 
                    className="quick-action" 
                    onClick={handleFetchFromSheets} 
                    disabled={isSyncing}
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: 'white' }}
                  >
                    <span className="qa-icon">{isSyncing ? '🔄' : '📥'}</span>
                    <span>{isSyncing ? 'Fetching...' : 'Fetch from Cloud'}</span>
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
                          <td className={item.runningTotal < 0 ? 'negative' : ''}>
                            {formatPKR(item.runningTotal)}
                          </td>
                          <td>
                            {item.imageBase64 ? (
                              <button 
                                className="receipt-btn"
                                onClick={() => {
                                  const modal = document.createElement('div');
                                  modal.className = 'image-preview-modal';
                                  modal.innerHTML = `
                                    <div class="modal-content">
                                      <span class="close-btn">✕</span>
                                      <img src="${item.imageBase64}" alt="Receipt" />
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

                  <div className="setting-card">
                    <h4>Data Management</h4>
                    <button 
                      onClick={handleFetchFromSheets} 
                      className="setting-btn fetch" 
                      disabled={isSyncing}
                      style={{ 
                        width: '100%', 
                        background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                        color: 'white'
                      }}
                    >
                      <span className="btn-icon">{isSyncing ? '🔄' : '📥'}</span>
                      <span className="btn-text">{isSyncing ? 'Fetching...' : 'Fetch from Google Sheets'}</span>
                    </button>
                    <div className="setting-help-text">
                      <small>Fetch downloads cloud data to this device</small>
                      <br />
                      <small style={{ color: '#10b981' }}>✅ Images are stored in Base64 format</small>
                      <br />
                      <small style={{ color: '#f59e0b' }}>⚠️ Storage: {systemMetrics.storageUsed} / ~5MB</small>
                    </div>
                    <button 
                      onClick={cleanStorage} 
                      className="setting-btn" 
                      style={{ 
                        width: '100%', 
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: 'white',
                        marginTop: '0.5rem'
                      }}
                    >
                      <span className="btn-icon">🧹</span>
                      <span className="btn-text">Clean Old Data</span>
                    </button>
                  </div>

                  <div className="setting-card">
                    <h4>System Info</h4>
                    <div className="info-list">
                      <div className="info-item">
                        <span>Version:</span>
                        <strong>v3.0.1 Enterprise</strong>
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

  // ==================== REGULAR USER VIEW ====================
  return (
    <div className="app">
      {showPasswordModal && <PasswordModal />}

      <Navbar onPurge={handleClearAll} onLogout={handleLogout} onAttendance={() => setActiveTab(activeTab === 'attendance' ? 'expenses' : 'attendance')} activeTab={activeTab} onHome={() => setActiveTab('expenses')} />
      
      {notification.show && (
        <div className={`notification-v8 ${notification.type}`}>
          <div className="noti-content-v8">
            <span className="noti-icon-v8">
              {notification.type === 'success' ? '✅'
               : notification.type === 'error'   ? '❌'
               : notification.type === 'warning' ? '⚠️'
               : 'ℹ️'}
            </span>
            <p>{notification.message}</p>
          </div>
          <button className="noti-close-v8" onClick={() => setNotification({ ...notification, show: false })}>✕</button>
          <div className="noti-progress-v8"></div>
        </div>
      )}

      <main className="main-content">
        {activeTab === 'attendance' ? (
          <Attendance />
        ) : (
        <div className="dashboard-v11">
          <section className="grid-full-v11 glass-card summary-section-v11">
            <Summary
              totals={displayTotals}
              formatPKR={formatPKR}
              lastUpdated={lastUpdated}
              isFiltered={displayTotals !== totals}
            />
          </section>

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
              formatPKR={formatPKR}
              currentBalance={totals.currentBalance}
            />
          </section>

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
                    <span className="status-badge-v13" style={{ background: '#f59e0b', marginLeft: '8px' }}>
                      Storage: {systemMetrics.storageUsed}
                    </span>
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
                          <strong>Push to Google Sheets</strong>
                          <small>Upload local data to cloud</small>
                        </div>
                      </button>
                      <button 
                        className={`console-btn-v13 fetch-btn-v13 ${isSyncing ? 'active' : ''}`} 
                        onClick={handleFetchFromSheets}
                        disabled={isSyncing}
                      >
                        <span className="btn-icon-v13">{isSyncing ? '🔄' : '📥'}</span>
                        <div className="btn-label-v13">
                          <strong>Fetch from Google Sheets</strong>
                          <small>Download cloud data to this device</small>
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
                  <span className="version-tag-v13">v3.0.1</span>
                </div>
              </div>
            </div>
          </section>
        </div>
        )}
      </main>
    </div>
  );
};

export default App;