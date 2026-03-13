import React from 'react';
import './PrintReport.css';
import vinlogo from '../assets/vinlogo.png';

const PrintReport = ({ expenses, fundHistory, totals, formatPKR, lastUpdated, filteredExpenses, onLogout }) => {
  const [selectedDate, setSelectedDate] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  const generateReport = (type = 'all') => {
    let filteredEx = expenses;
    let filteredHist = fundHistory;
    let reportTitle = "Complete Financial Report";

    if (type === 'current' && filteredExpenses) {
      filteredEx = filteredExpenses;
      // For history, we'll try to match the dates of the filtered expenses
      const activeDates = new Set(filteredExpenses.map(e => e.date));
      filteredHist = fundHistory.filter(h => {
        const hDate = h.date.split('T')[0];
        return activeDates.has(hDate);
      });
      reportTitle = "Filtered View Report";
    } else if (type === 'single' && selectedDate) {
      filteredEx = expenses.filter(e => e.date === selectedDate);
      filteredHist = fundHistory.filter(h => h.date.startsWith(selectedDate));
      
      const [year, month, day] = selectedDate.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      reportTitle = `Financial Report for ${localDate.toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    } else if (type === 'range' && startDate && endDate) {
      filteredEx = expenses.filter(e => e.date >= startDate && e.date <= endDate);
      filteredHist = fundHistory.filter(h => {
        const hDate = h.date.split('T')[0];
        return hDate >= startDate && hDate <= endDate;
      });
      
      const sDate = new Date(startDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
      const eDate = new Date(endDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
      reportTitle = `Financial Report: ${sDate} to ${eDate}`;
    }

    const printWindow = window.open('', '_blank');
    
    // Calculate totals for the filtered data if needed
    const reportTotalSpent = filteredEx.reduce((sum, e) => sum + e.amount, 0);
    const reportTotalAdded = filteredHist.filter(h => h.type === 'credit').reduce((sum, h) => sum + h.amount, 0);
    const isFiltered = type !== 'all';

    const currentDate = new Date().toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      let date;
      if (dateString.length === 10 && dateString.includes('-')) {
        const [year, month, day] = dateString.split('-').map(Number);
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(dateString);
      }
      return date.toLocaleDateString('en-PK', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    };

    const reportHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitle}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Poppins', Arial, sans-serif;
            background: #f5f7fa;
            padding: 40px;
          }
          .report-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 30px;
            padding: 30px;
            background: #2c3e50;
            color: white;
            border-radius: 15px;
            text-align: left;
          }
          .header-logo {
            height: 70px;
            width: auto;
            margin-right: 20px;
            background: white;
            padding: 5px;
            border-radius: 8px;
          }
          .header-content { flex: 1; }
          .header h1 { font-size: 28px; margin-bottom: 5px; }
          .header p { opacity: 0.8; font-size: 14px; }
          .summary-cards {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 30px;
          }
          .card {
            padding: 20px;
            border-radius: 12px;
            text-align: center;
          }
          .card.funds { background: rgba(39, 174, 96, 0.1); border-left: 4px solid #27ae60; }
          .card.expenses { background: rgba(231, 76, 60, 0.1); border-left: 4px solid #e74c3c; }
          .card.balance { background: rgba(44, 62, 80, 0.1); border-left: 4px solid #2c3e50; }
          .card h3 { color: #666; font-size: 14px; margin-bottom: 10px; }
          .card .amount { font-size: 24px; font-weight: 700; }
          
          .section { margin-bottom: 30px; }
          .section h2 { font-size: 18px; margin-bottom: 15px; color: #2c3e50; border-bottom: 2px solid #f0f0f0; padding-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #f8f9fa; padding: 12px; text-align: left; font-size: 13px; color: #7f8c8d; border-bottom: 2px solid #dee2e6; }
          td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; color: #2c3e50; }
          .credit { color: #27ae60; font-weight: 600; }
          .debit { color: #e74c3c; font-weight: 600; }
          .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #f0f0f0; display: flex; justify-content: space-between; color: #7f8c8d; font-size: 12px; }
          .print-btn { display: block; width: 100%; padding: 15px; background: #2c3e50; color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 16px; font-weight: 600; margin-top: 20px; transition: all 0.3s ease; }
          .print-btn:hover { background: #1a252f; transform: translateY(-2px); }
          @media print { .print-btn { display: none; } body { padding: 0; background: white; } .report-container { box-shadow: none; padding: 0; } }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="header">
            <img src="${vinlogo}" alt="Vinsol Logo" class="header-logo" />
            <div class="header-content">
              <h1>${reportTitle}</h1>
              <p>Real-time Expense & Fund Tracking System</p>
              <p>Generated on: ${currentDate}</p>
              ${lastUpdated ? `<p>Data synced at: ${lastUpdated}</p>` : ''}
            </div>
          </div>
          
          <div class="summary-cards">
            <div class="card funds">
              <h3>Total Funds (Net)</h3>
              <div class="amount">${formatPKR(isFiltered ? reportTotalAdded : totals.totalFundsAdded)}</div>
            </div>
            <div class="card expenses">
              <h3>Total Expenses</h3>
              <div class="amount">${formatPKR(isFiltered ? reportTotalSpent : totals.totalExpenses)}</div>
            </div>
            <div class="card balance">
              <h3>Available Balance</h3>
              <div class="amount">${formatPKR(isFiltered ? (reportTotalAdded - reportTotalSpent) : totals.currentBalance)}</div>
            </div>
          </div>

          <div class="section">
            <h2>Transaction History</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Running Balance</th>
                </tr>
              </thead>
              <tbody>
                ${filteredHist.map(item => `
                  <tr>
                    <td>${formatDate(item.date)}</td>
                    <td>${item.description}</td>
                    <td class="${item.amount >= 0 ? 'credit' : 'debit'}">
                      ${item.amount >= 0 ? '+' : ''} ${formatPKR(item.amount)}
                    </td>
                    <td>${formatPKR(item.runningTotal)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Expense Details</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${filteredEx.map(expense => `
                  <tr>
                    <td>${formatDate(expense.date)}</td>
                    <td>${expense.description}</td>
                    <td>${expense.category}</td>
                    <td class="debit">${formatPKR(expense.amount)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="background: #2c3e50; color: white;">
                  <td colspan="3" style="text-align: right;"><strong>Total for this period:</strong></td>
                  <td><strong>${formatPKR(reportTotalSpent)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div class="footer">
            <p>Total Transactions: ${filteredHist.length}</p>
            <p>Average Expense: ${filteredEx.length > 0 ? formatPKR(reportTotalSpent / filteredEx.length) : formatPKR(0)}</p>
          </div>
          
          <button class="print-btn" onclick="window.print()">🖨️ Print Report</button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(reportHTML);
    printWindow.document.close();
  };

  return (
    <div className="print-report-v14">
      <div className="print-grid-v14">
        <div className="print-section-v14">
          <label className="print-label-v14">Single Day Report</label>
          <div className="print-stack-v15">
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="print-input-v14 full-width-v15"
            />
            <button 
              className="print-btn-v14 primary full-width-v15" 
              onClick={() => generateReport('single')}
              disabled={!selectedDate}
            >
              📅 Print Day
            </button>
          </div>
        </div>

        <div className="print-section-v14">
          <label className="print-label-v14">Custom Range Report</label>
          <div className="print-stack-v15">
            <div className="range-inputs-v15">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="print-input-v14"
              />
              <span className="print-to-v14">to</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="print-input-v14"
              />
            </div>
            <button 
              className="print-btn-v14 accent full-width-v15" 
              onClick={() => generateReport('range')}
              disabled={!startDate || !endDate}
            >
              🗓️ Print Range
            </button>
          </div>
        </div>

        <div className="print-actions-v14">
          <button className="print-btn-v14 outline" onClick={() => generateReport('current')}>
            📋 Filtered
          </button>
          <button className="print-btn-v14 success" onClick={() => generateReport('all')}>
            📊 Full Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintReport;