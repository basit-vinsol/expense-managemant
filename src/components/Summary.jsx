import React from 'react';
import './Summary.css';
import vinlogo from '../assets/vinlogo.png';

const Summary = ({ totals, formatPKR, lastUpdated, isFiltered }) => {
  const usedPercentage = parseFloat(totals.usedPercentage) || 0;
  
  const stats = [
    {
      title: 'Current Balance',
      value: totals.currentBalance,
      icon: '💎',
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.1)',
      subtitle: 'Available to spend'
    },
    {
      title: 'Total Expenses',
      value: totals.totalExpenses,
      icon: '📉',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.1)',
      subtitle: 'Spent this period'
    },
    {
      title: 'Total Funds',
      value: totals.totalFundsAdded,
      icon: '🏦',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
      subtitle: 'Net budget added'
    }
  ];

  const getProgressColor = (percent) => {
    if (percent > 90) return '#ef4444';
    if (percent > 70) return '#f59e0b';
    return '#3b82f6';
  };

  return (
    <div className="summary-container-v12">
      <div className="main-balance-card-v12">
        <div className="balance-label-v12">
          <span>💎</span> Total Available Balance
        </div>
        <div className="balance-value-v12">
          {formatPKR(totals.currentBalance)}
        </div>
        <div className="balance-footer-v12">
          {isFiltered && <span className="filtered-badge-v12">Filtered View</span>}
          {lastUpdated && <span className="sync-text-v12">Synced: {lastUpdated}</span>}
        </div>
      </div>

      <div className="secondary-stats-v12">
        <div className="mini-stat-v12 funds">
          <div className="mini-icon-v12">🏦</div>
          <div className="mini-info-v12">
            <small>Total Funds</small>
            <strong>{formatPKR(totals.totalFundsAdded)}</strong>
          </div>
        </div>
        <div className="mini-stat-v12 expenses">
          <div className="mini-icon-v12">📉</div>
          <div className="mini-info-v12">
            <small>Total Expenses</small>
            <strong>{formatPKR(totals.totalExpenses)}</strong>
          </div>
        </div>
        <div className="mini-stat-v12 utilization">
          <div className="mini-icon-v12">📊</div>
          <div className="mini-info-v12">
            <small>Usage Rate</small>
            <strong style={{ color: getProgressColor(usedPercentage) }}>{usedPercentage}%</strong>
          </div>
        </div>
      </div>

      <div className="budget-bar-v12">
        <div className="bar-container-v12">
          <div 
            className="bar-fill-v12" 
            style={{ 
              width: `${Math.min(usedPercentage, 100)}%`, 
              background: `linear-gradient(90deg, ${getProgressColor(usedPercentage)} 0%, #6366f1 100%)`
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default Summary;