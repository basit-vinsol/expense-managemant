import React, { useState } from 'react';
import './FundHistory.css';

const FundHistory = ({ history, formatPKR, onDelete }) => {
  const [filter, setFilter] = useState('all');

  const filteredHistory = history.filter(item => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

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
        {filteredHistory.length === 0 ? (
          <div className="empty-v13">
            <p>No transaction records found</p>
          </div>
        ) : (
          filteredHistory.map((item, index) => (
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
                    {item.type === 'credit' ? '+' : '--'}{formatPKR(item.amount)}
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