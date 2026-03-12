import React, { useState } from 'react';
import './ExpenseForm.css';

const ExpenseForm = ({ type, onSubmit, maxAmount, formatPKR, currentBalance }) => {
  const getTodayDate = () => new Date().toLocaleDateString('en-CA');

  const categories = [
    'One-time Expense', 'Regular Expense', 'Office Stationery', 'Employee Stuff', 
    'Food', 'Transport', 'Utilities', 'Marketing', 'Maintenance', 'Bills', 'Other'
  ];

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: getTodayDate(),
    category: 'Regular Expense'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;
    
    setIsSubmitting(true);
    
    // Add small delay for "Real-time" feel and wait for it
    await new Promise(resolve => setTimeout(resolve, 400));
    
    try {
      await onSubmit({
        ...formData,
        amount: parseFloat(formData.amount),
        id: Date.now()
      });
      
      setFormData({
        description: '',
        amount: '',
        date: getTodayDate(),
        category: 'Office Stationery'
      });
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isExpense = type === 'expense';

  return (
    <form className={`expense-form-v5 ${type}`} onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-group-v5">
          <label>Description</label>
          <div className="input-wrapper">
            <span className="input-icon">📝</span>
            <input
              type="text"
              name="description"
              placeholder={isExpense ? "What did you spend on?" : "Source of funds"}
              value={formData.description}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-row-v5">
          <div className="form-group-v5">
            <label>Amount (PKR)</label>
            <div className="input-wrapper">
              <span className="input-icon">💰</span>
              <input
                type="number"
                name="amount"
                placeholder="0.00"
                value={formData.amount}
                onChange={handleChange}
                max={isExpense ? maxAmount : undefined}
                required
              />
            </div>
          </div>

          {isExpense && (
            <div className="form-group-v5">
              <label>Category</label>
              <div className="input-wrapper">
                <span className="input-icon">🏷️</span>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="form-group-v5">
          <label>Date</label>
          <div className="input-wrapper">
            <span className="input-icon">📅</span>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>
        </div>
      </div>

      <button 
        type="submit" 
        className={`submit-btn-v5 ${type} ${isSubmitting ? 'loading' : ''}`}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <span className="spinner"></span>
        ) : (
          <>
            <span className="btn-icon-v5">{isExpense ? '💸' : '📥'}</span>
            {isExpense ? 'Record Expense' : 'Add to Balance'}
          </>
        )}
      </button>

      {isExpense && maxAmount !== undefined && (
        <p className="balance-hint">
          Remaining: <strong>{formatPKR(maxAmount)}</strong>
        </p>
      )}
    </form>
  );
};

export default ExpenseForm;