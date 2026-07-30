import React, { useState, useEffect, useRef, useMemo } from 'react';
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

  // ============================================================
  // 🔥 GLOBAL MONTH FILTER STATE
  // ============================================================
  
  // Helper to get current month-year string
  const getCurrentMonthYear = () => {
    return new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // 🔥 FIX: SET DEFAULT TO 'All' SO TODAY'S DATE SHOWS BY DEFAULT
  const [globalMonth, setGlobalMonth] = useState('All');

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
    storageUsed: '0 MB',
    lastBackup: '2 hours ago',
    apiCalls: 156,
    syncStatus: 'online'
  });

  // ==================== SUBMISSION LOCK ====================
  const isSubmittingRef = useRef(false);

  // ============================================================
  // GOOGLE SHEETS URL
  // ============================================================
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbylD4b5945pnznJJEHtb0GU9MqxbdtdimPIXs3j_es6x3hdNAc9lvfzO_JoGAOFagcSwQ/exec';

  // ==================== AUTHENTICATION HANDLERS ====================
  const handleLogin = () => {
    const sessionId = Date.now().toString();
    sessionStorage.setItem('sessionId', sessionId);
    localStorage.setItem('currentSessionId', sessionId);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userType', 'user');
    setIsAuthenticated(true);
    setUserType('user');
    showNotification('🌟 Welcome back!', 'success');
  };

  const handleAdminLogin = () => {
    const sessionId = Date.now().toString();
    sessionStorage.setItem('sessionId', sessionId);
    localStorage.setItem('currentSessionId', sessionId);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userType', 'admin');
    setIsAuthenticated(true);
    setUserType('admin');
    showNotification('👑 Admin Access Granted', 'success');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('sessionId');
    localStorage.removeItem('currentSessionId');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userType');
    setIsAuthenticated(false);
    setUserType(null);
    showNotification('👋 Logged out', 'info');
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

  // ==================== DATE HELPER ====================
  const normalizeExpenseDate = (value) => {
    if (!value) return new Date().toISOString().split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString().split('T')[0] : parsed.toISOString().split('T')[0];
  };

  // ==================== STORAGE MANAGEMENT ====================
  const getStorageSize = () => {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length * 2;
      }
    }
    return (total / 1024 / 1024).toFixed(2);
  };

  // ==================== SAVE IMAGE TO LOCAL STORAGE ====================
  const saveImageToLocal = (file) => {
    return new Promise((resolve, reject) => {
      if (file.size > 10 * 1024 * 1024) {
        reject(new Error('Image too large! Please use image under 10MB.'));
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

          const maxWidth = 800;
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);

          const filename = `receipt_${Date.now()}.jpg`;
          const path = `/images/${filename}`;

          const savedImages = JSON.parse(localStorage.getItem('savedImages') || '[]');
          savedImages.push({
            filename: filename,
            path: path,
            base64: compressedBase64,
            timestamp: Date.now()
          });
          localStorage.setItem('savedImages', JSON.stringify(savedImages));

          console.log('📸 Image saved locally:', path);
          console.log('📸 Size:', (compressedBase64.length / 1024).toFixed(2), 'KB');

          resolve({
            path: path,
            filename: filename,
            base64: compressedBase64
          });
        };
        img.onerror = () => reject(new Error('Failed to load image'));
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
    });
  };

  // ==================== GET IMAGE FROM LOCAL STORAGE ====================
  const getImageFromLocal = (path) => {
    try {
      const savedImages = JSON.parse(localStorage.getItem('savedImages') || '[]');
      const image = savedImages.find(img => img.path === path);
      return image ? image.base64 : null;
    } catch (e) {
      return null;
    }
  };

  // ==================== SAFE LOCALSTORAGE SET ====================
  const safeSetItem = (key, value) => {
    try {
      localStorage.setItem(key, value);
      updateStorageMetrics();
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        emergencyCleanup();
        try {
          localStorage.setItem(key, value);
          updateStorageMetrics();
          return true;
        } catch (e) {
          showNotification('❌ Storage full!', 'error');
          return false;
        }
      }
      return false;
    }
  };

  // ==================== EMERGENCY CLEANUP ====================
  const emergencyCleanup = () => {
    try {
      const expensesData = JSON.parse(localStorage.getItem('expenses') || '[]');
      const fundHistoryData = JSON.parse(localStorage.getItem('fundHistory') || '[]');

      const cleanedExpenses = expensesData.map(item => {
        const { imageBase64, imageUrl, ...rest } = item;
        return rest;
      });

      const cleanedFundHistory = fundHistoryData.map(item => {
        const { imageBase64, imageUrl, ...rest } = item;
        return rest;
      });

      localStorage.setItem('expenses', JSON.stringify(cleanedExpenses));
      localStorage.setItem('fundHistory', JSON.stringify(cleanedFundHistory));

      setExpenses(cleanedExpenses);
      setFundHistory(cleanedFundHistory);

      updateStorageMetrics();
    } catch (e) {
      console.error('Emergency cleanup failed:', e);
    }
  };

  // ==================== UPDATE STORAGE METRICS ====================
  const updateStorageMetrics = () => {
    const size = getStorageSize();
    setSystemMetrics(prev => ({ ...prev, storageUsed: `${size} MB` }));
  };

  // ==================== FETCH FROM GOOGLE SHEETS ====================
  const handleFetchFromSheets = async () => {
    if (isSyncing) return;

    const result = await Swal.fire({
      title: '📥 Fetch from Google Sheets?',
      text: 'This will download all data from cloud.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, fetch!',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    setIsSyncing(true);
    showNotification('📥 Fetching data...', 'info');

    try {
      const cleanUrl = GAS_URL.trim();
      const response = await fetch(`${cleanUrl}?type=expenses`);

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const json = await response.json();

      if (!json.success) throw new Error(json.message || 'Failed to fetch');

      const { summary, expenses: sheetExpenses, fundHistory: sheetFundHistory } = json.data;

      console.log('📥 Fetched expenses:', sheetExpenses ? sheetExpenses.length : 0);
      console.log('📥 Fetched fundHistory:', sheetFundHistory ? sheetFundHistory.length : 0);

      if (!sheetExpenses || sheetExpenses.length === 0) {
        setExpenses([]);
        setFundHistory([]);
        setTotalFunds(0);
        safeSetItem('expenses', JSON.stringify([]));
        safeSetItem('fundHistory', JSON.stringify([]));
        safeSetItem('totalFunds', '0');

        await Swal.fire({
          icon: 'info',
          title: '📭 No Cloud Data',
          text: 'Google Sheets is empty.',
          confirmButtonColor: '#3085d6'
        });
        setIsSyncing(false);
        return;
      }

      let processedExpenses = [];
      if (Array.isArray(sheetExpenses) && sheetExpenses.length > 0) {
        processedExpenses = sheetExpenses.map((expense) => ({
          ...expense,
          id: expense.id || Date.now() + Math.random(),
          date: normalizeExpenseDate(expense.date),
          amount: Number(expense.amount) || 0,
          expenseType: expense.expenseType || 'regular',
          imagePath: expense.imagePath || null,
          imageBase64: expense.imageBase64 || null,
          imageUrl: expense.imageUrl || null
        }));
      }

      let processedFundHistory = [];
      if (Array.isArray(sheetFundHistory) && sheetFundHistory.length > 0) {
        processedFundHistory = sheetFundHistory.map((item) => ({
          ...item,
          id: item.id || Date.now() + Math.random(),
          amount: Number(item.amount) || 0,
          date: item.date || new Date().toISOString(),
          runningTotal: Number(item.runningTotal) || 0,
          type: item.type || 'credit',
          imagePath: item.imagePath || null,
          imageBase64: item.imageBase64 || null,
          imageUrl: item.imageUrl || null
        }));
      }

      safeSetItem('expenses', JSON.stringify(processedExpenses));
      setExpenses(processedExpenses);

      safeSetItem('fundHistory', JSON.stringify(processedFundHistory));
      setFundHistory(processedFundHistory);

      let totalFundsFromSheet = summary ? Number(summary.totalFundsAdded) || 0 :
        processedFundHistory.filter(item => item.type === 'credit').reduce((sum, item) => sum + item.amount, 0);

      setTotalFunds(totalFundsFromSheet);
      safeSetItem('totalFunds', String(totalFundsFromSheet));

      setLastUpdated(new Date().toLocaleTimeString());
      updateStorageMetrics();

      const imageCount2 = processedExpenses.filter(e => e.imagePath || e.imageBase64 || e.imageUrl).length;
      await Swal.fire({
        icon: 'success',
        title: '✅ Fetch Successful!',
        text: `Restored ${processedExpenses.length} expenses with ${imageCount2} images!`,
        confirmButtonColor: '#3085d6'
      });

      showNotification(`✅ Data restored from cloud successfully!`, 'success');

    } catch (error) {
      console.error('Fetch error:', error);
      await Swal.fire({
        icon: 'error',
        title: '❌ Fetch Failed',
        text: error.message || 'Failed to fetch data.',
        confirmButtonColor: '#d33'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // ============================================================
  // PUSH TO GOOGLE SHEETS
  // ============================================================
  const handleSyncToSheets = async () => {
    if (isSyncing) return;

    const imageCountInState = expenses.filter(e => e.imagePath || e.imageBase64).length;
    console.log('📸 Images to push:', imageCountInState);
    console.log('📊 Total expenses to push:', expenses.length);

    const result = await Swal.fire({
      title: '☁️ Push to Google Sheets?',
      html: `This will <b>replace</b> all data in Google Sheets.<br>
             <br>
             📊 ${expenses.length} expenses<br>
             📸 ${imageCountInState} images (paths in sheet)<br>
             📝 ${fundHistory.length} transactions<br>
             <br>
             <span style="color:#ef4444;">⚠️ Existing cloud data will be replaced!</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, replace!',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    setIsSyncing(true);
    showNotification('🔄 Replacing Google Sheets data...', 'info');

    try {
      const totals = calculateTotals();

      const expensesWithPaths = expenses.map(e => ({
        id: e.id || Date.now(),
        date: e.date || new Date().toISOString().split('T')[0],
        description: e.description || '',
        category: e.category || 'Other',
        amount: Number(e.amount) || 0,
        expenseType: e.expenseType || 'regular',
        imagePath: e.imagePath || '',
        imageBase64: e.imageBase64 || null,
        notes: e.notes || ''
      }));

      const fundHistoryWithPaths = fundHistory.map(h => ({
        id: h.id || Date.now(),
        date: h.date || new Date().toISOString(),
        description: h.description || '',
        amount: Number(h.amount) || 0,
        type: h.type || 'credit',
        runningTotal: Number(h.runningTotal) || 0,
        category: h.category || '',
        expenseType: h.expenseType || 'regular',
        imagePath: h.imagePath || '',
        imageBase64: h.imageBase64 || null
      }));

      const dataToSync = {
        action: 'replace',
        totals: {
          totalFundsAdded: totals.totalFundsAdded || 0,
          totalExpenses: totals.totalExpenses || 0,
          currentBalance: totals.currentBalance || 0,
          usedPercentage: totals.usedPercentage || 0,
          remainingPercentage: totals.remainingPercentage || 0,
          regularExpensesTotal: totals.regularExpensesTotal || 0,
          oneTimeExpensesTotal: totals.oneTimeExpensesTotal || 0,
          billsTotal: totals.billsTotal || 0
        },
        expenses: expensesWithPaths,
        fundHistory: fundHistoryWithPaths,
        systemMetrics: systemMetrics,
        lastUpdated: new Date().toISOString()
      };

      const cleanUrl = GAS_URL.trim();
      console.log('📤 Sending to URL:', cleanUrl);

      await fetch(cleanUrl, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSync),
      });

      await Swal.fire({
        icon: 'success',
        title: '✅ Push Successful!',
        text: `Replaced Google Sheets with ${expenses.length} expenses!`,
        confirmButtonColor: '#3085d6'
      });

      setLastUpdated(new Date().toLocaleTimeString());
      showNotification(`✅ Data replaced successfully!`, 'success');

    } catch (error) {
      console.error('❌ Push error:', error);
      await Swal.fire({
        icon: 'error',
        title: '❌ Push Failed',
        text: error.message || 'Failed to push.',
        confirmButtonColor: '#d33'
      });
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
          updateStorageMetrics();
        } catch (e) {
          console.error('Auto-refresh error:', e);
        }
      }, refreshInterval * 1000);
    }
    return () => clearInterval(interval);
  }, [userType, autoRefresh, refreshInterval]);

  // ==================== LOCAL STORAGE SAVE ====================
  useEffect(() => {
    if (isAuthenticated) {
      safeSetItem('totalFunds', totalFunds.toString());
      updateStorageMetrics();
    }
  }, [totalFunds, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      safeSetItem('fundHistory', JSON.stringify(fundHistory));
      updateStorageMetrics();
    }
  }, [fundHistory, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      safeSetItem('expenses', JSON.stringify(expenses));
      updateStorageMetrics();
    }
  }, [expenses, isAuthenticated]);

  // ==================== INITIAL STORAGE CHECK ====================
  useEffect(() => {
    if (isAuthenticated) {
      updateStorageMetrics();
      const imageCount = expenses.filter(e => e.imagePath || e.imageBase64).length;
      console.log('📸 Images in localStorage on load:', imageCount);
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

  // ============================================================
  // 🔥 RE-ENGINEERED: CALCULATION LOGIC
  // ============================================================

  const getMonthYear = (dateStr) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Invalid Date';
      return d.toLocaleString('default', { month: 'long', year: 'numeric' });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // 1. RAW TOTALS (Used for PUSH and PURGE - Unfiltered)
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

    expenses.forEach(expense => {
      if (expense.date) {
        const date = new Date(expense.date);
        const month = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        monthlyExpenses[month] = (monthlyExpenses[month] || 0) + (expense.amount || 0);
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
      categoryTotals,
      usedPercentage: Math.min(usedPercentage, 100).toFixed(1),
      remainingPercentage: Math.max(remainingPercentage, 0).toFixed(1),
      totalTransactions: fundHistory.length,
      regularExpensesTotal,
      oneTimeExpensesTotal,
      billsTotal
    };
  };

  const rawTotals = calculateTotals();

  // 🔥 2. FILTERED DATA COMPUTATIONS
  const filteredExpenses = useMemo(() => {
    if (globalMonth === 'All') {
      return expenses;
    }
    return expenses.filter(expense => {
      if (!expense.date) return false;
      return getMonthYear(expense.date) === globalMonth;
    });
  }, [expenses, globalMonth]);

  const filteredFundHistory = useMemo(() => {
    if (globalMonth === 'All') {
      return fundHistory;
    }
    return fundHistory.filter(item => {
      if (!item.date) return false;
      return getMonthYear(item.date) === globalMonth;
    });
  }, [fundHistory, globalMonth]);

  const filteredTotals = useMemo(() => {
    const totalFundsAdded = filteredFundHistory
      .filter(item => item.type === 'credit')
      .reduce((sum, item) => sum + item.amount, 0);

    const totalExpenses = filteredExpenses
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);

    const currentBalance = totalFundsAdded - totalExpenses;

    const regularExpensesTotal = filteredExpenses
      .filter(expense => expense.expenseType === 'regular')
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);

    const oneTimeExpensesTotal = filteredExpenses
      .filter(expense => expense.expenseType === 'one-time')
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);

    const billsTotal = filteredExpenses
      .filter(expense => expense.expenseType === 'bill')
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);

    const monthlyExpenses = {};
    const categoryTotals = {};

    filteredExpenses.forEach(expense => {
      if (expense.date) {
        const date = new Date(expense.date);
        const month = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        monthlyExpenses[month] = (monthlyExpenses[month] || 0) + (expense.amount || 0);
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
      categoryTotals,
      usedPercentage: Math.min(usedPercentage, 100).toFixed(1),
      remainingPercentage: Math.max(remainingPercentage, 0).toFixed(1),
      totalTransactions: filteredFundHistory.length,
      regularExpensesTotal,
      oneTimeExpensesTotal,
      billsTotal
    };
  }, [filteredExpenses, filteredFundHistory]);

  // ==================== CORE FUNCTIONS ====================
  const handleClearAll = () => {
    setShowPasswordModal(true);
    setPasswordInput('');
    setPasswordError('');
  };

  // ==================== PURGE (ONLY UI) ====================
  const verifyAndPurge = async () => {
    if (passwordInput === 'umar123') {
      try {
        const result = await Swal.fire({
          title: '🧹 Purge UI Data?',
          html: `This will clear <b>ONLY</b> the UI/Local Storage.<br>
                 <br>
                 ✅ Google Sheets data will <b>remain safe</b>.<br>
                 ✅ Images will <b>remain safe</b>.`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          cancelButtonColor: '#3085d6',
          confirmButtonText: 'Yes, clear UI!',
          cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) {
          setShowPasswordModal(false);
          setPasswordInput('');
          return;
        }

        setTotalFunds(0);
        setFundHistory([]);
        setExpenses([]);

        localStorage.removeItem('totalFunds');
        localStorage.removeItem('fundHistory');
        localStorage.removeItem('expenses');

        setShowPasswordModal(false);
        setPasswordInput('');
        updateStorageMetrics();

        await Swal.fire({
          icon: 'success',
          title: '✅ UI Data Cleared!',
          text: 'Local storage has been cleared. Your data is still safe in Google Sheets.',
          confirmButtonColor: '#3085d6'
        });

        showNotification('🧹 UI data cleared! Sheet data is safe.', 'success');

      } catch (error) {
        console.error('Purge error:', error);
        await Swal.fire({
          icon: 'error',
          title: '❌ Error',
          text: 'Failed to clear data. Please try again.',
          confirmButtonColor: '#d33'
        });
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

  // ============================================================
  // 🔥 UPDATED: ADD FUNDS (EXACT MONTH FIX)
  // ============================================================
  const handleAddFunds = (fundData) => {
    const amount = typeof fundData === 'object' ? parseFloat(fundData.amount) : parseFloat(fundData);
    let description = typeof fundData === 'object' ? fundData.description : 'Funds Added';

    if (fundData.notes) {
      description = `${description} 📝 ${fundData.notes}`;
    }

    if (amount > 0) {
      let transactionDate = new Date().toISOString(); 
      
      if (fundData.date) {
        transactionDate = new Date(fundData.date).toISOString();
      } else if (globalMonth !== 'All') {
        transactionDate = new Date(globalMonth).toISOString();
      }

      const newFundEntry = {
        id: Date.now(),
        amount: amount,
        description: description,
        date: transactionDate,
        runningTotal: rawTotals.totalFundsAdded + amount,
        type: 'credit',
        imagePath: null,
        imageBase64: null
      };

      setFundHistory(prev => [newFundEntry, ...prev]);
      setTotalFunds(prev => prev + amount);
      showNotification(`💰 Funds added: ${formatPKR(amount)}`, 'success');
    }
  };

  // ============================================================
  // 🔥 UPDATED: ADD EXPENSE (AUDIT TRAIL DATE FIX)
  // ============================================================
  const handleAddExpense = async (expenseData) => {
    if (isSubmittingRef.current) {
      console.warn('⚠️ Submission already in progress');
      return false;
    }

    console.log('🔍 ADDING NEW EXPENSE');

    if (!expenseData || !expenseData.amount) {
      showNotification('❌ Invalid expense data!', 'error');
      return false;
    }

    isSubmittingRef.current = true;

    try {
      const amount = parseFloat(expenseData.amount);
      const expenseType = expenseData.expenseType || 'regular';

      let imagePath = null;
      let imageBase64 = null;

      if (expenseData.imageFile) {
        try {
          console.log('📸 Processing image:', expenseData.imageFile.name);
          showNotification('📸 Saving image...', 'info');

          const result = await saveImageToLocal(expenseData.imageFile);
          imagePath = result.path;
          imageBase64 = result.base64;
          console.log('✅ Image saved locally:', imagePath);
          showNotification('✅ Image saved!', 'success');
        } catch (error) {
          console.error('❌ Image save failed:', error);
          showNotification('⚠️ Image save failed', 'warning');
        }
      }

      let transactionDate = new Date().toISOString().split('T')[0]; 
      
      if (expenseData.date) {
        transactionDate = new Date(expenseData.date).toISOString().split('T')[0];
      } else if (globalMonth !== 'All') {
        transactionDate = new Date(globalMonth).toISOString().split('T')[0];
      }

      const newExpense = {
        id: Date.now(),
        description: expenseData.description || 'No description',
        amount: amount,
        date: transactionDate,
        category: expenseData.category || 'Other',
        expenseType: expenseType,
        timestamp: Date.now(),
        imagePath: imagePath,
        imageBase64: imageBase64,
        notes: expenseData.notes || ''
      };

      console.log('📝 Created expense:', {
        id: newExpense.id,
        description: newExpense.description,
        imagePath: imagePath
      });

      setExpenses(prev => {
        const exists = prev.some(e => e.id === newExpense.id);
        if (exists) {
          console.warn('⚠️ Expense already exists');
          return prev;
        }
        return [newExpense, ...prev];
      });

      const newRunningTotal = rawTotals.currentBalance - amount;
      
      // 🔥 CRITICAL FIX: Use same transactionDate for Audit Trail
      const deductionEntry = {
        id: Date.now() + 1,
        amount: -amount,
        description: `${expenseType.toUpperCase()}: ${expenseData.description || 'No description'}`,
        date: transactionDate, // ✅ Used the same date as the expense
        runningTotal: newRunningTotal,
        type: 'debit',
        category: expenseData.category || 'Other',
        expenseType: expenseType,
        imagePath: imagePath,
        imageBase64: imageBase64
      };

      setFundHistory(prev => {
        const exists = prev.some(e => e.id === deductionEntry.id);
        if (exists) {
          console.warn('⚠️ Transaction already exists');
          return prev;
        }
        return [deductionEntry, ...prev];
      });

      const typeIcons = {
        'regular': '🔄',
        'one-time': '⚡',
        'bill': '📄'
      };

      const hasImage = imagePath ? ' 📸' : '';
      showNotification(`${typeIcons[expenseType]} ${expenseType} expense: ${formatPKR(amount)}${hasImage}`, 'success');

      console.log('✅ Expense added successfully!');
      return true;

    } catch (error) {
      console.error('❌ Error:', error);
      showNotification('❌ Error adding expense!', 'error');
      return false;
    } finally {
      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 300);
    }
  };

  const handleDeleteExpense = (id) => {
    if (window.confirm('🗑️ Delete this expense?')) {
      setExpenses(prev => prev.filter(e => e.id !== id));
      setFundHistory(prev => prev.filter(h => h.id !== id + 1));
      showNotification('✅ Expense deleted!', 'info');
    }
  };

  const handleDeleteTransaction = (id) => {
    if (window.confirm('🗑️ Delete this transaction?')) {
      const transactionToDelete = fundHistory.find(h => h.id === id);
      if (!transactionToDelete) return;

      if (transactionToDelete.type === 'credit') {
        setTotalFunds(prev => prev - transactionToDelete.amount);
        setFundHistory(prev => prev.filter(h => h.id !== id));
        showNotification('✅ Transaction deleted!', 'info');
      } else {
        const expenseId = id - 1;
        setExpenses(prev => prev.filter(e => e.id !== expenseId));
        setFundHistory(prev => prev.filter(h => h.id !== id));
        showNotification('✅ Transaction deleted!', 'info');
      }
    }
  };

  const handleEditExpense = (id, updatedExpense) => {
    setExpenses(prev => prev.map(expense =>
      expense.id === id ? { ...expense, ...updatedExpense } : expense
    ));
    showNotification('✏️ Expense updated!', 'success');
  };

  // ==================== FILTER FUNCTIONS ====================
  const getFilteredExpenses = () => {
    if (!Array.isArray(filteredExpenses)) return [];

    let filtered = [...filteredExpenses];

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

  const localFilteredExpenses = getFilteredExpenses() || [];

  const calculateFilteredTotals = () => {
    const totalExpenses = localFilteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const categoryTotals = {};
    localFilteredExpenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + (e.amount || 0);
    });
    const usedPercentage = filteredTotals.totalFundsAdded > 0 ? (totalExpenses / filteredTotals.totalFundsAdded) * 100 : 0;

    return {
      ...filteredTotals,
      totalExpenses,
      categoryTotals,
      usedPercentage: Math.min(usedPercentage, 100).toFixed(1),
      remainingPercentage: (100 - Math.min(usedPercentage, 100)).toFixed(1)
    };
  };

  const displayTotals = (searchTerm || filterCategory !== 'All' || filterMonth !== 'All' || filterStartDate || filterEndDate)
    ? calculateFilteredTotals()
    : filteredTotals;

  // ==================== RENDER LOGIN ====================
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} onAdminLogin={handleAdminLogin} />;
  }

  // ==================== PASSWORD MODAL ====================
  const PasswordModal = () => (
    <div className="password-modal-overlay">
      <div className="password-modal">
        <div className="password-modal-header">
          <span className="modal-icon">🔒</span>
          <h3>Authorization Required</h3>
          <button className="modal-close" onClick={cancelPurge}>✕</button>
        </div>
        <div className="password-modal-body">
          <p>Enter admin password to clear UI data:</p>
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
              {/* 🔥 FIX 2: Admin Image fetched directly from Google Sheets via expenses[0].imageUrl */}
              {expenses.length > 0 && expenses[0].imageUrl ? (
                <img 
                  src={expenses[0].imageUrl} 
                  alt="Admin" 
                  className="profile-avatar-img" 
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%', 
                    objectFit: 'cover',
                    border: '2px solid white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'inline';
                  }}
                />
              ) : null}
              
              {/* 🔥 Fallback if no image URL exists */}
              <span className="profile-avatar" style={{ display: expenses.length > 0 && expenses[0].imageUrl ? 'none' : 'inline' }}>
                👑
              </span>
              <span className="profile-name">Admin</span>
            </div>
            <button onClick={handleLogout} className="logout-btn">
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </header>

        <nav className="admin-nav-modern">
          <button className={`nav-btn ${adminView === 'dashboard' ? 'active' : ''}`} onClick={() => setAdminView('dashboard')}>
            <span className="nav-icon">📊</span> Dashboard
          </button>
          <button className={`nav-btn ${adminView === 'analytics' ? 'active' : ''}`} onClick={() => setAdminView('analytics')}>
            <span className="nav-icon">📈</span> Analytics
          </button>
          <button className={`nav-btn ${adminView === 'reports' ? 'active' : ''}`} onClick={() => setAdminView('reports')}>
            <span className="nav-icon">📋</span> Reports
          </button>
          <button className={`nav-btn ${adminView === 'audit' ? 'active' : ''}`} onClick={() => setAdminView('audit')}>
            <span className="nav-icon">🔍</span> Audit
          </button>
          <button className={`nav-btn ${adminView === 'settings' ? 'active' : ''}`} onClick={() => setAdminView('settings')}>
            <span className="nav-icon">⚙️</span> Settings
          </button>
        </nav>

        <main className="admin-content-area">
          <div className="kpi-cards-grid">
            <div className="kpi-card blue">
              <div className="card-icon">💰</div>
              <div className="card-content">
                <span className="card-label">Total Funds</span>
                <span className="card-value">{formatPKR(filteredTotals.totalFundsAdded)}</span>
              </div>
            </div>
            <div className="kpi-card purple">
              <div className="card-icon">💸</div>
              <div className="card-content">
                <span className="card-label">Total Expenses</span>
                <span className="card-value">{formatPKR(filteredTotals.totalExpenses)}</span>
              </div>
            </div>
            <div className="kpi-card green">
              <div className="card-icon">⚖️</div>
              <div className="card-content">
                <span className="card-label">Balance</span>
                <span className={`card-value ${filteredTotals.currentBalance < 0 ? 'negative' : ''}`}>
                  {formatPKR(filteredTotals.currentBalance)}
                </span>
              </div>
            </div>
            <div className="kpi-card orange">
              <div className="card-icon">📊</div>
              <div className="card-content">
                <span className="card-label">Usage</span>
                <span className="card-value">{filteredTotals.usedPercentage}%</span>
                <div className="progress-mini">
                  <div className="progress-fill" style={{ width: `${Math.min(filteredTotals.usedPercentage, 100)}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="dynamic-panel">
            {adminView === 'dashboard' && (
              <div className="dashboard-panel">
                <div className="quick-actions-row">
                  <button className="quick-action" onClick={() => setAdminView('reports')}>
                    <span className="qa-icon">📊</span> Generate Report
                  </button>
                  <button className="quick-action" onClick={() => setAdminView('audit')}>
                    <span className="qa-icon">🔍</span> View Audit
                  </button>
                  <button className="quick-action" onClick={() => setAdminView('analytics')}>
                    <span className="qa-icon">📈</span> Analytics
                  </button>
                  <button className="quick-action" onClick={handleFetchFromSheets} disabled={isSyncing} style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: 'white' }}>
                    <span className="qa-icon">{isSyncing ? '🔄' : '📥'}</span>
                    <span>{isSyncing ? 'Fetching...' : 'Fetch from Cloud'}</span>
                  </button>
                </div>

                <div className="category-breakdown">
                  <h3>Category Distribution</h3>
                  <div className="category-bars">
                    {Object.entries(filteredTotals.categoryTotals).map(([category, amount]) => (
                      <div key={category} className="category-bar-item">
                        <span className="cat-name">{category}</span>
                        <div className="bar-container">
                          <div className="bar-fill" style={{ width: `${(amount / filteredTotals.totalExpenses) * 100}%` }}></div>
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
                <MonthlyOverview monthlyExpenses={filteredTotals.monthlyExpenses} categoryTotals={filteredTotals.categoryTotals} formatPKR={formatPKR} />
              </div>
            )}

            {adminView === 'reports' && (
              <div className="reports-panel">
                <PrintReport 
                  expenses={localFilteredExpenses} 
                  fundHistory={filteredFundHistory} 
                  totals={filteredTotals} 
                  formatPKR={formatPKR} 
                  lastUpdated={lastUpdated} 
                  filteredExpenses={localFilteredExpenses} 
                />
              </div>
            )}

            {adminView === 'audit' && (
              <div className="audit-panel">
                <h3>Audit Trail</h3>
                <div className="audit-table-wrapper">
                  <table className="audit-table">
                    <thead>
                      <tr>
                        <th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Balance</th><th>Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFundHistory.map(item => (
                        <tr key={item.id}>
                          <td>{new Date(item.date).toLocaleString()}</td>
                          <td><span className={`badge ${item.type}`}>{item.type === 'credit' ? 'CREDIT' : 'DEBIT'}</span></td>
                          <td>{item.description}</td>
                          <td className={item.type}>{item.type === 'credit' ? '+' : '-'}{formatPKR(Math.abs(item.amount))}</td>
                          <td className={item.runningTotal < 0 ? 'negative' : ''}>{formatPKR(item.runningTotal)}</td>
                          <td>
                            {item.imagePath || item.imageBase64 ? (
                              <button className="receipt-btn" onClick={() => {
                                let imageSrc = item.imageBase64;
                                if (!imageSrc && item.imagePath) {
                                  imageSrc = getImageFromLocal(item.imagePath);
                                }
                                if (imageSrc) {
                                  const modal = document.createElement('div');
                                  modal.className = 'image-preview-modal';
                                  modal.innerHTML = `
                                    <div class="modal-content">
                                      <span class="close-btn">✕</span>
                                      <img src="${imageSrc}" alt="Receipt" style="max-width:100%;max-height:80vh;border-radius:8px;" />
                                    </div>
                                  `;
                                  document.body.appendChild(modal);
                                  modal.querySelector('.close-btn').onclick = () => modal.remove();
                                  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
                                }
                              }}>
                                📸 View
                              </button>
                            ) : <span className="no-receipt">-</span>}
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
                        <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
                        <span className="toggle-slider"></span>
                      </label>
                      <span className="setting-status">{autoRefresh ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <select value={refreshInterval} onChange={(e) => setRefreshInterval(parseInt(e.target.value))} className="refresh-select" disabled={!autoRefresh}>
                      <option value="10">10 sec</option>
                      <option value="30">30 sec</option>
                      <option value="60">1 min</option>
                    </select>
                  </div>

                  <div className="setting-card">
                    <h4>Data Management</h4>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <small>Storage Used: <strong>{systemMetrics.storageUsed}</strong></small>
                      <br />
                      <small>Total Expenses: <strong>{expenses.length}</strong></small>
                      <br />
                      <small>Total Transactions: <strong>{fundHistory.length}</strong></small>
                      <br />
                      <small>Images: <strong>{expenses.filter(e => e.imagePath || e.imageBase64).length}</strong></small>
                    </div>
                    <button onClick={() => { emergencyCleanup(); showNotification('🧹 Storage cleaned!', 'success'); }} className="setting-btn" style={{ width: '100%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white' }}>
                      <span className="btn-icon">🧹</span>
                      <span className="btn-text">Clean Old Data</span>
                    </button>
                    <button onClick={handleClearAll} className="setting-btn purge" style={{ width: '100%', marginTop: '0.5rem' }}>
                      <span className="btn-icon">💣</span>
                      <span className="btn-text">Purge UI Data (Sheet Safe)</span>
                    </button>
                  </div>

                  <div className="setting-card">
                    <h4>System Info</h4>
                    <div className="info-list">
                      <div className="info-item"><span>Version:</span><strong>v10.0.0</strong></div>
                      <div className="info-item"><span>Storage:</span><strong>{systemMetrics.storageUsed}</strong></div>
                      <div className="info-item"><span>Status:</span><strong className="status-online">● Online</strong></div>
                      <div className="info-item"><span>Images:</span><strong>{expenses.filter(e => e.imagePath || e.imageBase64).length}</strong></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {notification.show && (
          <div className={`admin-notification ${notification.type}`}>
            <span className="noti-icon">{notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'}</span>
            <p>{notification.message}</p>
            <button className="noti-close" onClick={() => setNotification({ ...notification, show: false })}>✕</button>
          </div>
        )}
      </div>
    );
  }

  // ==================== USER VIEW ====================
  return (
    <div className="app">
      {showPasswordModal && <PasswordModal />}
      <Navbar onPurge={handleClearAll} onLogout={handleLogout} onAttendance={() => setActiveTab(activeTab === 'attendance' ? 'expenses' : 'attendance')} activeTab={activeTab} onHome={() => setActiveTab('expenses')} />

      {notification.show && (
        <div className={`notification-v8 ${notification.type}`}>
          <div className="noti-content-v8">
            <span className="noti-icon-v8">{notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : notification.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <p>{notification.message}</p>
          </div>
          <button className="noti-close-v8" onClick={() => setNotification({ ...notification, show: false })}>✕</button>
        </div>
      )}

      <main className="main-content">
        {activeTab === 'attendance' ? <Attendance /> : (
          <div className="dashboard-v11">
            
            {/* ============================================================ */}
            {/* 🔥 GLOBAL MONTH FILTER UI (Defaults to Current Month) */}
            {/* ============================================================ */}
            <section className="grid-full-v11 glass-card summary-section-v11" style={{ padding: '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '500', color: '#64748b' }}>
                <span>📅 Filter by Month:</span>
                <select 
                  value={globalMonth} 
                  onChange={(e) => setGlobalMonth(e.target.value)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    color: '#1e293b'
                  }}
                >
                  <option value="All">📊 All Months</option>
                  {Array.from(new Set([...expenses.map(e => e.date ? getMonthYear(e.date) : ''), ...fundHistory.map(f => f.date ? getMonthYear(f.date) : '')]))
                    .filter(m => m !== 'Invalid Date' && m !== '')
                    .sort((a, b) => new Date(a) - new Date(b))
                    .map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                </select>
              </div>
              <div style={{ fontSize: '14px', color: '#94a3b8' }}>
                {globalMonth === 'All' ? 'Showing all records' : `Showing records for ${globalMonth}`}
              </div>
            </section>
            {/* ============================================================ */}

            <section className="grid-full-v11 glass-card summary-section-v11">
              <Summary totals={displayTotals} formatPKR={formatPKR} lastUpdated={lastUpdated} isFiltered={displayTotals !== filteredTotals || globalMonth !== 'All'} />
            </section>

            {/* 🔥 ExpenseForm with defaultDate passed */}
            <section className="grid-half-v11 glass-card">
              <div className="section-header-v10"><h3><span>💰</span> Add Funds</h3></div>
              <ExpenseForm 
                type="funds" 
                onSubmit={handleAddFunds} 
                formatPKR={formatPKR} 
                currentBalance={filteredTotals.currentBalance}
                defaultDate={globalMonth !== 'All' ? new Date(globalMonth).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} 
              />
            </section>

            <section className="grid-half-v11 glass-card">
              <div className="section-header-v10"><h3><span>💸</span> Add Expense</h3></div>
              <ExpenseForm 
                type="expense" 
                onSubmit={handleAddExpense} 
                formatPKR={formatPKR} 
                currentBalance={filteredTotals.currentBalance}
                defaultDate={globalMonth !== 'All' ? new Date(globalMonth).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} 
              />
            </section>

            <section className="grid-full-v11 glass-card history-section-v11">
              <div className="section-header-v10">
                <div className="title-group-v11"><h3><span>📜</span> Expenses</h3><span className="count-badge-v11">{localFilteredExpenses.length}</span></div>
                <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
              </div>
              <Filters filterCategory={filterCategory} setFilterCategory={setFilterCategory} filterMonth={filterMonth} setFilterMonth={setFilterMonth} filterStartDate={filterStartDate} setFilterStartDate={setFilterStartDate} filterEndDate={filterEndDate} setFilterEndDate={setFilterEndDate} sortBy={sortBy} setSortBy={setSortBy} expenses={filteredExpenses} />
              <div className="scrollable-data-v11">
                <ExpenseList expenses={localFilteredExpenses} onDelete={handleDeleteExpense} onEdit={handleEditExpense} formatPKR={formatPKR} />
              </div>
            </section>

            <section className="grid-sidebar-v11 glass-card">
              <div className="section-header-v10"><h3><span>📊</span> Analytics</h3></div>
              <MonthlyOverview monthlyExpenses={filteredTotals.monthlyExpenses} categoryTotals={filteredTotals.categoryTotals} formatPKR={formatPKR} />
            </section>

            <section className="grid-full-v11">
              <div className="command-console-v13 glass-card dark-theme-v13">
                <div className="console-header-v13">
                  <div className="console-title-group-v13">
                    <div className="pulse-icon-v13"></div>
                    <div className="console-text-v13">
                      <h3>Command Console</h3>
                      <span className="status-badge-v13">System Live</span>
                      <span className="status-badge-v13" style={{ background: '#f59e0b', marginLeft: '8px' }}>📸 {expenses.filter(e => e.imagePath || e.imageBase64).length} images</span>
                      <span className="status-badge-v13" style={{ background: '#10b981', marginLeft: '8px' }}>💾 {systemMetrics.storageUsed}</span>
                    </div>
                  </div>
                  <div className="console-stats-v13">
                    <div className="stat-pill-v13"><small>Last Sync</small><span>{lastUpdated || 'Never'}</span></div>
                  </div>
                </div>

                <div className="console-layout-v13">
                  <div className="console-controls-v13">
                    <div className="control-card-v13">
                      <h4>System Operations</h4>
                      <div className="action-stack-v13">
                        <button className={`console-btn-v13 sync-btn-v13 ${isSyncing ? 'active' : ''}`} onClick={handleSyncToSheets} disabled={isSyncing}>
                          <span className="btn-icon-v13">{isSyncing ? '🔄' : '☁️'}</span>
                          <div className="btn-label-v13"><strong>Push to Cloud</strong><small>Replace data</small></div>
                        </button>
                        <button className={`console-btn-v13 fetch-btn-v13 ${isSyncing ? 'active' : ''}`} onClick={handleFetchFromSheets} disabled={isSyncing}>
                          <span className="btn-icon-v13">{isSyncing ? '🔄' : '📥'}</span>
                          <div className="btn-label-v13"><strong>Fetch from Cloud</strong><small>Restore data</small></div>
                        </button>
                      </div>
                    </div>
                    <div className="control-card-v13">
                      <h4>Report Generation</h4>
                      <PrintReport 
                        expenses={localFilteredExpenses} 
                        fundHistory={filteredFundHistory} 
                        totals={filteredTotals} 
                        formatPKR={formatPKR} 
                        lastUpdated={lastUpdated} 
                        filteredExpenses={localFilteredExpenses} 
                      />
                    </div>
                  </div>

                  <div className="console-timeline-v13">
                    <div className="timeline-header-v13"><h4>Audit Timeline</h4></div>
                    <div className="scrollable-audit-v13">
                      <FundHistory history={filteredFundHistory} formatPKR={formatPKR} onDelete={handleDeleteTransaction} />
                    </div>
                  </div>
                </div>

                <div className="console-footer-v13">
                  <div className="data-flow-track-v13"><div className={`data-flow-particle-v13 ${isSyncing ? 'active' : ''}`}></div></div>
                  <div className="footer-meta-v13"><span>v10.0.0</span></div>
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