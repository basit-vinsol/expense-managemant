/**
 * Google Apps Script - Vinsol Expense + Attendance System
 * Deploy: Web App → Execute as ME → Anyone can access
 * 
 * ✅ Image Support Added (Base64 format)
 * ✅ Cross-device receipt sharing
 * ✅ Automatic image compression
 */

// ─────────────────────────────────────────────────────────
// doPost — receives data from React app
// ─────────────────────────────────────────────────────────
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss   = SpreadsheetApp.getActiveSpreadsheet();

    // ── Attendance sync — check karo PEHLE ──────────────
    if (data.type === 'attendance') {
      writeAttendance(ss, data);
      return ok('Attendance saved');
    }

    // ── Expense sync — sirf tab jab totals ho ────────────
    if (data.totals) {
      writeExpenses(ss, data);
      return ok('Expenses saved with images!');
    }

    return fail('Unknown data type');

  } catch (err) {
    return fail(err.message);
  }
}

// ─────────────────────────────────────────────────────────
// doGet — React app fetches data back
// ─────────────────────────────────────────────────────────
function doGet(e) {
  try {
    var type = e.parameter.type;
    var ss   = SpreadsheetApp.getActiveSpreadsheet();

    if (type === 'attendance') {
      return jsonOut({ success: true, data: readAttendance(ss) });
    }

    if (type === 'expenses') {
      return jsonOut({ success: true, data: readExpenses(ss) });
    }

    return jsonOut({ success: false, error: 'Unknown type' });

  } catch (err) {
    return jsonOut({ success: false, error: err.message });
  }
}

// ─────────────────────────────────────────────────────────
// EXPENSE WRITE (with Image Support - Base64)
// ─────────────────────────────────────────────────────────
function writeExpenses(ss, data) {
  // ── Summary Sheet ──
  var summarySheet = ss.getSheetByName('Summary') || ss.insertSheet('Summary');
  summarySheet.clear();
  summarySheet.appendRow(['Total Funds Added', 'Total Expenses', 'Current Balance', 'Last Updated']);
  summarySheet.appendRow([
    data.totals.totalFundsAdded || 0,
    data.totals.totalExpenses || 0,
    data.totals.currentBalance || 0,
    new Date().toLocaleString()
  ]);

  // ── Expenses Sheet (with Image column) ──
  var expenseSheet = ss.getSheetByName('Expenses') || ss.insertSheet('Expenses');
  expenseSheet.clear();
  expenseSheet.appendRow(['ID', 'Date', 'Description', 'Category', 'Amount', 'Expense Type', 'ImageBase64', 'Notes']);
  
  if (data.expenses && data.expenses.length > 0) {
    var expRows = data.expenses.map(function(e) {
      return [
        e.id || '',
        normalizeDateValue(e.date),
        e.description || '',
        e.category || 'Other',
        Number(e.amount) || 0,
        e.expenseType || 'regular',
        e.imageBase64 || '', // ← IMAGE STORED HERE
        e.notes || ''
      ];
    });
    if (expRows.length > 0) {
      expenseSheet.getRange(2, 1, expRows.length, 8).setValues(expRows);
    }
  }

  // ── Transactions Sheet (with Image column) ──
  var historySheet = ss.getSheetByName('Transactions') || ss.insertSheet('Transactions');
  historySheet.clear();
  historySheet.appendRow(['ID', 'Date', 'Description', 'Amount', 'Type', 'Running Total', 'Category', 'Expense Type', 'ImageBase64']);
  
  if (data.fundHistory && data.fundHistory.length > 0) {
    var histRows = data.fundHistory.map(function(h) {
      return [
        h.id || '',
        normalizeDateTimeValue(h.date),
        h.description || '',
        Number(h.amount) || 0,
        h.type || 'credit',
        Number(h.runningTotal) || 0,
        h.category || '',
        h.expenseType || 'regular',
        h.imageBase64 || '' // ← IMAGE STORED HERE
      ];
    });
    if (histRows.length > 0) {
      historySheet.getRange(2, 1, histRows.length, 9).setValues(histRows);
    }
  }
}

