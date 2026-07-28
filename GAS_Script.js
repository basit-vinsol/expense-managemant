/**
 * Google Apps Script - Vinsol Expense System
 * Version: 3.7.0 - DEPLOYMENT FIXED
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.type === 'attendance') {
      writeAttendance(ss, data);
      return ok('Attendance saved');
    }

    if (data.totals) {
      writeExpenses(ss, data);
      return ok('Expenses saved with images!');
    }

    return fail('Unknown data type');

  } catch (err) {
    return fail(err.message);
  }
}

function doGet(e) {
  try {
    var type = e.parameter.type;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

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

// ============================================================
// EXPENSE WRITE (WITH AUTO SHEET CREATION)
// ============================================================
function writeExpenses(ss, data) {
  // ── CREATE/UPDATE SUMMARY SHEET ──
  var summarySheet = createOrGetSheet(ss, 'Summary', ['Total Funds Added', 'Total Expenses', 'Current Balance', 'Last Updated']);
  summarySheet.clear();
  summarySheet.appendRow(['Total Funds Added', 'Total Expenses', 'Current Balance', 'Last Updated']);
  summarySheet.appendRow([
    data.totals.totalFundsAdded || 0,
    data.totals.totalExpenses || 0,
    data.totals.currentBalance || 0,
    new Date().toLocaleString()
  ]);

  // ── CREATE/UPDATE EXPENSES SHEET WITH IMAGE COLUMN ──
  var expenseSheet = createOrGetSheet(ss, 'Expenses', ['ID', 'Date', 'Description', 'Category', 'Amount', 'Expense Type', 'ImageBase64', 'Notes']);
  expenseSheet.clear();
  expenseSheet.appendRow(['ID', 'Date', 'Description', 'Category', 'Amount', 'Expense Type', 'ImageBase64', 'Notes']);
  
  if (data.expenses && data.expenses.length > 0) {
    var expRows = [];
    var imageCount = 0;
    for (var i = 0; i < data.expenses.length; i++) {
      var e = data.expenses[i];
      var imageData = e.imageBase64 || '';
      if (imageData && imageData.length > 100) imageCount++;
      
      expRows.push([
        String(e.id || Date.now() + i),
        normalizeDateValue(e.date),
        String(e.description || ''),
        String(e.category || 'Other'),
        Number(e.amount) || 0,
        String(e.expenseType || 'regular'),
        imageData,  // ← IMAGE COLUMN
        String(e.notes || '')
      ]);
    }
    if (expRows.length > 0) {
      expenseSheet.getRange(2, 1, expRows.length, 8).setValues(expRows);
    }
  }

  // ── CREATE/UPDATE TRANSACTIONS SHEET WITH IMAGE COLUMN ──
  var historySheet = createOrGetSheet(ss, 'Transactions', ['ID', 'Date', 'Description', 'Amount', 'Type', 'Running Total', 'Category', 'Expense Type', 'ImageBase64']);
  historySheet.clear();
  historySheet.appendRow(['ID', 'Date', 'Description', 'Amount', 'Type', 'Running Total', 'Category', 'Expense Type', 'ImageBase64']);
  
  if (data.fundHistory && data.fundHistory.length > 0) {
    var histRows = [];
    for (var j = 0; j < data.fundHistory.length; j++) {
      var h = data.fundHistory[j];
      histRows.push([
        String(h.id || Date.now() + j),
        normalizeDateTimeValue(h.date),
        String(h.description || ''),
        Number(h.amount) || 0,
        String(h.type || 'credit'),
        Number(h.runningTotal) || 0,
        String(h.category || ''),
        String(h.expenseType || 'regular'),
        h.imageBase64 || ''  // ← IMAGE COLUMN
      ]);
    }
    if (histRows.length > 0) {
      historySheet.getRange(2, 1, histRows.length, 9).setValues(histRows);
    }
  }
}

// ============================================================
// HELPER: CREATE OR GET SHEET WITH HEADERS
// ============================================================
function createOrGetSheet(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  
  // If sheet exists, delete it and recreate
  if (sheet) {
    ss.deleteSheet(sheet);
  }
  
  // Create new sheet
  sheet = ss.insertSheet(sheetName);
  sheet.appendRow(headers);
  
  return sheet;
}

// ============================================================
// EXPENSE READ
// ============================================================
function readExpenses(ss) {
  var summary = {
    totalFundsAdded: 0,
    totalExpenses: 0,
    currentBalance: 0,
    lastUpdated: ''
  };
  
  var summarySheet = ss.getSheetByName('Summary');
  if (summarySheet && summarySheet.getLastRow() > 1) {
    var summaryValues = summarySheet.getRange(2, 1, 1, 4).getValues()[0];
    summary = {
      totalFundsAdded: Number(summaryValues[0]) || 0,
      totalExpenses: Number(summaryValues[1]) || 0,
      currentBalance: Number(summaryValues[2]) || 0,
      lastUpdated: String(summaryValues[3] || '')
    };
  }

  // ── Read Expenses ──
  var expenses = [];
  var expenseSheet = ss.getSheetByName('Expenses');
  if (expenseSheet && expenseSheet.getLastRow() > 1) {
    var expenseData = expenseSheet.getRange(2, 1, expenseSheet.getLastRow() - 1, 8).getValues();
    for (var i = 0; i < expenseData.length; i++) {
      var r = expenseData[i];
      if (r[1]) {
        expenses.push({
          id: String(r[0] || Date.now() + i),
          date: normalizeDateValue(r[1]),
          description: String(r[2] || ''),
          category: String(r[3] || 'Other'),
          amount: Number(r[4]) || 0,
          expenseType: String(r[5] || 'regular'),
          imageBase64: String(r[6] || ''),  // ← IMAGE COLUMN
          notes: String(r[7] || '')
        });
      }
    }
  }

  // ── Read Transactions ──
  var fundHistory = [];
  var historySheet = ss.getSheetByName('Transactions');
  if (historySheet && historySheet.getLastRow() > 1) {
    var historyData = historySheet.getRange(2, 1, historySheet.getLastRow() - 1, 9).getValues();
    for (var j = 0; j < historyData.length; j++) {
      var r = historyData[j];
      if (r[1]) {
        fundHistory.push({
          id: String(r[0] || Date.now() + j),
          date: normalizeDateTimeValue(r[1]),
          description: String(r[2] || ''),
          amount: Number(r[3]) || 0,
          type: String(r[4] || 'credit'),
          runningTotal: Number(r[5]) || 0,
          category: String(r[6] || ''),
          expenseType: String(r[7] || 'regular'),
          imageBase64: String(r[8] || '')  // ← IMAGE COLUMN
        });
      }
    }
  }

  return {
    summary: summary,
    expenses: expenses,
    fundHistory: fundHistory
  };
}

// ============================================================
// ATTENDANCE FUNCTIONS
// ============================================================
function writeAttendance(ss, data) {
  var empSheet = ss.getSheetByName('Att_Employees') || ss.insertSheet('Att_Employees');
  empSheet.clear();
  empSheet.appendRow(['ID', 'Name', 'Added At']);
  if (data.employees && data.employees.length > 0) {
    var empRows = [];
    for (var i = 0; i < data.employees.length; i++) {
      var e = data.employees[i];
      empRows.push([e.id, e.name, e.addedAt || '']);
    }
    empSheet.getRange(2, 1, empRows.length, 3).setValues(empRows);
  }

  var recSheet = ss.getSheetByName('Att_Records') || ss.insertSheet('Att_Records');
  recSheet.clear();
  recSheet.appendRow(['Key', 'Employee ID', 'Date', 'Status', 'Time In', 'Time Out', 'Remark']);
  if (data.records) {
    var recKeys = Object.keys(data.records);
    if (recKeys.length > 0) {
      var recRows = [];
      for (var j = 0; j < recKeys.length; j++) {
        var key = recKeys[j];
        var r = data.records[key];
        recRows.push([key, r.empId || '', r.date || '', r.status || '', r.timeIn || '', r.timeOut || '', r.remark || '']);
      }
      recSheet.getRange(2, 1, recRows.length, 7).setValues(recRows);
    }
  }
}

function readAttendance(ss) {
  var employees = [];
  var empSheet = ss.getSheetByName('Att_Employees');
  if (empSheet && empSheet.getLastRow() > 1) {
    var empData = empSheet.getRange(2, 1, empSheet.getLastRow() - 1, 3).getValues();
    for (var i = 0; i < empData.length; i++) {
      var r = empData[i];
      if (r[0]) {
        employees.push({ id: String(r[0]), name: String(r[1] || ''), addedAt: String(r[2] || '') });
      }
    }
  }

  var records = {};
  var recSheet = ss.getSheetByName('Att_Records');
  if (recSheet && recSheet.getLastRow() > 1) {
    var recData = recSheet.getRange(2, 1, recSheet.getLastRow() - 1, 7).getValues();
    for (var j = 0; j < recData.length; j++) {
      var r = recData[j];
      if (r[0]) {
        records[String(r[0])] = {
          empId: String(r[1] || ''),
          date: String(r[2] || ''),
          status: String(r[3] || ''),
          timeIn: String(r[4] || ''),
          timeOut: String(r[5] || ''),
          remark: String(r[6] || '')
        };
      }
    }
  }

  return { employees: employees, records: records };
}

// ============================================================
// HELPERS
// ============================================================
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