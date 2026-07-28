import React, { useState } from 'react';
import './ExpenseForm.css';

const ExpenseForm = ({ type, onSubmit, formatPKR, currentBalance }) => {
  const getTodayDate = () => new Date().toLocaleDateString('en-CA');

  const categories = [
    'One-time Expense', 'Regular Expense', 'Office Stationery', 'Employee Stuff', 
    'Food', 'Transport', 'Utilities', 'Marketing', 'Maintenance', 'Bills', 'Other'
  ];

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
    imageFile: null,
    imagePreview: null
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
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ============ IMAGE HANDLING ============
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    console.log('📸 Image selected:', file ? file.name : 'No file');
    
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('❌ Image size should be less than 10MB');
        e.target.value = '';
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('❌ Please select an image file');
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        console.log('✅ Image loaded, preview created');
        setFormData(prev => ({
          ...prev,
          imageFile: file,
          imagePreview: reader.result
        }));
      };
      reader.onerror = () => {
        console.error('❌ Failed to read image');
        alert('❌ Failed to read image file');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    console.log('🗑️ Image removed');
    setFormData(prev => ({
      ...prev,
      imageFile: null,
      imagePreview: null
    }));
    const fileInput = document.getElementById('image-upload');
    if (fileInput) fileInput.value = '';
  };

  // ============ FORM SUBMIT ============
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('📝 Form submitted');
    console.log('📝 Form data:', {
      description: formData.description,
      amount: formData.amount,
      category: formData.category,
      expenseType: formData.expenseType,
      selectionMode: formData.selectionMode,
      hasImage: formData.imageFile ? 'Yes' : 'No',
      imageName: formData.imageFile ? formData.imageFile.name : 'None'
    });
    
    // VALIDATION
    if (!formData.description || !formData.amount) {
      alert('❌ Please fill in description and amount');
      console.log('❌ Validation failed: Missing description or amount');
      return;
    }
    
    if (type === 'expense' && !formData.category && !formData.expenseType) {
      alert('❌ Please select either a Category or an Expense Type');
      console.log('❌ Validation failed: No category or expense type selected');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const submitData = {
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        date: formData.date,
        category: formData.category || 'Other',
        expenseType: formData.expenseType || 'regular',
        notes: formData.notes || '',
        imageFile: formData.imageFile,     // ← ACTUAL FILE
        imagePreview: formData.imagePreview // ← PREVIEW URL
      };

      console.log('📤 Submitting data to parent:', {
        description: submitData.description,
        amount: submitData.amount,
        category: submitData.category,
        expenseType: submitData.expenseType,
        hasImageFile: submitData.imageFile ? 'Yes' : 'No',
        imageFileName: submitData.imageFile ? submitData.imageFile.name : 'None',
        hasImagePreview: submitData.imagePreview ? 'Yes' : 'No'
      });

      // CALL PARENT onSubmit
      const result = await onSubmit(submitData);
      console.log('✅ Parent onSubmit result:', result);
      
      // Reset form on success
      if (result !== false) {
        console.log('🔄 Resetting form');
        setFormData({
          description: '',
          amount: '',
          date: getTodayDate(),
          category: '',
          expenseType: '',
          selectionMode: 'none',
          notes: '',
          imageFile: null,
          imagePreview: null
        });
        
        const fileInput = document.getElementById('image-upload');
        if (fileInput) fileInput.value = '';
      } else {
        console.log('❌ Parent returned false, not resetting form');
      }
      
    } catch (error) {
      console.error('❌ Submit error:', error);
      alert('❌ Failed to add expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isExpense = type === 'expense';

  const balanceClass = currentBalance < 0 ? 'negative' : 'positive';

  return (
    <form className={`expense-form-v5 ${type}`} onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-group-v5">
          <label>Description *</label>
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
          <label>Amount (PKR) *</label>
          <div className="input-wrapper">
            <span className="input-icon">💰</span>
            <input
              type="number"
              name="amount"
              placeholder="0.00"
              value={formData.amount}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* ============ IMAGE UPLOAD SECTION ============ */}
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
                    <small>PNG, JPG, WebP (Max 10MB)</small>
                  </div>
                </label>
              ) : (
                <div className="image-preview-container">
                  <img 
                    src={formData.imagePreview} 
                    alt="Receipt preview" 
                    className="image-preview"
                  />
                  <button 
                    type="button" 
                    className="remove-image-btn"
                    onClick={handleRemoveImage}
                  >
                    ✕ Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes Field */}
        <div className="form-group-v5">
          <label>Notes (Optional)</label>
          <div className="input-wrapper">
            <span className="input-icon">📌</span>
            <textarea
              name="notes"
              placeholder="Add any additional details"
              value={formData.notes}
              onChange={handleChange}
              rows="2"
              className="notes-textarea"
            />
          </div>
        </div>

        {isExpense && (
          <>
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
          <span className="spinner">⏳</span>
        ) : (
          <>
            <span className="btn-icon-v5">{isExpense ? '💸' : '💰'}</span>
            {isExpense ? 'Record Expense' : 'Add Funds'}
          </>
        )}
      </button>

      <div className={`balance-display ${balanceClass}`}>
        <span className="balance-label">Available Balance:</span>
        <span className="balance-amount">{formatPKR(currentBalance)}</span>
      </div>
    </form>
  );
};

export default ExpenseForm;