import React, { useState } from 'react';
import './ExpenseList.css';

const ExpenseList = ({ expenses, onDelete, onEdit, formatPKR }) => {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // ==================== GET IMAGE FROM LOCAL STORAGE ====================
  const getImageFromLocal = (path) => {
    try {
      const savedImages = JSON.parse(localStorage.getItem('savedImages') || '[]');
      const image = savedImages.find(img => img.path === path);
      return image ? image.base64 : null;
    } catch (e) {
      console.error('Error getting image from local:', e);
      return null;
    }
  };

  // ==================== GET IMAGE SOURCE (CORS FIXED) ====================
  const getImageSrc = (expense) => {
    // 1. Check if imageBase64 exists (direct)
    if (expense.imageBase64 && expense.imageBase64.length > 100) {
      return expense.imageBase64;
    }
    
    // 2. Check if imagePath exists (get from localStorage)
    if (expense.imagePath) {
      const localImage = getImageFromLocal(expense.imagePath);
      if (localImage) {
        return localImage;
      }
    }
    
    // ============================================================
    // 🔥 CRITICAL CORS FIX: Google Drive URL ko Thumbnail URL mein convert karo
    // ============================================================
    if (expense.imageUrl && expense.imageUrl.startsWith('http')) {
      // Agar URL Google Drive ka 'uc' link hai
      if (expense.imageUrl.includes('drive.google.com/uc')) {
        const fileId = expense.imageUrl.match(/id=([^&]+)/)?.[1];
        if (fileId) {
          // ✅ PERMANENT FIX: 'thumbnail' endpoint use karo. Yeh CORS bypass karta hai.
          return `https://drive.google.com/thumbnail?sz=w1000&id=${fileId}`;
        }
      }
      
      // Agar pehle se safe domain hai (jaise thumbnail ya googleusercontent)
      if (expense.imageUrl.includes('googleusercontent.com') || expense.imageUrl.includes('thumbnail')) {
        return expense.imageUrl;
      }
      
      return expense.imageUrl;
    }
    
    return null;
  };

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
    if (!expense) return;
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
    if (editingId) {
      onEdit(editingId, {
        ...editForm,
        amount: parseFloat(editForm.amount)
      });
    }
    setEditingId(null);
  };

  // ============ FULL SCREEN IMAGE MODAL ============
  const openImageModal = (imageData) => {
    console.log('🔍 Opening image, data type:', typeof imageData);
    console.log('🔍 Image data preview:', imageData ? imageData.substring(0, 50) + '...' : 'null');
    
    if (!imageData) {
      console.warn('⚠️ No image data provided');
      return;
    }
    
    setSelectedImage(imageData);
    setZoomLevel(1);
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeImageModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
    setZoomLevel(1);
    document.body.style.overflow = 'auto';
  };

  // ============ ZOOM CONTROLS ============
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 4));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleZoomReset = () => {
    setZoomLevel(1);
  };

  // ============ MOUSE WHEEL ZOOM ============
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomLevel(prev => Math.min(prev + 0.1, 4));
    } else {
      setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
    }
  };

  // ============ KEYBOARD SHORTCUTS ============
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      closeImageModal();
    }
    if (e.key === '+' || e.key === '=') {
      handleZoomIn();
    }
    if (e.key === '-') {
      handleZoomOut();
    }
    if (e.key === '0') {
      handleZoomReset();
    }
  };

  // ============ HANDLE IMAGE ERROR ============
  const handleImageError = (e) => {
    console.error('❌ Image failed to load');
    e.target.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500">
        <rect width="500" height="500" fill="#f8fafc"/>
        <text x="250" y="200" font-family="Arial" font-size="40" fill="#64748b" text-anchor="middle" dy=".3em">📸</text>
        <text x="250" y="260" font-family="Arial" font-size="20" fill="#94a3b8" text-anchor="middle">Image not available</text>
      </svg>
    `);
  };

  // ============ CHECK IF IMAGE EXISTS ============
  const hasImage = (expense) => {
    if (!expense) return false;
    return !!(expense.imageBase64 || expense.imagePath || expense.imageUrl);
  };

  const getImageData = (expense) => {
    if (!expense) return null;
    const src = getImageSrc(expense);
    if (!src) {
      console.log('⚠️ No valid image found for:', expense.description);
    }
    return src;
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

  // ✅ SAFETY CHECK
  if (!Array.isArray(expenses) || expenses.length === 0) {
    return (
      <div className="expense-history-v7">
        <div className="empty-state-v7">
          <div className="empty-icon-v7">📁</div>
          <h3>No records found</h3>
          <p>Your expense history will appear here once you start recording.</p>
        </div>
      </div>
    );
  }

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
        {sortedDates.map(date => (
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
                      
                      {/* ============ IMAGE COLUMN ============ */}
                      <div className="cell-image-v7">
                        {hasImage(expense) ? (
                          <button 
                            className="view-receipt-btn"
                            onClick={() => {
                              const imageSrc = getImageData(expense);
                              if (imageSrc) {
                                openImageModal(imageSrc);
                              } else {
                                console.warn('⚠️ No image data available for:', expense.description);
                              }
                            }}
                            title="View Receipt (Full Screen)"
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
        ))}
      </div>

      {/* ============ FULL SCREEN IMAGE MODAL ============ */}
      {isModalOpen && selectedImage && (
        <div 
          className="image-modal-fullscreen-overlay" 
          onClick={closeImageModal}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div className="image-modal-fullscreen-container" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="image-modal-fullscreen-header">
              <div className="header-left">
                <span className="header-icon">🖼️</span>
                <span className="header-title">Receipt Image</span>
                <span className="zoom-indicator">{Math.round(zoomLevel * 100)}%</span>
              </div>
              <div className="header-right">
                <button 
                  className="fullscreen-btn"
                  onClick={() => {
                    if (document.fullscreenElement) {
                      document.exitFullscreen();
                    } else {
                      document.documentElement.requestFullscreen();
                    }
                  }}
                  title="Fullscreen (F11)"
                >
                  ⛶
                </button>
                <button 
                  className="image-modal-close-btn"
                  onClick={closeImageModal}
                  title="Close (ESC)"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Image Body with Zoom */}
            <div 
              className="image-modal-fullscreen-body"
              onWheel={handleWheel}
            >
              <div className="image-zoom-wrapper">
                <img 
                  src={selectedImage} 
                  alt="Receipt" 
                  className="image-modal-fullscreen-img"
                  style={{ 
                    transform: `scale(${zoomLevel})`,
                    transition: 'transform 0.15s ease-out'
                  }}
                  onError={handleImageError}
                  loading="lazy"
                  draggable={false}
                />
              </div>
              <div className="zoom-hint">
                <span>🖱️ Scroll to zoom • Click to close</span>
              </div>
            </div>

            {/* Footer Controls */}
            <div className="image-modal-fullscreen-footer">
              <div className="zoom-controls">
                <button 
                  className="zoom-btn"
                  onClick={handleZoomOut}
                  title="Zoom Out (-)"
                >
                  <span>➖</span>
                </button>
                <span className="zoom-level-text">{Math.round(zoomLevel * 100)}%</span>
                <button 
                  className="zoom-btn"
                  onClick={handleZoomIn}
                  title="Zoom In (+)"
                >
                  <span>➕</span>
                </button>
                <button 
                  className="reset-btn"
                  onClick={handleZoomReset}
                  title="Reset Zoom (0)"
                >
                  <span>⟳</span>
                  Reset
                </button>
              </div>
              <div className="modal-actions">
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
                                background: #1a1a2e;
                                font-family: Arial, sans-serif;
                              }
                              .container {
                                text-align: center;
                                padding: 20px;
                              }
                              img { 
                                max-width: 95vw; 
                                max-height: 95vh; 
                                object-fit: contain;
                                box-shadow: 0 4px 30px rgba(0,0,0,0.5);
                                border-radius: 12px;
                              }
                              .footer {
                                margin-top: 20px;
                                color: #94a3b8;
                                font-size: 14px;
                              }
                            </style>
                          </head>
                          <body>
                            <div class="container">
                              <img src="${selectedImage}" onerror="this.onerror=null; this.innerHTML='Image not available';" />
                              <div class="footer">📸 Receipt from Expense Management System</div>
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
        </div>
      )}
    </>
  );
};

export default ExpenseList;