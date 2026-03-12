import React, { useState } from 'react';
import './ExpenseList.css';

const ExpenseList = ({ expenses, onDelete, onEdit, formatPKR }) => {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const categories = [
    'One-time Expense', 'Regular Expense', 'Office Stationery', 'Employee Stuff', 
    'Food', 'Transport', 'Utilities', 'Marketing', 'Maintenance', 'Bills', 'Other'
  ];

  const getCategoryIcon = (category) => {
    const icons = {
      'One-time Expense': '⚡',
      'Regular Expense': '🔄',
      'Office Stationery': '📎',
      'Employee Stuff': '👨‍💼',
      'Food': '🍱',
      'Transport': '🚗',
      'Utilities': '💡',
      'Marketing': '📢',
      'Maintenance': '🛠️',
      'Bills': '📄',
      'Other': '📌'
    };
    return icons[category] || '💰';
  };

  const handleEditClick = (expense) => {
    setEditingId(expense.id);
    setEditForm({ 
      description: expense.description || '', 
      amount: expense.amount || '', 
      date: expense.date || new Date().toISOString().split('T')[0], 
      category: expense.category || 'Regular Expense' 
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onEdit(editingId, {
      ...editForm,
      amount: parseFloat(editForm.amount)
    });
    setEditingId(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-PK', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  };

  // Group by date
  const groupedExpenses = expenses.reduce((groups, expense) => {
    const date = expense.date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(expense);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedExpenses).sort((a, b) => b.localeCompare(a));

  return (
    <div className="expense-history-v7">
      {sortedDates.length === 0 ? (
        <div className="empty-state-v7">
          <div className="empty-icon-v7">📁</div>
          <h3>No records found</h3>
          <p>Your expense history will appear here once you start recording.</p>
        </div>
      ) : (
        sortedDates.map(date => (
          <div key={date} className="daily-group-v7">
            <div className="group-header-v7">
              <div className="header-info-v7">
                <span className="calendar-icon-v7">📅</span>
                <div className="date-stack-v7">
                  <h4>{formatDate(date)}</h4>
                  <span className="item-count-v7">{groupedExpenses[date].length} Transactions</span>
                </div>
              </div>
              <div className="header-stats-v7">
                <span className="total-label-v7">Daily Total</span>
                <span className="total-amount-v7">
                  {formatPKR(groupedExpenses[date].reduce((sum, e) => sum + e.amount, 0))}
                </span>
              </div>
            </div>

            <div className="data-grid-v7">
              {groupedExpenses[date].map(expense => (
                <div key={expense.id} className={`grid-row-v7 ${editingId === expense.id ? 'is-editing' : ''}`}>
                  {editingId === expense.id ? (
                    <div className="edit-mode-v7">
                      <div className="edit-fields-v7">
                        <select
                          name="category"
                          value={editForm.category}
                          onChange={handleEditChange}
                          className="edit-select-v7"
                        >
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          name="description"
                          value={editForm.description}
                          onChange={handleEditChange}
                          className="edit-input-v7 desc"
                          placeholder="Description"
                        />
                        <input
                          type="number"
                          name="amount"
                          value={editForm.amount}
                          onChange={handleEditChange}
                          className="edit-input-v7 amount"
                          placeholder="Amount"
                        />
                      </div>
                      <div className="edit-actions-v7">
                        <button onClick={handleSave} className="save-btn-v7" title="Save Changes">✔️</button>
                        <button onClick={() => setEditingId(null)} className="cancel-btn-v7" title="Cancel">❌</button>
                      </div>
                    </div>
                  ) : (
                    <div className="view-mode-v7">
                      <div className="cell-category-v7">
                        <span className="icon-box-v7">{getCategoryIcon(expense.category)}</span>
                        <span className="category-name-v7">{expense.category}</span>
                      </div>
                      <div className="cell-desc-v7">
                        <p>{expense.description}</p>
                        <span className="timestamp-v7">
                          {new Date(expense.id).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="cell-amount-v7">
                        {formatPKR(expense.amount)}
                      </div>
                      <div className="cell-actions-v7">
                        <button onClick={() => handleEditClick(expense)} className="row-btn-v7 edit" title="Edit Record">✏️</button>
                        <button onClick={() => onDelete(expense.id)} className="row-btn-v7 delete" title="Delete Record">🗑️</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ExpenseList;