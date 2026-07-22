/**
 * Google Apps Script - Vinsol Expense + Attendance System
 * Deploy: Web App → Execute as ME → Anyone can access
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
      return ok('Expenses saved');
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
// EXPENSE WRITE  (your original logic, preserved)
// ─────────────────────────────────────────────────────────
function writeExpenses(ss, data) {
  // Summary
  var summarySheet = ss.getSheetByName('Summary') || ss.insertSheet('Summary');
  summarySheet.clear();
  summarySheet.appendRow(['Total Funds Added', 'Total Expenses', 'Current Balance', 'Last Updated']);
  summarySheet.appendRow([
    data.totals.totalFundsAdded,
    data.totals.totalExpenses,
    data.totals.currentBalance,
    new Date().toLocaleString()
  ]);

  // Expenses
  var expenseSheet = ss.getSheetByName('Expenses') || ss.insertSheet('Expenses');
  expenseSheet.clear();
  expenseSheet.appendRow(['Date', 'Description', 'Category', 'Amount']);
  if (data.expenses && data.expenses.length > 0) {
    var expRows = data.expenses.map(function(e) {
      return [normalizeDateValue(e.date), e.description, e.category, e.amount];
    });
    expenseSheet.getRange(2, 1, expRows.length, 4).setValues(expRows);
  }

  // Transactions
  var historySheet = ss.getSheetByName('Transactions') || ss.insertSheet('Transactions');
  historySheet.clear();
  historySheet.appendRow(['Date', 'Description', 'Amount', 'Type', 'Running Total']);
  if (data.fundHistory && data.fundHistory.length > 0) {
    var histRows = data.fundHistory.map(function(h) {
      return [normalizeDateTimeValue(h.date), h.description, h.amount, h.type, h.runningTotal];
    });
    historySheet.getRange(2, 1, histRows.length, 5).setValues(histRows);
  }
}

// ─────────────────────────────────────────────────────────
// EXPENSE READ
// ─────────────────────────────────────────────────────────
function readExpenses(ss) {
  var summary = {};
  var summarySheet = ss.getSheetByName('Summary');
  if (summarySheet && summarySheet.getLastRow() > 1) {
    var summaryValues = summarySheet.getRange(2, 1, 1, 4).getValues()[0];
    summary = {
      totalFundsAdded: summaryValues[0],
      totalExpenses: summaryValues[1],
      currentBalance: summaryValues[2],
      lastUpdated: summaryValues[3]
    };
  }

  var expenses = [];
  var expenseSheet = ss.getSheetByName('Expenses');
  if (expenseSheet && expenseSheet.getLastRow() > 1) {
    var expenseData = expenseSheet.getRange(2, 1, expenseSheet.getLastRow() - 1, 4).getValues();
    expenseData.forEach(function(r, index) {
      if (r[1]) {
        expenses.push({
          id: String(Date.now() + index),
          date: normalizeDateValue(r[0]),
          description: r[1],
          category: r[2],
          amount: Number(r[3]) || 0
        });
      }
    });
  }

  var fundHistory = [];
  var historySheet = ss.getSheetByName('Transactions');
  if (historySheet && historySheet.getLastRow() > 1) {
    var historyData = historySheet.getRange(2, 1, historySheet.getLastRow() - 1, 5).getValues();
    historyData.forEach(function(r, index) {
      if (r[1]) {
        fundHistory.push({
          id: String(Date.now() + index),
          date: normalizeDateTimeValue(r[0]),
          description: r[1],
          amount: Number(r[2]) || 0,
          type: r[3],
          runningTotal: Number(r[4]) || 0
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
  // Employees sheet
  var empSheet = ss.getSheetByName('Att_Employees') || ss.insertSheet('Att_Employees');
  empSheet.clear();
  empSheet.appendRow(['ID', 'Name', 'Added At']);
  if (data.employees && data.employees.length > 0) {
    var empRows = data.employees.map(function(e) {
      return [e.id, e.name, e.addedAt || ''];
    });
    empSheet.getRange(2, 1, empRows.length, 3).setValues(empRows);
  }

  // Records sheet — one row per attendance record
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
      recSheet.getRange(2, 1, recRows.length, 7).setValues(recRows);
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
      if (r[0]) employees.push({ id: String(r[0]), name: r[1], addedAt: r[2] });
    });
  }

  var records  = {};
  var recSheet = ss.getSheetByName('Att_Records');
  if (recSheet && recSheet.getLastRow() > 1) {
    var recData = recSheet.getRange(2, 1, recSheet.getLastRow() - 1, 7).getValues();
    recData.forEach(function(r) {
      if (r[0]) {
        records[String(r[0])] = {
          empId:   String(r[1]),
          date:    r[2],
          status:  r[3],
          timeIn:  r[4],
          timeOut: r[5],
          remark:  r[6]
        };
      }
    });
  }

  return { employees: employees, records: records };
}

// ─────────────────────────────────────────────────────────
// Helpers
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
