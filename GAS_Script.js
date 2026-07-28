/**
 * Google Apps Script - Vinsol Expense System
 * Version: 5.0.0 - DRIVE IMAGE STORAGE + TRUE APPEND
 *
 * WHY DRIVE?
 *   Google Sheets cells have a ~50,000 character limit.
 *   A compressed base64 JPEG is ~300,000+ chars — it gets silently truncated.
 *   Solution: save the image as a file in Google Drive, store only the public
 *   URL in the sheet. On fetch, the app receives a normal https:// URL it can
 *   display with <img src="...">.
 *
 * Sheet layout:
 *   Summary       → row 1: headers, row 2: totals (always overwritten)
 *   Expenses      → row 1: headers, rows 2+: one row per expense (append)
 *   Transactions  → row 1: headers, rows 2+: one row per transaction (append)
 *   Att_Employees → row 1: headers, rows 2+: employees (full replace)
 *   Att_Records   → row 1: headers, rows 2+: records (full replace)
 *
 * Drive folder: "VinsolExpenseImages" (auto-created if missing)
 */

// ============================================================
// CONFIG
// ============================================================
var DRIVE_FOLDER_NAME = 'VinsolExpenseImages';

// ============================================================
// ENTRY POINTS
// ============================================================

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.type === 'attendance') {
      writeAttendance(ss, data);
      return ok('Attendance saved');
    }

    if (data.action === 'append' && data.totals) {
      appendExpenses(ss, data);
      return ok('Data appended!');
    }

    if (data.action === 'replace' && data.totals) {
      replaceExpenses(ss, data);
      return ok('Data replaced!');
    }

    return fail('Unknown data type or missing action');

  } catch (err) {
    return fail('doPost error: ' + err.message + ' | stack: ' + err.stack);
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

    return jsonOut({ success: false, error: 'Unknown type. Use ?type=expenses or ?type=attendance' });

  } catch (err) {
    return jsonOut({ success: false, error: 'doGet error: ' + err.message });
  }
}

// ============================================================
// DRIVE IMAGE HELPERS
// ============================================================

/** Get or create the Drive folder used for receipt images. */
function getImageFolder() {
  var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  var folder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
  return folder;
}

/**
 * Save a base64 data-URL to Drive, make it publicly readable,
 * and return the direct-view URL.
 * Returns '' if base64 is empty/falsy.
 */
function saveBase64ToDrive(base64DataUrl, filename) {
  if (!base64DataUrl || base64DataUrl.length < 100) return '';

  try {
    // Strip the data:image/jpeg;base64, prefix
    var matches = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return '';

    var mimeType = matches[1];          // e.g. "image/jpeg"
    var base64Data = matches[2];
    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, filename);

    var folder = getImageFolder();
    var file = folder.createFile(blob);

    // Make publicly readable (anyone with link can view)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Return a direct-view URL that browsers / <img> tags can load
    var fileId = file.getId();
    return 'https://drive.google.com/uc?export=view&id=' + fileId;

  } catch (err) {
    Logger.log('saveBase64ToDrive error: ' + err.message);
    return '';
  }
}

/**
 * Check if the value already looks like a Drive URL (already uploaded).
 * If so, return it unchanged. Otherwise treat it as base64 and upload.
 */
function ensureImageUrl(value, filename) {
  if (!value || value.length < 10) return '';
  if (value.indexOf('http') === 0) return value; // already a URL
  return saveBase64ToDrive(value, filename);
}

