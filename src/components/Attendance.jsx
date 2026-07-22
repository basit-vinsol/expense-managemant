import React, { useState, useEffect, useRef } from 'react';
import './Attendance.css';
import vinlogo from '../assets/vinlogo.png';

const OFFICE_START = '13:00';

/* ── helpers ── */
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const monthOf  = (s) => s.slice(0, 7);
const isWeekend = (dateStr) => {
  const [y,m,d] = dateStr.split('-').map(Number);
  return [0,6].includes(new Date(y,m-1,d).getDay());
};
const getDaysInMonth = (monthStr) => {
  const [y,m] = monthStr.split('-').map(Number);
  const total = new Date(y, m, 0).getDate();
  return Array.from({length:total}, (_,i) =>
    `${y}-${String(m).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`
  );
};
const fmtDate = (dateStr) => {
  const [y,m,d] = dateStr.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('en-PK',{weekday:'short',day:'numeric',month:'short'});
};
const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};
const loadLS = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };

/* split days array into weekly chunks (Mon–Sun) */
const getWeeks = (days) => {
  const weeks = [];
  let week = [];
  days.forEach(date => {
    week.push(date);
    const [y,m,d] = date.split('-').map(Number);
    if (new Date(y,m-1,d).getDay() === 0 || date === days[days.length-1]) {
      weeks.push([...week]);
      week = [];
    }
  });
  if (week.length) weeks.push(week);
  return weeks;
};
const weekLabel = (weekDays) => {
  const first = weekDays[0], last = weekDays[weekDays.length-1];
  const [y1,m1,d1] = first.split('-').map(Number);
  const [y2,m2,d2] = last.split('-').map(Number);
  const f = new Date(y1,m1-1,d1).toLocaleDateString('en-PK',{day:'numeric',month:'short'});
  const l = new Date(y2,m2-1,d2).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'});
  return `${f} – ${l}`;
};

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwOemeVXXKOdv8MBJK_0du2urz9zNkzz6qHVdDt1EK7gXqaSbzcK_J4WtByuCGY7w1owg/exec';

