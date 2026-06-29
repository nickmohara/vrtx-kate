/**
 * Opex Hub — Google Sheets backend (Google Apps Script)
 * ----------------------------------------------------------------------------
 * This script turns a Google Sheet into a tiny JSON API for the website:
 *   • GET  → returns { portfolio: [...], stats: {...} }  (feeds the page)
 *   • POST → appends a new row to the "Intake" tab        (form submissions)
 *
 * SETUP (see README.md for the full walkthrough):
 *   1. Open your Google Sheet → Extensions → Apps Script. Delete the starter
 *      code, paste THIS file, and Save.
 *   2. In the editor, choose the "setup" function from the dropdown and click
 *      Run. Approve the permissions prompt. This BUILDS the three tabs
 *      (Portfolio, Settings, Intake) with headers + sample data for you.
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

/* ============================================================
 * SETUP — run this ONCE from the editor to build & seed the tabs.
 * Safe to re-run: it only creates tabs / headers that are missing,
 * and only seeds sample rows into empty tabs (won't clobber data).
 * ============================================================ */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // --- Portfolio ---
  var portfolio = getOrCreateSheet_(ss, SHEET_PORTFOLIO);
  if (portfolio.getLastRow() === 0) {
    var pRows = [
      ['Project', 'Domain', 'Owner', 'Priority', 'Status'],
      ['HQ chilled-water plant upgrade',    'Facilities',       'J. Okafor', 'High', 'In progress'],
      ['Lab 4 ventilation recertification', 'Lab Oversight',    'M. Reyes',  'High', 'In progress'],
      ['West campus lease consolidation',   'Real Estate',      '',          '',     'In triage'],
      ['Badge-access system migration',     'Global Security',  'D. Lin',    'Med',  'In progress'],
      ['Capital request — Bldg 7 retrofit', 'Capital Projects', '',          '',     'In triage'],
      ['Generator load-test standardization','Engineering',     'A. Park',   'Low',  'On hold'],
      ['Intake & triage SOP rollout',       'OpEx',             'You',       'High', 'Done'],
      ['Space utilization dashboard',       'Real Estate',      'S. Haddad', 'Med',  'In progress']
    ];
    portfolio.getRange(1, 1, pRows.length, 5).setValues(pRows);
    styleHeader_(portfolio, 5);
  }

  // --- Settings ---
  var settings = getOrCreateSheet_(ss, SHEET_SETTINGS);
  if (settings.getLastRow() === 0) {
    var sRows = [
      ['Key', 'Value'],
      ['avgResponse', '2.4'],
      ['avgResponseNote', 'to first reply · SLA 5d'],
      ['onTimeRate', '88'],
      ['onTimeRateNote', 'milestones met'],
      ['activeProjectsNote', 'across 6 domains'],
      ['inTriageNote', 'awaiting prioritization'],
      ['intakeResponseDays', '2.4'],
      ['intakeResponseMeta', 'Target ≤ 5 days'],
      ['intakeResponseBar', '52'],
      ['onTimeDeliveryPct', '88'],
      ['onTimeDeliveryMeta', 'Target 90%'],
      ['onTimeDeliveryBar', '88'],
      ['processStandardizedPct', '45'],
      ['processStandardizedMeta', 'Of recurring work on SOPs'],
      ['processStandardizedBar', '45']
    ];
    settings.getRange(1, 1, sRows.length, 2).setValues(sRows);
    styleHeader_(settings, 2);
  }

  // --- Intake (header only; rows are appended by the form) ---
  var intake = getOrCreateSheet_(ss, SHEET_INTAKE);
  if (intake.getLastRow() === 0) {
    intake.appendRow(INTAKE_COLUMNS.map(function (c) { return c.header; }));
    styleHeader_(intake, INTAKE_COLUMNS.length);
  }

  // tidy: remove the default "Sheet1" if it's empty and unused
  var def = ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) ss.deleteSheet(def);

  SpreadsheetApp.getActiveSpreadsheet().toast('Tabs built and seeded. You can deploy now.', 'Opex Hub setup', 5);
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function styleHeader_(sheet, cols) {
  sheet.getRange(1, 1, 1, cols).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

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
