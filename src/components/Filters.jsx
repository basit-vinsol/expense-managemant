import React from 'react';
import './Filters.css';

const Filters = ({
  filterCategory = 'All',
  setFilterCategory,
  filterMonth = 'All',
  setFilterMonth,
  filterStartDate = '',
  setFilterStartDate,
  filterEndDate = '',
  setFilterEndDate,
  sortBy = 'date-desc',
  setSortBy,
  expenses = []
}) => {
  const categories = ['All', ...new Set(expenses.map(e => e.category))];
  const months = [
    { value: 'All', label: 'All Months' },
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' }
  ];

  const sortOptions = [
    { value: 'date-desc', label: 'Newest First' },
    { value: 'date-asc', label: 'Oldest First' },
    { value: 'amount-desc', label: 'Highest Amount' },
    { value: 'amount-asc', label: 'Lowest Amount' }
  ];

  return (
    <div className="filters-bar-v7">
      <div className="filters-grid-v7">
        <div className="filter-group-v7">
          <label><span className="filter-icon-v7">🏷️</span> Category</label>
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory && setFilterCategory(e.target.value)}
            className="filter-control-v7"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="filter-group-v7">
          <label><span className="filter-icon-v7">📅</span> Month</label>
          <select 
            value={filterMonth} 
            onChange={(e) => setFilterMonth && setFilterMonth(e.target.value)}
            className="filter-control-v7"
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-group-v7">
          <label><span className="filter-icon-v7">🔃</span> Sort By</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy && setSortBy(e.target.value)}
            className="filter-control-v7"
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-group-v7">
          <label><span className="filter-icon-v7">🛫</span> From</label>
          <input 
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate && setFilterStartDate(e.target.value)}
            className="filter-control-v7 date"
          />
        </div>

        <div className="filter-group-v7">
          <label><span className="filter-icon-v7">🛬</span> To</label>
          <input 
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate && setFilterEndDate(e.target.value)}
            className="filter-control-v7 date"
          />
        </div>

        <button 
          className="reset-action-v7"
          onClick={() => {
            setFilterCategory('All');
            setFilterMonth('All');
            setFilterStartDate('');
            setFilterEndDate('');
            setSortBy('date-desc');
          }}
          title="Reset all filters"
        >
          <span className="reset-icon-v7">🔄</span>
          Reset
        </button>
      </div>
    </div>
  );
};

export default Filters;