const Attendance = () => {
  const [employees,    setEmployees]    = useState(() => loadLS('att_employees', []));
  const [records,      setRecords]      = useState(() => loadLS('att_records', {}));
  const [viewMonth,    setViewMonth]    = useState(() => monthOf(todayStr()));
  const [selectedEmp,  setSelectedEmp]  = useState('');   // '' = all
  const [clock,        setClock]        = useState(new Date());
  const [newName,      setNewName]      = useState('');
  const [showAdd,      setShowAdd]      = useState(false);
  const [notif,        setNotif]        = useState('');
  const [isSyncing,    setIsSyncing]    = useState(false);
  const [lastSync,     setLastSync]     = useState(() => loadLS('att_lastSync', ''));
  const [editingKey,   setEditingKey]   = useState(null); // "empId_date"
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [page, setPage] = useState(1);
  const [selectedWeek, setSelectedWeek] = useState('all');
  const inputRef = useRef(null);

  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { localStorage.setItem('att_employees', JSON.stringify(employees)); }, [employees]);
  useEffect(() => { localStorage.setItem('att_records',   JSON.stringify(records));   }, [records]);

  // when employees change, reset selectedEmp if it no longer exists
  useEffect(() => {
    if (selectedEmp && !employees.find(e => e.id === selectedEmp)) setSelectedEmp('');
  }, [employees]);

  useEffect(() => {
    setPage(1);
  }, [selectedEmp, employeeSearch, viewMonth, rowsPerPage]);

  const toast = (msg) => { setNotif(msg); setTimeout(() => setNotif(''), 2500); };

  // ── SYNC TO GOOGLE SHEETS ──
  const syncToSheets = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    toast('🔄 Syncing attendance...');
    try {
      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ type: 'attendance', employees, records })
      });
      const now = new Date().toLocaleTimeString();
      setLastSync(now);
      localStorage.setItem('att_lastSync', JSON.stringify(now));
      setTimeout(() => toast('✅ Attendance synced!'), 800);
    } catch {
      toast('❌ Sync failed!');
    } finally {
      setIsSyncing(false);
    }
  };

  // ── FETCH FROM GOOGLE SHEETS ──
  const fetchFromSheets = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    toast('📥 Loading from Google Sheets...');
    try {
      const res  = await fetch(`${GAS_URL}?type=attendance`);
      const json = await res.json();
      if (json.success && json.data) {
        const { employees: emps, records: recs } = json.data;
        if (emps) { setEmployees(emps); localStorage.setItem('att_employees', JSON.stringify(emps)); }
        if (recs) { setRecords(recs);   localStorage.setItem('att_records',   JSON.stringify(recs)); }
        toast('✅ Data loaded from Sheets!');
      } else {
        toast('⚠️ No data found in Sheets');
      }
    } catch {
      toast('❌ Fetch failed! Check connection.');
    } finally {
      setIsSyncing(false);
    }
  };

  // ── MANUAL SYNC ONLY ──
  // Removed automatic attendance sync and auto-load timers.
  // Attendance data will sync only when the user clicks the Sync button.

  useEffect(() => {
    // No automatic load from Sheets on mount.
  }, []);

  /* ── employee CRUD ── */
  const addEmployee = () => {
    const name = newName.trim();
    if (!name) return;
    if (employees.some(e => e.name.toLowerCase() === name.toLowerCase())) { toast('Already exists!'); return; }
    const emp = { id: String(Date.now()), name };
    setEmployees(prev => [...prev, emp]);
    setSelectedEmp(emp.id);
    setNewName(''); setShowAdd(false);
    toast(`✅ ${name} added`);
  };

  const removeEmployee = (id) => {
    if (!window.confirm('Remove this employee?')) return;
    setEmployees(prev => prev.filter(e => e.id !== id));
    setRecords(prev => {
      const n = {...prev};
      Object.keys(n).forEach(k => { if (k.startsWith(`${id}_`)) delete n[k]; });
      return n;
    });
    toast('Removed');
  };

  /* ── records ── */
  const rKey   = (empId, date) => `${empId}_${date}`;
  const getRec = (empId, date) => records[rKey(empId, date)] || {};

  const patchRec = (empId, date, data) => {
    setRecords(prev => ({
      ...prev,
      [rKey(empId, date)]: { ...prev[rKey(empId, date)], ...data }
    }));
  };

  const setStatus = (empId, date, status) => {
    const key = rKey(empId, date);
    // allow if today OR currently editing this row
    if (date !== todayStr() && editingKey !== key) {
      toast('⛔ Sirf aaj ki attendance mark ho sakti hai');
      return;
    }
    const rec    = getRec(empId, date);
    const timeIn = rec.timeIn || (status !== 'A' ? nowTime() : '');
    patchRec(empId, date, { status, timeIn });
    const emp = employees.find(e => e.id === empId);
    toast(`${emp?.name} → ${status === 'P' ? 'Present' : status === 'A' ? 'Absent' : 'Late'}`);
  };

  const startEdit = (empId, date) => setEditingKey(rKey(empId, date));
  const saveEdit  = () => { setEditingKey(null); toast('✅ Record updated!'); syncToSheets(); };

  /* ── summary for one employee ── */
  const getSummary = (empId, monthStr) => {
    let p=0, a=0, l=0;
    getDaysInMonth(monthStr).forEach(date => {
      const s = getRec(empId, date).status;
      if (s==='P') p++; else if (s==='A') a++; else if (s==='L') l++;
    });
    return {p, a, l};
  };

  /* ── months list ── */
  const allMonths = (() => {
    const set = new Set([monthOf(todayStr())]);
    Object.keys(records).forEach(k => {
      const d = k.split('_').slice(1).join('_');
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) set.add(monthOf(d));
    });
    return [...set].sort().reverse();
  })();

  /* ── which employees to show ── */
  const visibleEmps = selectedEmp
    ? employees.filter(e => e.id === selectedEmp)
    : employees;

  const filteredEmps = visibleEmps.filter((emp) =>
    emp.name.toLowerCase().includes(employeeSearch.trim().toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredEmps.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const paginatedEmps = filteredEmps.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  /* ── export CSV ── */
  const exportCSV = () => {
    const days = getDaysInMonth(viewMonth);
    const [y,m] = viewMonth.split('-').map(Number);
    const mName = new Date(y,m-1,1).toLocaleString('default',{month:'long',year:'numeric'});
    const rows = ['Vinsol Attendance - ' + mName, 'Date,Employee,Status,Time In,Time Out,Remark'];
    days.forEach(date => {
      filteredEmps.forEach(emp => {
        const rec = getRec(emp.id, date);
        if (rec.status) rows.push([
          fmtDate(date), emp.name,
          rec.status==='P'?'Present':rec.status==='A'?'Absent':'Late',
          rec.timeIn||'', rec.timeOut||'', rec.remark||''
        ].join(','));
      });
    });
    const blob = new Blob([rows.join('\n')], {type:'text/csv;charset=utf-8;'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Attendance_${viewMonth}${selectedEmp?'_'+filteredEmps[0]?.name:''}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
    toast('📊 Downloaded!');
  };

  /* ── print ── */
  const printReport = () => {
    const days = getDaysInMonth(viewMonth);
    const [y,m] = viewMonth.split('-').map(Number);
    const mName = new Date(y,m-1,1).toLocaleString('default',{month:'long',year:'numeric'});
    const weeks = getWeeks(days);

    const weekTables = weeks.map((wDays, wi) => {
      const rows = wDays.flatMap(date =>
        filteredEmps.map(emp => {
          const rec = getRec(emp.id, date);
          const wk  = isWeekend(date);
          const s   = rec.status || (wk ? 'OFF' : '-');
          const cls = s==='P'?'present':s==='A'?'absent':s==='L'?'late':s==='OFF'?'off':'';
          return `<tr>
            <td>${fmtDate(date)}${wk?'<span class="wt"> OFF</span>':''}</td>
            <td class="en">${emp.name}</td>
            <td class="${cls}">${s==='P'?'Present':s==='A'?'Absent':s==='L'?'Late':s}</td>
            <td>${rec.timeIn||'-'}</td><td>${rec.timeOut||'-'}</td><td>${rec.remark||'-'}</td>
          </tr>`;
        })
      ).join('');
      return `<div class="week-block">
        <div class="week-title">Week ${wi+1} &nbsp;·&nbsp; ${weekLabel(wDays)}</div>
        <table><thead><tr><th>Date</th><th>Employee</th><th>Status</th><th>Time In</th><th>Time Out</th><th>Remark</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;
    }).join('');

    const win = window.open('','_blank');
    if (!win) { toast('Allow popups'); return; }
    win.document.write(`<!DOCTYPE html><html><head><title>Attendance ${mName}</title>
<style>
  body{font-family:Arial,sans-serif;padding:20px;font-size:11px;color:#1e293b;}
  .hdr{display:flex;align-items:center;gap:14px;background:#1e3a5f;color:#fff;padding:14px 18px;border-radius:10px;margin-bottom:16px;}
  .hdr img{height:44px;background:#fff;padding:4px;border-radius:6px;}
  .hdr h1{font-size:17px;margin:0;} .hdr p{margin:3px 0 0;opacity:.8;font-size:11px;}
  .week-block{margin-bottom:24px;}
  .week-title{font-size:12px;font-weight:700;color:#1e3a5f;background:#f0f4ff;padding:7px 12px;border-radius:6px;margin-bottom:6px;border-left:4px solid #3173b4;}
  table{width:100%;border-collapse:collapse;}
  th{background:#1e3a5f;color:#fff;padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.4px;}
  td{padding:7px 10px;border-bottom:1px solid #e2e8f0;}
  tr:hover td{background:#f8fafc;}
  .en{font-weight:700;} .wt{color:#94a3b8;font-size:9px;}
  .present{color:#065f46;font-weight:700;} .absent{color:#991b1b;font-weight:700;}
  .late{color:#92400e;font-weight:700;} .off{color:#94a3b8;}
  .pbtn{margin-top:16px;padding:9px 22px;background:#1e3a5f;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;}
  @media print{.pbtn{display:none;} .week-block{page-break-inside:avoid;}}
</style></head><body>
<div class="hdr"><img src="${vinlogo}" alt="Vinsol"/><div>
  <h1>Vinsol Attendance Report</h1>
  <p>${mName}${selectedEmp?' · '+filteredEmps[0]?.name:''} &nbsp;|&nbsp; Office: 1:00 PM – 9:00 PM</p>
</div></div>
${weekTables}
<button class="pbtn" onclick="window.print()">🖨️ Print</button>
</body></html>`);
    win.document.close();
  };

  const today  = todayStr();
  const days   = getDaysInMonth(viewMonth);
  const weeks  = getWeeks(days);
  const weeksToRender = selectedWeek === 'all' ? weeks : (weeks[Number(selectedWeek)] ? [weeks[Number(selectedWeek)]] : []);
  const [vy,vm] = viewMonth.split('-').map(Number);
  const mName  = new Date(vy,vm-1,1).toLocaleString('default',{month:'long',year:'numeric'});

  return (
    <div className="att-wrap">
      {notif && <div className="att-toast">{notif}</div>}

      {/* HEADER */}
      <div className="att-head">
        <div className="att-head-left">
          <img src={vinlogo} alt="Vinsol" className="att-logo"/>
          <div>
            <h1>Attendance System</h1>
            <p>Office: 1:00 PM – 9:00 PM &nbsp;·&nbsp; Sat–Sun Off</p>
          </div>
        </div>
        <div className="att-clock">
          <span className="att-clock-time">
            {clock.toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
          </span>
          <span className="att-clock-date">
            {clock.toLocaleDateString('en-PK',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </span>
          {lastSync && <span className="att-last-sync">☁️ Synced: {lastSync}</span>}
        </div>
      </div>

      {/* CONTROLS */}
      <div className="att-controls">
        <div className="att-ctrl-left">
          {/* Month */}
          <select className="att-sel" value={viewMonth} onChange={e=>setViewMonth(e.target.value)}>
            {allMonths.map(mo => {
              const [y2,m2] = mo.split('-').map(Number);
              const lbl = new Date(y2,m2-1,1).toLocaleString('default',{month:'long',year:'numeric'});
              return <option key={mo} value={mo}>{lbl}{mo===monthOf(today)?' (Current)':''}</option>;
            })}
          </select>

          {/* Employee dropdown */}
          <select className="att-sel emp-sel" value={selectedEmp} onChange={e=>setSelectedEmp(e.target.value)}>
            <option value="">👥 All Employees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>👤 {emp.name}</option>
            ))}
          </select>

          <input
            className="att-sel att-search"
            type="text"
            placeholder="🔍 Search employee"
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
          />

          <button className="att-btn green" onClick={()=>{setShowAdd(true);setTimeout(()=>inputRef.current?.focus(),50);}}>
            ➕ Add Employee
          </button>
        </div>
        <div className="att-ctrl-right">
          <button className="att-btn teal" onClick={fetchFromSheets} disabled={isSyncing} title="Load data from Google Sheets">
            {isSyncing ? '⏳' : '📥'} Load Sheet
          </button>
          <button className="att-btn orange" onClick={syncToSheets} disabled={isSyncing} title="Save to Google Sheets">
            {isSyncing ? '⏳' : '☁️'} {isSyncing ? 'Syncing...' : 'Sync Sheet'}
          </button>
          <button className="att-btn blue"   onClick={exportCSV}>📊 Export Excel</button>
          <button className="att-btn purple" onClick={printReport}>🖨️ Print Report</button>
          <select className="att-sel" value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}>
            <option value="all">📅 All Weeks</option>
            {weeks.map((w, idx) => (
              <option key={idx} value={String(idx)}>{`Week ${idx + 1} • ${weekLabel(w)}`}</option>
            ))}
          </select>
          <select className="att-sel" value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))}>
            <option value={8}>8 Employees</option>
            <option value={12}>12 Employees</option>
            <option value={20}>20 Employees</option>
            <option value={40}>40 Employees</option>
          </select>
        </div>
      </div>

      {filteredEmps.length > 0 && (
        <div className="att-data-meta">
          <span>{`Showing ${paginatedEmps.length} of ${filteredEmps.length} employees`}</span>
          <div className="att-pager">
            <button className="att-page-btn" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>◀ Prev</button>
            <span>{`Page ${currentPage} / ${totalPages}`}</span>
            <button className="att-page-btn" disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next ▶</button>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {showAdd && (
        <div className="att-overlay" onClick={()=>setShowAdd(false)}>
          <div className="att-modal" onClick={e=>e.stopPropagation()}>
            <h3>Add Employee</h3>
            <input ref={inputRef} type="text" placeholder="Full name" value={newName}
              onChange={e=>setNewName(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&addEmployee()}/>
            <div className="att-modal-row">
              <button className="att-btn green" onClick={addEmployee}>Add</button>
              <button className="att-btn gray"  onClick={()=>setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* EMPTY */}
      {employees.length === 0 && (
        <div className="att-empty">
          <div className="att-empty-icon">👥</div>
          <h3>No employees yet</h3>
          <p>Add employees to start marking attendance</p>
          <button className="att-btn green" onClick={()=>{setShowAdd(true);setTimeout(()=>inputRef.current?.focus(),50);}}>
            ➕ Add First Employee
          </button>
        </div>
      )}

      {/* SUMMARY CARDS — show for selected or all */}
      {paginatedEmps.length > 0 && (
        <div className="att-sum-row">
          {paginatedEmps.map(emp => {
            const s = getSummary(emp.id, viewMonth);
            return (
              <div key={emp.id} className="att-sum-card">
                <span className="att-sum-name">{emp.name}</span>
                <div className="att-sum-stats">
                  <span className="s-p">✅ {s.p} Present</span>
                  <span className="s-a">❌ {s.a} Absent</span>
                  <span className="s-l">⏰ {s.l} Late</span>
                </div>
                <button className="sum-del" onClick={()=>removeEmployee(emp.id)} title="Remove">🗑️</button>
              </div>
            );
          })}
        </div>
      )}

      {filteredEmps.length === 0 && employees.length > 0 && (
        <div className="att-empty">
          <div className="att-empty-icon">🔎</div>
          <h3>No matching employees</h3>
          <p>Try another search term or clear employee filter</p>
        </div>
      )}

      {/* WEEKLY TABLES */}
      {paginatedEmps.length > 0 && weeksToRender.map((weekDays, wi) => (
        <div key={wi} className="att-week-block">
          <div className="att-week-title">
            <span className="week-num">{selectedWeek === 'all' ? `Week ${wi + 1}` : `Week ${Number(selectedWeek) + 1}`}</span>
            <span className="week-range">{weekLabel(weekDays)}</span>
          </div>
          <div className="att-scroll">
            <table className="att-tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>Status</th>
                  <th>Time In</th>
                  <th>Time Out</th>
                  <th>Remark</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {weekDays.map(date => {
                  const wk        = isWeekend(date);
                  const isFuture  = date > today;
                  const isPast    = date < today;
                  const isToday   = date === today;
                  return paginatedEmps.map(emp => {
                    const rec       = getRec(emp.id, date);
                    const s         = rec.status || '';
                    const late      = s === 'P' && rec.timeIn > OFFICE_START;
                    const key       = rKey(emp.id, date);
                    const isEditing = editingKey === key;
                    // editable if today OR in edit mode
                    const canEdit   = isToday || isEditing;
                    const locked    = !canEdit;

                    let rowCls = 'att-row';
                    if (isToday)             rowCls += ' row-today';
                    if (isFuture)            rowCls += ' row-future';
                    if (isPast && !s && !wk) rowCls += ' row-unmarked';
                    if (wk && !s)            rowCls += ' row-wk';
                    if (isEditing)           rowCls += ' row-editing';
                    if (s === 'P')           rowCls += late ? ' row-late' : ' row-present';
                    if (s === 'A')           rowCls += ' row-absent';
                    if (s === 'L')           rowCls += ' row-late';

                    return (
                      <tr key={key} className={rowCls}>
                        {/* Date */}
                        <td className="td-date">
                          {fmtDate(date)}
                          {isToday   && <span className="today-dot"> ●</span>}
                          {wk        && <span className="wk-tag">OFF</span>}
                          {isEditing && <span className="edit-tag">✏️</span>}
                        </td>

                        {/* Employee */}
                        <td className="td-name">{emp.name}</td>

                        {/* Status */}
                        <td className="td-status">
                          {isFuture || (wk && !s && !canEdit) ? (
                            <span className="td-dash">—</span>
                          ) : canEdit ? (
                            <div className="status-btns">
                              <button className={`sb sb-p${s==='P'?' active':''}`} onClick={()=>setStatus(emp.id,date,'P')}>P</button>
                              <button className={`sb sb-a${s==='A'?' active':''}`} onClick={()=>setStatus(emp.id,date,'A')}>A</button>
                              <button className={`sb sb-l${s==='L'?' active':''}`} onClick={()=>setStatus(emp.id,date,'L')}>L</button>
                            </div>
                          ) : s ? (
                            <span className={`status-badge ${s==='P'?(late?'badge-late':'badge-p'):s==='A'?'badge-a':'badge-l'}`}>
                              {s==='P'?(late?'Late':'Present'):s==='A'?'Absent':'Late'}
                            </span>
                          ) : <span className="td-dash">—</span>}
                        </td>

                        {/* Time In */}
                        <td className="td-time">
                          {canEdit && (s==='P'||s==='L') ? (
                            <input type="time"
                              className={`time-inp${rec.timeIn>OFFICE_START?' late':''}`}
                              value={rec.timeIn||''}
                              onChange={e=>patchRec(emp.id,date,{timeIn:e.target.value})}/>
                          ) : (s==='P'||s==='L') ? (
                            <span className={`time-txt${rec.timeIn>OFFICE_START?' late-txt':''}`}>{rec.timeIn||'—'}</span>
                          ) : <span className="td-dash">—</span>}
                        </td>

                        {/* Time Out */}
                        <td className="td-time">
                          {canEdit && (s==='P'||s==='L') ? (
                            <input type="time" className="time-inp"
                              value={rec.timeOut||''}
                              onChange={e=>patchRec(emp.id,date,{timeOut:e.target.value})}/>
                          ) : (s==='P'||s==='L') ? (
                            <span className="time-txt">{rec.timeOut||'—'}</span>
                          ) : <span className="td-dash">—</span>}
                        </td>

                        {/* Remark */}
                        <td className="td-remark">
                          {canEdit ? (
                            <input type="text" className="remark-inp"
                              value={rec.remark||''}
                              onChange={e=>patchRec(emp.id,date,{remark:e.target.value})}
                              placeholder="Add remark..."/>
                          ) : rec.remark ? (
                            <span className="remark-txt">{rec.remark}</span>
                          ) : <span className="td-dash">—</span>}
                        </td>

                        {/* Edit / Save button */}
                        <td className="td-action">
                          {!isFuture && (
                            isEditing ? (
                              <button className="edit-save-btn save" onClick={saveEdit} title="Save changes">✔</button>
                            ) : isPast ? (
                              <button className="edit-save-btn edit" onClick={()=>startEdit(emp.id,date)} title="Edit record">✏️</button>
                            ) : null
                          )}
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Attendance;