// ============================================================
// EXPENSE WRITE — TRUE APPEND
// ============================================================
function appendExpenses(ss, data) {

  // ── SUMMARY SHEET ──
  var summarySheet = getOrCreateSheet(ss, 'Summary', [
    'Total Funds Added', 'Total Expenses', 'Current Balance',
    'Regular Expenses', 'One-Time Expenses', 'Bills', 'Usage %', 'Last Updated'
  ]);
  clearDataRows(summarySheet);
  summarySheet.appendRow([
    data.totals.totalFundsAdded      || 0,
    data.totals.totalExpenses        || 0,
    data.totals.currentBalance       || 0,
    data.totals.regularExpensesTotal || 0,
    data.totals.oneTimeExpensesTotal || 0,
    data.totals.billsTotal           || 0,
    data.totals.usedPercentage       || 0,
    new Date().toLocaleString()
  ]);

  // ── EXPENSES SHEET ──
  var expenseSheet = getOrCreateSheet(ss, 'Expenses', [
    'ID', 'Date', 'Description', 'Category', 'Amount',
    'Expense Type', 'Notes', 'Image URL', 'Synced At'
  ]);
  var existingExpIds = getExistingIds(expenseSheet);

  if (data.expenses && data.expenses.length > 0) {
    var newExpRows = [];
    for (var i = 0; i < data.expenses.length; i++) {
      var exp = data.expenses[i];
      var idStr = String(exp.id || '');
      if (existingExpIds[idStr]) continue; // already in sheet

      // Convert base64 → Drive URL (or keep existing URL)
      var imgUrl = ensureImageUrl(
        exp.imageBase64 || exp.imageUrl || '',
        'receipt_' + idStr + '.jpg'
      );

      newExpRows.push([
        idStr,
        normalizeDateValue(exp.date),
        String(exp.description || ''),
        String(exp.category || 'Other'),
        Number(exp.amount) || 0,
        String(exp.expenseType || 'regular'),
        String(exp.notes || ''),
        imgUrl,                          // ← Drive URL, never truncated
        new Date().toISOString()
      ]);
    }
    if (newExpRows.length > 0) {
      expenseSheet.getRange(
        expenseSheet.getLastRow() + 1, 1,
        newExpRows.length, newExpRows[0].length
      ).setValues(newExpRows);
    }
  }

  // ── TRANSACTIONS SHEET ──
  var txSheet = getOrCreateSheet(ss, 'Transactions', [
    'ID', 'Date', 'Description', 'Amount', 'Type',
    'Running Total', 'Category', 'Expense Type', 'Image URL', 'Synced At'
  ]);
  var existingTxIds = getExistingIds(txSheet);

  if (data.fundHistory && data.fundHistory.length > 0) {
    var newTxRows = [];
    for (var j = 0; j < data.fundHistory.length; j++) {
      var tx = data.fundHistory[j];
      var txIdStr = String(tx.id || '');
      if (existingTxIds[txIdStr]) continue;

      var txImgUrl = ensureImageUrl(
        tx.imageBase64 || tx.imageUrl || '',
        'tx_receipt_' + txIdStr + '.jpg'
      );

      newTxRows.push([
        txIdStr,
        normalizeDateTimeValue(tx.date),
        String(tx.description || ''),
        Number(tx.amount) || 0,
        String(tx.type || 'credit'),
        Number(tx.runningTotal) || 0,
        String(tx.category || ''),
        String(tx.expenseType || 'regular'),
        txImgUrl,                        // ← Drive URL
        new Date().toISOString()
      ]);
    }
    if (newTxRows.length > 0) {
      txSheet.getRange(
        txSheet.getLastRow() + 1, 1,
        newTxRows.length, newTxRows[0].length
      ).setValues(newTxRows);
    }
  }
}

