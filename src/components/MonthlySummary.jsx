import React from 'react';
import './MonthlySummary.css';

const MonthlySummary = ({ expenses = [], formatPKR }) => {
  const getMonthlyData = () => {
    if (!Array.isArray(expenses) || expenses.length === 0) {
      return [];
    }
    
    const monthly = {};
    
    expenses.forEach(expense => {
      if (!expense || !expense.date || !expense.amount) return;
      
      try {
        const date = new Date(expense.date);
        const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        
        if (!monthly[monthKey]) {
          monthly[monthKey] = {
            label: monthYear,
            total: 0,
            count: 0,
            categories: {}
          };
        }
        
        monthly[monthKey].total += expense.amount;
        monthly[monthKey].count += 1;
        
        const category = expense.category || 'Other';
        if (!monthly[monthKey].categories[category]) {
          monthly[monthKey].categories[category] = 0;
        }
        monthly[monthKey].categories[category] += expense.amount;
      } catch (error) {
        console.error('Error processing expense:', error);
      }
    });

    // Sort by date (newest first) and take last 6 months
    return Object.entries(monthly)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6)
      .map(([key, data]) => data);
  };

  const monthlyData = getMonthlyData();

  if (!monthlyData || monthlyData.length === 0) {
    return null;
  }

  return (
    <div className="monthly-section">
      <h3>Monthly Summary</h3>
      <div className="monthly-grid">
        {monthlyData.map((month, index) => (
          <div key={index} className="month-card">
            <div className="month-header">
              <h4>{month.label}</h4>
              <span className="month-total">{formatPKR ? formatPKR(month.total) : `Rs ${month.total}`}</span>
              <span className="month-count">{month.count} transactions</span>
            </div>
            <div className="month-categories">
              {Object.entries(month.categories).map(([category, amount]) => (
                <div key={category} className="category-row">
                  <span className="category-name">{category}</span>
                  <span className="category-amount">{formatPKR ? formatPKR(amount) : `Rs ${amount}`}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthlySummary;