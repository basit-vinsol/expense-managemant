import React, { useState, useMemo } from 'react';
import './FundHistory.css';

const FundHistory = ({ history, formatPKR, onDelete }) => {
  const [filter, setFilter] = useState('all');

  // 🔥 STEP 1: Pehle Filtered History ko calculate karein
  const filteredHistory = useMemo(() => {
    if (filter === 'all') return history;
    return history.filter(item => item.type === filter);
  }, [history, filter]);

  // 🔥 STEP 2: Filtered History ke hisaab se Running Balance calculate karein
  const historyWithBalance = useMemo(() => {
    let runningTotal = 0;
    return filteredHistory.map((item) => {
      // Agar credit hai toh add, debit hai toh subtract
      runningTotal += (item.type === 'credit' ? item.amount : -Math.abs(item.amount));
      return {
        ...item,
        runningTotal: runningTotal // ✅ Naya Running Total (Sirf filtered data ka)
      };
    });
  }, [filteredHistory]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PK', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fund-history-v13">
      <div className="history-header-v13">
        <div className="history-tabs-v13">
          <button 
            className={`tab-v13 ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`tab-v13 ${filter === 'credit' ? 'active' : ''}`}
            onClick={() => setFilter('credit')}
          >
            Deposits
          </button>
          <button 
            className={`tab-v13 ${filter === 'debit' ? 'active' : ''}`}
            onClick={() => setFilter('debit')}
          >
            Expenses
          </button>
        </div>
      </div>

      <div className="timeline-container-v13">
        {historyWithBalance.length === 0 ? (
          <div className="empty-v13">
            <p>No transaction records found</p>
          </div>
        ) : (
          historyWithBalance.map((item, index) => (
            <div key={item.id || index} className={`log-entry-v13 ${item.type}`}>
              <div className="log-marker-v13">
                <span className="marker-dot-v13">
                  {item.type === 'credit' ? '➕' : '➖'}
                </span>
              </div>
              <div className="log-body-v13">
                <div className="log-info-v13">
                  <p className="log-desc-v13">{item.description}</p>
                  <span className="log-date-v13">{formatDate(item.date)}</span>
                </div>
                <div className="log-values-v13">
                  <span className={`log-amount-v13 ${item.type}`}>
                    {item.type === 'credit' ? '+' : '-'}{formatPKR(Math.abs(item.amount))}
                  </span>
                  <span className="log-running-v12">
                    Bal: {formatPKR(item.runningTotal)}
                  </span>
                </div>
                <button 
                  className="log-delete-v13" 
                  onClick={() => onDelete(item.id)}
                  title="Remove log entry"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FundHistory;