// ============================================================
// EXPENSE WRITE — FULL REPLACE
// ============================================================
function replaceExpenses(ss, data) {
  // Summary
  var summarySheet = getOrCreateSheet(ss, 'Summary', [
    'Total Funds Added', 'Total Expenses', 'Current Balance',
    'Regular Expenses', 'One-Time Expenses', 'Bills', 'Usage %', 'Last Updated'
  ]);
  clearDataRows(summarySheet);
  summarySheet.appendRow([
    data.totals.totalFundsAdded      || 0,
    data.totals.totalExpenses        || 0,
    data.totals.currentBalance       || 0,
    data.totals.regularExpensesTotal || 0,
    data.totals.oneTimeExpensesTotal || 0,
    data.totals.billsTotal           || 0,
    data.totals.usedPercentage       || 0,
    new Date().toLocaleString()
  ]);

  // Expenses
  var expenseSheet = getOrCreateSheet(ss, 'Expenses', [
    'ID', 'Date', 'Description', 'Category', 'Amount',
    'Expense Type', 'Notes', 'Image URL', 'Synced At'
  ]);
  clearDataRows(expenseSheet);
  if (data.expenses && data.expenses.length > 0) {
    var expRows = data.expenses.map(function(exp, i) {
      var imgUrl = ensureImageUrl(
        exp.imageBase64 || exp.imageUrl || '',
        'receipt_' + String(exp.id || i) + '.jpg'
      );
      return [
        String(exp.id || ''),
        normalizeDateValue(exp.date),
        String(exp.description || ''),
        String(exp.category || 'Other'),
        Number(exp.amount) || 0,
        String(exp.expenseType || 'regular'),
        String(exp.notes || ''),
        imgUrl,
        new Date().toISOString()
      ];
    });
    expenseSheet.getRange(2, 1, expRows.length, expRows[0].length).setValues(expRows);
  }

  // Transactions
  var txSheet = getOrCreateSheet(ss, 'Transactions', [
    'ID', 'Date', 'Description', 'Amount', 'Type',
    'Running Total', 'Category', 'Expense Type', 'Image URL', 'Synced At'
  ]);
  clearDataRows(txSheet);
  if (data.fundHistory && data.fundHistory.length > 0) {
    var txRows = data.fundHistory.map(function(tx, j) {
      var txImgUrl = ensureImageUrl(
        tx.imageBase64 || tx.imageUrl || '',
        'tx_receipt_' + String(tx.id || j) + '.jpg'
      );
      return [
        String(tx.id || ''),
        normalizeDateTimeValue(tx.date),
        String(tx.description || ''),
        Number(tx.amount) || 0,
        String(tx.type || 'credit'),
        Number(tx.runningTotal) || 0,
        String(tx.category || ''),
        String(tx.expenseType || 'regular'),
        txImgUrl,
        new Date().toISOString()
      ];
    });
    txSheet.getRange(2, 1, txRows.length, txRows[0].length).setValues(txRows);
  }
}

// ============================================================
// EXPENSE READ
// ============================================================
function readExpenses(ss) {
  var summary = { totalFundsAdded: 0, totalExpenses: 0, currentBalance: 0, lastUpdated: '' };

  var summarySheet = ss.getSheetByName('Summary');
  if (summarySheet && summarySheet.getLastRow() > 1) {
    var sv = summarySheet.getRange(2, 1, 1, 8).getValues()[0];
    summary = {
      totalFundsAdded: Number(sv[0]) || 0,
      totalExpenses:   Number(sv[1]) || 0,
      currentBalance:  Number(sv[2]) || 0,
      lastUpdated:     String(sv[7] || '')
    };
  }

  // Expenses
  var expenses = [];
  var expenseSheet = ss.getSheetByName('Expenses');
  if (expenseSheet && expenseSheet.getLastRow() > 1) {
    var numRows = expenseSheet.getLastRow() - 1;
    var expData = expenseSheet.getRange(2, 1, numRows, 9).getValues();
    for (var i = 0; i < expData.length; i++) {
      var r = expData[i];
      if (!r[0] && !r[1]) continue;
      var imgValue = String(r[7] || '');
      expenses.push({
        id:          String(r[0] || (Date.now() + i)),
        date:        normalizeDateValue(r[1]),
        description: String(r[2] || ''),
        category:    String(r[3] || 'Other'),
        amount:      Number(r[4]) || 0,
        expenseType: String(r[5] || 'regular'),
        notes:       String(r[6] || ''),
        // Return as imageUrl — ExpenseList checks imageBase64 OR imageUrl
        imageBase64: imgValue.indexOf('http') === 0 ? null : imgValue,
        imageUrl:    imgValue.indexOf('http') === 0 ? imgValue : null
      });
    }
  }

  // Transactions
  var fundHistory = [];
  var txSheet = ss.getSheetByName('Transactions');
  if (txSheet && txSheet.getLastRow() > 1) {
    var numTxRows = txSheet.getLastRow() - 1;
    var txData = txSheet.getRange(2, 1, numTxRows, 10).getValues();
    for (var j = 0; j < txData.length; j++) {
      var t = txData[j];
      if (!t[0] && !t[1]) continue;
      var txImgValue = String(t[8] || '');
      fundHistory.push({
        id:           String(t[0] || (Date.now() + j)),
        date:         normalizeDateTimeValue(t[1]),
        description:  String(t[2] || ''),
        amount:       Number(t[3]) || 0,
        type:         String(t[4] || 'credit'),
        runningTotal: Number(t[5]) || 0,
        category:     String(t[6] || ''),
        expenseType:  String(t[7] || 'regular'),
        imageBase64:  txImgValue.indexOf('http') === 0 ? null : txImgValue,
        imageUrl:     txImgValue.indexOf('http') === 0 ? txImgValue : null
      });
    }
  }

  return { summary: summary, expenses: expenses, fundHistory: fundHistory };
}

// ============================================================
// ATTENDANCE WRITE (full replace)
// ============================================================
function writeAttendance(ss, data) {
  var empSheet = getOrCreateSheet(ss, 'Att_Employees', ['ID', 'Name', 'Added At']);
  clearDataRows(empSheet);
  if (data.employees && data.employees.length > 0) {
    var empRows = data.employees.map(function(e) {
      return [String(e.id), String(e.name || ''), String(e.addedAt || '')];
    });
    empSheet.getRange(2, 1, empRows.length, 3).setValues(empRows);
  }

  var recSheet = getOrCreateSheet(ss, 'Att_Records', ['Key', 'Employee ID', 'Date', 'Status', 'Time In', 'Time Out', 'Remark']);
  clearDataRows(recSheet);
  if (data.records) {
    var recKeys = Object.keys(data.records);
    if (recKeys.length > 0) {
      var recRows = recKeys.map(function(key) {
        var r = data.records[key];
        return [key, String(r.empId || ''), String(r.date || ''), String(r.status || ''),
                String(r.timeIn || ''), String(r.timeOut || ''), String(r.remark || '')];
      });
      recSheet.getRange(2, 1, recRows.length, 7).setValues(recRows);
    }
  }
}

// ============================================================
// ATTENDANCE READ
// ============================================================
function readAttendance(ss) {
  var employees = [];
  var empSheet = ss.getSheetByName('Att_Employees');
  if (empSheet && empSheet.getLastRow() > 1) {
    var empData = empSheet.getRange(2, 1, empSheet.getLastRow() - 1, 3).getValues();
    for (var i = 0; i < empData.length; i++) {
      var r = empData[i];
      if (r[0]) employees.push({ id: String(r[0]), name: String(r[1] || ''), addedAt: String(r[2] || '') });
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
          empId:   String(r[1] || ''),
          date:    String(r[2] || ''),
          status:  String(r[3] || ''),
          timeIn:  String(r[4] || ''),
          timeOut: String(r[5] || ''),
          remark:  String(r[6] || '')
        };
      }
    }
  }

  return { employees: employees, records: records };
}

// ============================================================
// SHEET HELPERS
// ============================================================

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function clearDataRows(sheet) {
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }
}

function getExistingIds(sheet) {
  var ids = {};
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return ids;
  var col = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    var v = String(col[i][0] || '').trim();
    if (v) ids[v] = true;
  }
  return ids;
}

// ============================================================
// RESPONSE HELPERS
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

// ============================================================
// DATE HELPERS
// ============================================================

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
