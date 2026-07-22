import React from 'react';
import './MonthlyOverview.css';

const MonthlyOverview = ({ monthlyExpenses, categoryTotals, formatPKR }) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const currentMonthData = Object.entries(monthlyExpenses || {})
    .sort((a, b) => b[0] - a[0])
    .slice(0, 6);

  const maxMonth = Math.max(...Object.values(monthlyExpenses || {}), 1);
  const maxCategory = Math.max(...Object.values(categoryTotals || {}), 1);

  return (
    <div className="overview-card-v5">
      <div className="analytics-section-v5">
        <h4><span>📊</span> Monthly Spending</h4>
        <div className="analytics-grid-v5">
          {currentMonthData.length > 0 ? (
            currentMonthData.map(([monthIdx, amount]) => (
              <div key={monthIdx} className="analytics-item-v5">
                <span className="item-label-v5">{months[parseInt(monthIdx)]}</span>
                <div className="item-bar-v5">
                  <div 
                    className="bar-fill-v5"
                    style={{ width: `${(amount / maxMonth) * 100}%` }}
                  ></div>
                </div>
                <span className="item-value-v5">{formatPKR(amount)}</span>
              </div>
            ))
          ) : (
            <p className="empty-msg">No monthly data available</p>
          )}
        </div>
      </div>

      <div className="analytics-section-v5">
        <h4><span>🏷️</span> Category Distribution</h4>
        <div className="analytics-grid-v5">
          {Object.entries(categoryTotals || {}).length > 0 ? (
            Object.entries(categoryTotals)
              .sort((a, b) => b[1] - a[1])
              .map(([category, amount]) => (
                <div key={category} className="analytics-item-v5">
                  <span className="item-label-v5">{category}</span>
                  <div className="item-bar-v5">
                    <div 
                      className="bar-fill-v5" 
                      style={{ width: `${(amount / maxCategory) * 100}%` }}
                    ></div>
                  </div>
                  <span className="item-value-v5">{formatPKR(amount)}</span>
                </div>
              ))
          ) : (
            <p className="empty-msg">No category data available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthlyOverview;