import React, { useState } from 'react';
import './ExpenseForm.css';

const ExpenseForm = ({ type, onSubmit, maxAmount, formatPKR, currentBalance }) => {
  const getTodayDate = () => new Date().toLocaleDateString('en-CA');

  // Original categories (excluding One-time Expense, Regular Expense, Bills)
  const categories = [
    'Office Stationery', 'Employee Stuff', 'Food', 'Transport', 
    'Utilities', 'Marketing', 'Maintenance', 'Other'
  ];

  // Expense types for tracking
  const expenseTypes = [
    { value: 'regular', label: 'Regular Expense', icon: '🔄', color: '#3b82f6' },
    { value: 'one-time', label: 'One-time Expense', icon: '⚡', color: '#8b5cf6' },
    { value: 'bill', label: 'Bill', icon: '📄', color: '#ec4899' }
  ];

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: getTodayDate(),
    category: '',
    expenseType: '',
    selectionMode: 'none',
    notes: '',
    isSelfFunded: false,
    image: null, // For storing the image file
    imagePreview: null // For preview
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCategorySelect = (category) => {
    setFormData(prev => ({
      ...prev,
      category: category,
      expenseType: '',
      selectionMode: 'category'
    }));
  };

  const handleExpenseTypeSelect = (expenseType) => {
    setFormData(prev => ({
      ...prev,
      expenseType: expenseType,
      category: '',
      selectionMode: 'expenseType'
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          image: file,
          imagePreview: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove image
  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      image: null,
      imagePreview: null
    }));
    // Reset file input
    document.getElementById('image-upload').value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.description || !formData.amount) return;
    
    if (type === 'expense' && !formData.category && !formData.expenseType) {
      alert('Please select either a Category or an Expense Type');
      return;
    }
    
    setIsSubmitting(true);
    
    await new Promise(resolve => setTimeout(resolve, 400));
    
    try {
      // Prepare expense data
      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount),
        id: Date.now(),
        timestamp: new Date().toISOString()
      };

      // Handle image - convert to base64 for storage
      if (formData.imagePreview) {
        submitData.imageUrl = formData.imagePreview;
      }

      // Handle different selection modes
      if (type === 'expense') {
        if (formData.expenseType) {
          submitData.expenseType = formData.expenseType;
          submitData.category = formData.expenseType === 'regular' ? 'Regular Expense' :
                                 formData.expenseType === 'one-time' ? 'One-time Expense' : 'Bill';
        } else if (formData.category) {
          submitData.expenseType = 'regular';
          submitData.category = formData.category;
        }
      } else {
        // For funds, add self-funded flag to description if checked
        if (formData.isSelfFunded) {
          submitData.description = `[SELF-FUNDED] ${formData.description}`;
          submitData.selfFunded = true;
        }
        
        // Add notes to description if provided
        if (formData.notes) {
          submitData.description = `${submitData.description} (Note: ${formData.notes})`;
        }
      }

      await onSubmit(submitData);
      
      // Reset form
      setFormData({
        description: '',
        amount: '',
        date: getTodayDate(),
        category: '',
        expenseType: '',
        selectionMode: 'none',
        notes: '',
        isSelfFunded: false,
        image: null,
        imagePreview: null
      });
      
      // Reset file input
      const fileInput = document.getElementById('image-upload');
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isExpense = type === 'expense';
  const isFunds = type === 'funds';

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

        {/* Image Upload Section - For Expenses Only */}
        {isExpense && (
          <div className="form-group-v5 image-upload-group">
            <label>
              <span className="label-icon">📸</span>
              Attach Receipt/Image (Optional)
            </label>
            <div className="image-upload-container">
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                onChange={handleImageChange}
                className="image-upload-input"
              />
              
              {!formData.imagePreview ? (
                <label htmlFor="image-upload" className="image-upload-label">
                  <div className="upload-placeholder">
                    <span className="upload-icon">📎</span>
                    <span>Click to upload image</span>
                    <small>PNG, JPG, GIF up to 5MB</small>
                  </div>
                </label>
              ) : (
                <div className="image-preview-container">
                  <img 
                    src={formData.imagePreview} 
                    alt="Preview" 
                    className="image-preview"
                  />
                  <button 
                    type="button" 
                    className="remove-image-btn"
                    onClick={handleRemoveImage}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Self-Funded Checkbox - Only for Funds */}
        {isFunds && (
          <div className="form-group-v5 self-funded-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isSelfFunded"
                checked={formData.isSelfFunded}
                onChange={handleChange}
              />
              <span className="checkbox-custom"></span>
              <span className="checkbox-text">
                <strong>Self-Funded</strong>
                <small> (I added money from my own pocket)</small>
              </span>
            </label>
          </div>
        )}

        {/* Notes Field - For both Expense and Funds */}
        <div className="form-group-v5">
          <label>Notes (Optional)</label>
          <div className="input-wrapper">
            <span className="input-icon">📌</span>
            <textarea
              name="notes"
              placeholder={isFunds && formData.isSelfFunded 
                ? "Why are you adding self funds? (e.g., Petty cash, Personal contribution)" 
                : isExpense 
                  ? "Add any additional details about this expense" 
                  : "Add any notes about this transaction"}
              value={formData.notes}
              onChange={handleChange}
              rows="2"
              className="notes-textarea"
            />
          </div>
          {isFunds && formData.isSelfFunded && (
            <small className="field-hint" style={{ color: '#e67e22', marginTop: '4px', display: 'block' }}>
              ⚠️ Admin will be notified that this is a self-funded addition
            </small>
          )}
        </div>

        {isExpense && (
          <>
            {/* Selection Mode Tabs */}
            <div className="selection-mode-tabs">
              <button
                type="button"
                className={`mode-tab ${formData.selectionMode === 'category' ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, selectionMode: 'category', category: '', expenseType: '' }))}
              >
                <span className="tab-icon">🏷️</span>
                <span>Select Category</span>
              </button>
              <button
                type="button"
                className={`mode-tab ${formData.selectionMode === 'expenseType' ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, selectionMode: 'expenseType', category: '', expenseType: '' }))}
              >
                <span className="tab-icon">📊</span>
                <span>Select Expense Type</span>
              </button>
            </div>

            {/* Categories Grid */}
            {formData.selectionMode === 'category' && (
              <div className="categories-grid">
                <label className="categories-label">Choose Category:</label>
                <div className="category-options">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`category-btn ${formData.category === cat ? 'selected' : ''}`}
                      onClick={() => handleCategorySelect(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Expense Types Grid */}
            {formData.selectionMode === 'expenseType' && (
              <div className="expense-type-grid">
                <label className="expense-type-label">Choose Expense Type:</label>
                <div className="expense-type-options">
                  {expenseTypes.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      className={`expense-type-btn ${formData.expenseType === type.value ? 'selected' : ''}`}
                      onClick={() => handleExpenseTypeSelect(type.value)}
                      style={{ 
                        borderColor: formData.expenseType === type.value ? type.color : '#e0e0e0',
                        background: formData.expenseType === type.value ? `${type.color}20` : 'white'
                      }}
                    >
                      <span className="expense-type-icon">{type.icon}</span>
                      <span className="expense-type-text">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Info */}
            {formData.selectionMode !== 'none' && (
              <div className="selected-info">
                {formData.category && (
                  <div className="info-badge category">
                    <span>Selected Category: </span>
                    <strong>{formData.category}</strong>
                  </div>
                )}
                {formData.expenseType && (
                  <div className="info-badge expense-type">
                    <span>Selected Type: </span>
                    <strong>
                      {formData.expenseType === 'regular' ? 'Regular Expense' :
                       formData.expenseType === 'one-time' ? 'One-time Expense' : 'Bill'}
                    </strong>
                  </div>
                )}
              </div>
            )}
          </>
        )}

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
        disabled={isSubmitting || (isExpense && !formData.category && !formData.expenseType)}
      >
        {isSubmitting ? (
          <span className="spinner"></span>
        ) : (
          <>
            <span className="btn-icon-v5">
              {isExpense ? '💸' : isFunds && formData.isSelfFunded ? '👤💰' : '📥'}
            </span>
            {isExpense ? 'Record Expense' : isFunds && formData.isSelfFunded ? 'Add Self Funds' : 'Add to Balance'}
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