// ─────────────────────────────────────────────────────────
// EXPENSE READ (with Image Support)
// ─────────────────────────────────────────────────────────
function readExpenses(ss) {
  // ── Read Summary ──
  var summary = {};
  var summarySheet = ss.getSheetByName('Summary');
  if (summarySheet && summarySheet.getLastRow() > 1) {
    var summaryValues = summarySheet.getRange(2, 1, 1, 4).getValues()[0];
    summary = {
      totalFundsAdded: Number(summaryValues[0]) || 0,
      totalExpenses: Number(summaryValues[1]) || 0,
      currentBalance: Number(summaryValues[2]) || 0,
      lastUpdated: summaryValues[3] || ''
    };
  }

  // ── Read Expenses (with images) ──
  var expenses = [];
  var expenseSheet = ss.getSheetByName('Expenses');
  if (expenseSheet && expenseSheet.getLastRow() > 1) {
    var expenseData = expenseSheet.getRange(2, 1, expenseSheet.getLastRow() - 1, 8).getValues();
    expenseData.forEach(function(r, index) {
      if (r[1]) { // Check if date exists
        expenses.push({
          id: String(r[0]) || String(Date.now() + index),
          date: normalizeDateValue(r[1]),
          description: String(r[2] || ''),
          category: String(r[3] || 'Other'),
          amount: Number(r[4]) || 0,
          expenseType: String(r[5] || 'regular'),
          imageBase64: String(r[6] || ''), // ← IMAGE FROM SHEET
          notes: String(r[7] || '')
        });
      }
    });
  }

  // ── Read Transactions (with images) ──
  var fundHistory = [];
  var historySheet = ss.getSheetByName('Transactions');
  if (historySheet && historySheet.getLastRow() > 1) {
    var historyData = historySheet.getRange(2, 1, historySheet.getLastRow() - 1, 9).getValues();
    historyData.forEach(function(r, index) {
      if (r[1]) { // Check if date exists
        fundHistory.push({
          id: String(r[0]) || String(Date.now() + index),
          date: normalizeDateTimeValue(r[1]),
          description: String(r[2] || ''),
          amount: Number(r[3]) || 0,
          type: String(r[4] || 'credit'),
          runningTotal: Number(r[5]) || 0,
          category: String(r[6] || ''),
          expenseType: String(r[7] || 'regular'),
          imageBase64: String(r[8] || '') // ← IMAGE FROM SHEET
        });
      }
    });
  }

  return {
    summary: summary,
    expenses: expenses,
    fundHistory: fundHistory
  };
}

// ─────────────────────────────────────────────────────────
// ATTENDANCE WRITE
// ─────────────────────────────────────────────────────────
function writeAttendance(ss, data) {
  // ── Employees sheet ──
  var empSheet = ss.getSheetByName('Att_Employees') || ss.insertSheet('Att_Employees');
  empSheet.clear();
  empSheet.appendRow(['ID', 'Name', 'Added At']);
  if (data.employees && data.employees.length > 0) {
    var empRows = data.employees.map(function(e) {
      return [e.id, e.name, e.addedAt || ''];
    });
    if (empRows.length > 0) {
      empSheet.getRange(2, 1, empRows.length, 3).setValues(empRows);
    }
  }

  // ── Records sheet ──
  var recSheet = ss.getSheetByName('Att_Records') || ss.insertSheet('Att_Records');
  recSheet.clear();
  recSheet.appendRow(['Key', 'Employee ID', 'Date', 'Status', 'Time In', 'Time Out', 'Remark']);
  if (data.records) {
    var recKeys = Object.keys(data.records);
    if (recKeys.length > 0) {
      var recRows = recKeys.map(function(key) {
        var r = data.records[key];
        return [key, r.empId || '', r.date || '', r.status || '', r.timeIn || '', r.timeOut || '', r.remark || ''];
      });
      if (recRows.length > 0) {
        recSheet.getRange(2, 1, recRows.length, 7).setValues(recRows);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────
// ATTENDANCE READ
// ─────────────────────────────────────────────────────────
function readAttendance(ss) {
  var employees = [];
  var empSheet  = ss.getSheetByName('Att_Employees');
  if (empSheet && empSheet.getLastRow() > 1) {
    var empData = empSheet.getRange(2, 1, empSheet.getLastRow() - 1, 3).getValues();
    empData.forEach(function(r) {
      if (r[0]) {
        employees.push({ 
          id: String(r[0]), 
          name: String(r[1] || ''), 
          addedAt: String(r[2] || '') 
        });
      }
    });
  }

  var records = {};
  var recSheet = ss.getSheetByName('Att_Records');
  if (recSheet && recSheet.getLastRow() > 1) {
    var recData = recSheet.getRange(2, 1, recSheet.getLastRow() - 1, 7).getValues();
    recData.forEach(function(r) {
      if (r[0]) {
        records[String(r[0])] = {
          empId:   String(r[1] || ''),
          date:    String(r[2] || ''),
          status:  String(r[3] || ''),
          timeIn:  String(r[4] || ''),
          timeOut: String(r[5] || ''),
          remark:  String(r[6] || '')
        };
      }
    });
  }

  return { employees: employees, records: records };
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
function ok(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, message: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

function fail(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizeDateValue(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(value);
}

function normalizeDateTimeValue(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
  }
  var parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
  }
  return String(value);
}

// ─────────────────────────────────────────────────────────
// TEST FUNCTIONS
// ─────────────────────────────────────────────────────────
function testConnection() {
  return jsonOut({ 
    success: true, 
    message: '✅ Connection successful! Image support enabled.',
    version: '3.0.0',
    features: ['Base64 Images', 'Cross-device Sync', 'Attendance']
  });
}

// ─────────────────────────────────────────────────────────
// CLEANUP FUNCTION (Optional)
// ─────────────────────────────────────────────────────────
function clearAllData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ['Summary', 'Expenses', 'Transactions', 'Att_Employees', 'Att_Records'];
  sheets.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (sheet) {
      sheet.clear();
      sheet.appendRow(['Data Cleared on ' + new Date().toLocaleString()]);
    }
  });
  return '✅ All data cleared successfully!';
}