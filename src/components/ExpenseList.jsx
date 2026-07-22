import React, { useState } from 'react';
import './ExpenseList.css';

const ExpenseList = ({ expenses, onDelete, onEdit, formatPKR }) => {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  // Fixed image modal function
  const openImageModal = (imageUrl) => {
    console.log('Opening image:', imageUrl.substring(0, 50) + '...'); // Debug
    setSelectedImage(imageUrl);
    setIsModalOpen(true);
    // Prevent body scrolling when modal is open
    document.body.style.overflow = 'hidden';
  };

  const closeImageModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
    // Restore body scrolling
    document.body.style.overflow = 'auto';
  };

  // Handle image error
  const handleImageError = (e) => {
    console.error('Image failed to load');
    e.target.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <rect width="200" height="200" fill="#f8fafc"/>
        <text x="100" y="100" font-family="Arial" font-size="14" fill="#64748b" text-anchor="middle" dy=".3em">Image not available</text>
        <text x="100" y="130" font-family="Arial" font-size="12" fill="#94a3b8" text-anchor="middle">📸</text>
      </svg>
    `);
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
    <>
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
                        
                        {/* Fixed Image Column */}
                        <div className="cell-image-v7">
                          {expense.imageUrl ? (
                            <button 
                              className="view-receipt-btn"
                              onClick={() => openImageModal(expense.imageUrl)}
                              title="View Receipt"
                            >
                              <span className="receipt-icon">📸</span>
                              <span className="receipt-label">Receipt</span>
                            </button>
                          ) : (
                            <span className="no-receipt" title="No receipt attached">
                              <span className="no-receipt-icon">📭</span>
                            </span>
                          )}
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

      {/* Fixed Working Image Modal */}
      {isModalOpen && selectedImage && (
        <div className="image-modal-overlay" onClick={closeImageModal}>
          <div className="image-modal-container" onClick={e => e.stopPropagation()}>
            <div className="image-modal-header">
              <h3>
                <span className="header-icon">📸</span>
                Receipt Image
              </h3>
              <button className="image-modal-close-btn" onClick={closeImageModal}>
                <span>✕</span>
              </button>
            </div>
            <div className="image-modal-body">
              <img 
                src={selectedImage} 
                alt="Receipt" 
                className="image-modal-img"
                onError={handleImageError}
                loading="lazy"
              />
            </div>
            <div className="image-modal-footer">
              <button 
                className="image-modal-btn download"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = selectedImage;
                  link.download = `receipt-${Date.now()}.jpg`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                <span>📥</span>
                Download
              </button>
              <button 
                className="image-modal-btn print"
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Receipt</title>
                          <style>
                            body { 
                              display: flex; 
                              justify-content: center; 
                              align-items: center; 
                              min-height: 100vh; 
                              margin: 0; 
                              background: #f5f5f5;
                              font-family: Arial, sans-serif;
                            }
                            .container {
                              text-align: center;
                              padding: 20px;
                            }
                            img { 
                              max-width: 90vw; 
                              max-height: 90vh; 
                              object-fit: contain;
                              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                              border-radius: 8px;
                            }
                            .footer {
                              margin-top: 20px;
                              color: #666;
                              font-size: 12px;
                            }
                          </style>
                        </head>
                        <body>
                          <div class="container">
                            <img src="${selectedImage}" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22200%22%20height%3D%22200%22%20viewBox%3D%220%200%20200%20200%22%3E%3Crect%20width%3D%22200%22%20height%3D%22200%22%20fill%3D%22%23f8fafc%22%2F%3E%3Ctext%20x%3D%22100%22%20y%3D%22100%22%20font-family%3D%22Arial%22%20font-size%3D%2214%22%20fill%3D%22%2364748b%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%3EImage%20not%20available%3C%2Ftext%3E%3C%2Fsvg%3E';" />
                            <div class="footer">Receipt from Expense Management System</div>
                          </div>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.focus();
                    setTimeout(() => {
                      printWindow.print();
                    }, 500);
                  }
                }}
              >
                <span>🖨️</span>
                Print
              </button>
              <button 
                className="image-modal-btn close"
                onClick={closeImageModal}
              >
                <span>✕</span>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExpenseList;