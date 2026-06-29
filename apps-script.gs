/**
 * Opex Hub — Google Sheets backend (Google Apps Script)
 * ----------------------------------------------------------------------------
 * This script turns a Google Sheet into a tiny JSON API for the website:
 *   • GET  → returns { portfolio: [...], stats: {...} }  (feeds the page)
 *   • POST → appends a new row to the "Intake" tab        (form submissions)
 *
 * SETUP (see README.md for the full walkthrough):
 *   1. Create a Google Sheet with three tabs: Portfolio, Settings, Intake
 *      (exact column headers are listed below).
 *   2. Extensions → Apps Script. Delete the starter code, paste THIS file.
 *   3. Deploy → New deployment → type "Web app".
 *        Execute as:  Me
 *        Who has access:  Anyone
 *      Copy the /exec URL it gives you and paste it into CONFIG.API_URL
 *      at the top of index.html.
 *   4. Re-deploy (Manage deployments → edit → Version: New) whenever you
 *      change this script.
 * ----------------------------------------------------------------------------
 *
 * EXPECTED SHEET TABS & HEADERS (row 1 = headers, exactly as written):
 *
 *   Tab "Portfolio":   Project | Domain | Owner | Priority | Status
 *      Status must be one of:  In progress | In triage | On hold | Done
 *
 *   Tab "Settings":    Key | Value
 *      Each row is one stat. Recognized keys (all optional):
 *        avgResponse, avgResponseNote
 *        onTimeRate, onTimeRateNote
 *        activeProjects, activeProjectsNote        (count auto-derived if blank)
 *        inTriage, inTriageNote                    (count auto-derived if blank)
 *        intakeResponseDays, intakeResponseMeta, intakeResponseBar
 *        onTimeDeliveryPct,  onTimeDeliveryMeta,  onTimeDeliveryBar
 *        processStandardizedPct, processStandardizedMeta, processStandardizedBar
 *      (the *Bar values are 0–100, the width % of the little progress bars)
 *
 *   Tab "Intake":      Timestamp | Name | Department | Title | Domain |
 *                      Problem | Outcome | Driver | Timeline | Sponsor | Priority
 *      (the script creates/orders these columns on first submit if missing)
 */

var SHEET_PORTFOLIO = 'Portfolio';
var SHEET_SETTINGS  = 'Settings';
var SHEET_INTAKE    = 'Intake';

// Column order written to the Intake tab, mapped to the form field names.
var INTAKE_COLUMNS = [
  { header: 'Timestamp',  field: '_timestamp' },
  { header: 'Name',       field: 'name' },
  { header: 'Department', field: 'department' },
  { header: 'Title',      field: 'title' },
  { header: 'Domain',     field: 'domain' },
  { header: 'Problem',    field: 'problem' },
  { header: 'Outcome',    field: 'outcome' },
  { header: 'Driver',     field: 'driver' },
  { header: 'Timeline',   field: 'timeline' },
  { header: 'Sponsor',    field: 'sponsor' },
  { header: 'Priority',   field: 'priority' }
];

/* ------------------------------ GET ------------------------------ */
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var portfolio = readPortfolio(ss);
  var stats = readSettings(ss);
  return jsonOutput({ portfolio: portfolio, stats: stats });
}

/* ------------------------------ POST ----------------------------- */
function doPost(e) {
  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }
    appendIntake(payload);
    return jsonOutput({ ok: true });
  } catch (err) {
    return jsonOutput({ ok: false, error: String(err) });
  }
}

/* --------------------------- read tabs --------------------------- */
function readPortfolio(ss) {
  var sheet = ss.getSheetByName(SHEET_PORTFOLIO);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (row.join('').trim() === '') continue; // skip blank rows
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c] === '' ? '' : String(row[c]).trim();
    }
    rows.push({
      project:  obj['project']  || '',
      domain:   obj['domain']   || '',
      owner:    obj['owner']    || '',
      priority: obj['priority'] || '',
      status:   obj['status']   || ''
    });
  }
  return rows;
}

function readSettings(ss) {
  var stats = {};
  var sheet = ss.getSheetByName(SHEET_SETTINGS);
  if (sheet) {
    var values = sheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) { // skip header row
      var key = String(values[i][0]).trim();
      if (!key) continue;
      stats[key] = values[i][1] === '' ? '' : String(values[i][1]).trim();
    }
  }
  // auto-derive the two counts from the Portfolio tab if not set in Settings
  var portfolio = readPortfolio(ss);
  if (stats.activeProjects == null || stats.activeProjects === '') {
    stats.activeProjects = countStatus(portfolio, 'In progress');
  }
  if (stats.inTriage == null || stats.inTriage === '') {
    stats.inTriage = countStatus(portfolio, 'In triage');
  }
  return stats;
}

function countStatus(rows, status) {
  var n = 0;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].status === status) n++;
  }
  return n;
}

/* --------------------------- write intake ------------------------ */
function appendIntake(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_INTAKE);
  if (!sheet) sheet = ss.insertSheet(SHEET_INTAKE);

  // ensure header row exists
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(INTAKE_COLUMNS.map(function (c) { return c.header; }));
    sheet.getRange(1, 1, 1, INTAKE_COLUMNS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  payload._timestamp = new Date();
  var row = INTAKE_COLUMNS.map(function (c) {
    return payload[c.field] != null ? payload[c.field] : '';
  });
  sheet.appendRow(row);
}

/* ----------------------------- helper ---------------------------- */
function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
