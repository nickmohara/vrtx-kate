/* ============================================================
   Opex Hub — shared app script (all pages load this)
   Handles: password gate · sidebar/modal/footer injection ·
   active nav · mobile nav · reveal · portfolio loading · intake modal
   ============================================================ */

const CONFIG = {
  /* Public CSV that feeds the Active Portfolio.
     From the Google Sheet: File → Share → Publish to web → the Portfolio
     tab → Comma-separated values (.csv). Paste that /pub?output=csv link. */
  SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIqYJzpRFokxmHJsJ3byaL3zd5hEyPpGEUomHf3bz50a1lVmMDqrMheMOq03ou4g/pub?output=csv",

  /* Optional: paste a deployed Apps Script /exec URL to actually save
     intake submissions. Blank = the form runs as a demo. (See README.) */
  WRITE_URL: "",

  /* Password gate. The site is a SOFT gate only (static page) — see README.
     PASSWORD_HASH is SHA-256 of the password; the plaintext isn't stored. */
  PASSWORD_HASH: "cf7ac5ef7e393ce051627d85c68a730365caf597db6e57ef596de38b4ebc416e",
  COOKIE_NAME: "opex_auth",
  COOKIE_DAYS: 30,

  /* Headline numbers not derived from the portfolio (edit freely). */
  STATS: {
    avgResponse:"2.4", avgResponseNote:"to first reply · SLA 5d",
    activeProjectsNote:"across all domains", inTriageNote:"awaiting prioritization",
    intakeResponseDays:"2.4", intakeResponseMeta:"Target ≤ 5 days", intakeResponseBar:"52",
    processStandardizedPct:"45", processStandardizedMeta:"Of recurring work on SOPs", processStandardizedBar:"45"
  }
};
const SHEET_CSV_URL = CONFIG.SHEET_CSV_URL;

/* ============================================================
   1. PASSWORD GATE
   ============================================================ */
async function sha256Hex(str){
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,"0")).join("");
}
function getCookie(name){
  return document.cookie.split("; ").find(c => c.startsWith(name + "="))?.split("=")[1] || "";
}
function setCookie(name, value, days){
  const d = new Date(); d.setTime(d.getTime() + days*24*60*60*1000);
  document.cookie = `${name}=${value}; expires=${d.toUTCString()}; path=/; SameSite=Lax`;
}
function isUnlocked(){
  return getCookie(CONFIG.COOKIE_NAME) === CONFIG.PASSWORD_HASH;
}

function injectGate(){
  const el = document.createElement("div");
  el.className = "gate";
  el.id = "gate";
  el.innerHTML = `
    <div class="gate-card">
      <div class="eyebrow">Vertex · Operational Excellence</div>
      <h2>Protected workspace</h2>
      <p>Enter the team password to continue.</p>
      <form id="gateForm" autocomplete="off">
        <input id="gateInput" type="password" placeholder="Password" aria-label="Password" autofocus />
        <div class="gate-err" id="gateErr">That password isn't right. Try again.</div>
        <button class="btn btn-primary" type="submit" style="justify-content:center;">Unlock</button>
        <div class="note">Stays unlocked on this device for 30 days.</div>
      </form>
    </div>`;
  document.body.appendChild(el);

  const form = el.querySelector("#gateForm");
  const input = el.querySelector("#gateInput");
  const err = el.querySelector("#gateErr");
  el.classList.add("show");
  input.focus();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const hash = await sha256Hex(input.value);
    if(hash === CONFIG.PASSWORD_HASH){
      setCookie(CONFIG.COOKIE_NAME, CONFIG.PASSWORD_HASH, CONFIG.COOKIE_DAYS);
      el.classList.remove("show");
      el.remove();
      document.documentElement.classList.remove("gate-lock");
    } else {
      err.classList.add("show");
      input.classList.add("invalid");
      input.select();
    }
  });
}

/* ============================================================
   2. SHARED SHELL (sidebar · footer · modal)
   ============================================================ */
const NAV_ITEMS = [
  { href:"index.html",            n:"00", label:"Home",            page:"home" },
  { href:"operating-model.html",  n:"01", label:"Operating Model", page:"operating" },
  { href:"governance.html",       n:"02", label:"Governance",      page:"governance" },
  { href:"delivery.html",         n:"03", label:"Delivery",        page:"delivery" },
  { href:"reporting.html",        n:"04", label:"Reporting",       page:"reporting" },
  { href:"improvement.html",      n:"05", label:"Improvement",     page:"improvement" }
];

function buildSidebar(){
  const side = document.getElementById("side");
  if(!side) return;
  const active = document.body.dataset.page;
  const link = i => `<a href="${i.href}" class="${i.page === active ? "active" : ""}"><span class="n">${i.n}</span> ${i.label}</a>`;
  side.innerHTML = `
    <div class="brand">
      <div class="eyebrow">Vertex · Operations &amp; Real Estate</div>
      <h1>Operational<br>Excellence</h1>
      <div class="sub">One front door for getting work into the department.</div>
    </div>
    <nav class="nav">
      ${link(NAV_ITEMS[0])}
      <div class="label">The Framework</div>
      ${NAV_ITEMS.slice(1).map(link).join("")}
    </nav>
    <div class="foot">Vertex Pharmaceuticals · Internal use<br>Draft v0.2</div>`;
}

function buildFooter(){
  const main = document.querySelector(".main");
  if(!main || main.querySelector(".pagefoot")) return;
  const foot = document.createElement("footer");
  foot.className = "pagefoot";
  foot.innerHTML = `
    <div class="wrap">
      <div>
        <div class="eyebrow">Operational Excellence</div>
        <p style="margin-top:10px;">Vertex · Operations &amp; Real Estate — one front door for the department's work.</p>
      </div>
      <div class="r">Internal use · Draft v0.2<br>Owner: [Your name / title]</div>
    </div>`;
  main.appendChild(foot);
}

const INTAKE_FIELDS = `
  <div class="frow">
    <div class="field"><label for="f-name">Your name <span class="req">*</span></label><input id="f-name" name="name" type="text" placeholder="Full name" required /></div>
    <div class="field"><label for="f-department">Department <span class="req">*</span></label><input id="f-department" name="department" type="text" placeholder="e.g. Facilities" required /></div>
  </div>
  <div class="frow">
    <div class="field"><label for="f-title">Project title <span class="req">*</span></label><input id="f-title" name="title" type="text" placeholder="Short, scannable name" required /></div>
    <div class="field"><label for="f-domain">Domain <span class="req">*</span></label>
      <select id="f-domain" name="domain" required><option value="" disabled selected>Choose a domain…</option><option>Engineering</option><option>Capital Projects</option><option>Facilities</option><option>Lab Oversight</option><option>Real Estate</option><option>Global Security</option><option>Other</option></select>
    </div>
  </div>
  <div class="field full" style="margin-bottom:18px;"><label for="f-problem">Problem statement <span class="req">*</span></label><textarea id="f-problem" name="problem" placeholder="What are you trying to solve? (Describe the problem, not the solution.)" required></textarea></div>
  <div class="field full" style="margin-bottom:18px;"><label for="f-outcome">Desired outcome</label><textarea id="f-outcome" name="outcome" placeholder="What does 'done and good' look like?"></textarea></div>
  <div class="frow">
    <div class="field"><label for="f-driver">Business driver</label>
      <select id="f-driver" name="driver"><option value="" disabled selected>Select…</option><option>Compliance</option><option>Cost</option><option>Capacity</option><option>Risk</option><option>Growth</option><option>Other</option></select>
    </div>
    <div class="field"><label for="f-timeline">Target timeline</label><input id="f-timeline" name="timeline" type="text" placeholder="Any hard deadlines?" /></div>
  </div>
  <div class="frow">
    <div class="field"><label for="f-sponsor">Sponsor / stakeholders</label><input id="f-sponsor" name="sponsor" type="text" placeholder="Who backs this work?" /></div>
    <div class="field"><label for="f-priority">Your view of priority</label>
      <select id="f-priority" name="priority"><option value="" disabled selected>Select…</option><option>High</option><option>Medium</option><option>Low</option></select>
    </div>
  </div>`;

function buildModal(){
  const el = document.createElement("div");
  el.className = "modal-backdrop";
  el.id = "intakeModal";
  el.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Submit a project">
      <div class="modal-head">
        <div>
          <div class="eyebrow">▤ Submit a Project</div>
          <h3>Tell us what you need</h3>
          <p>One form, any domain. You'll get a first response within 5 business days — every time.</p>
        </div>
        <button class="modal-close" id="modalClose" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <form id="intakeForm" novalidate>
          ${INTAKE_FIELDS}
          <div class="modal-foot">
            <p class="note">Submitting logs your request and starts the clock on triage.</p>
            <button type="submit" class="btn btn-primary" id="submitBtn">Submit request</button>
          </div>
          <p class="form-error" id="formError">Please fill in the required fields marked with *.</p>
        </form>
        <div class="confirm" id="confirm" style="margin-top:20px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
          <div><strong>Request received.</strong><p id="confirmMsg">It's in the queue for triage. You'll get a first response within 5 business days.</p></div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(el);
  wireModal(el);
}

function openModal(){
  const m = document.getElementById("intakeModal");
  if(m){ m.classList.add("show"); m.querySelector("#f-name")?.focus(); }
}
function closeModal(){
  document.getElementById("intakeModal")?.classList.remove("show");
}

function wireModal(el){
  el.querySelector("#modalClose").addEventListener("click", closeModal);
  el.addEventListener("click", e => { if(e.target === el) closeModal(); });
  document.addEventListener("keydown", e => { if(e.key === "Escape") closeModal(); });
  setupForm(el);
}

/* ============================================================
   3. INTAKE FORM
   ============================================================ */
function canWrite(){
  return CONFIG.WRITE_URL && !CONFIG.WRITE_URL.startsWith("PASTE_");
}
function setupForm(root){
  const form = root.querySelector("#intakeForm");
  const btn = root.querySelector("#submitBtn");
  const errEl = root.querySelector("#formError");
  const confirm = root.querySelector("#confirm");
  const confirmMsg = root.querySelector("#confirmMsg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errEl.classList.remove("show");

    const required = [...form.querySelectorAll("[required]")];
    let ok = true;
    required.forEach(el => {
      const bad = !el.value || !el.value.trim();
      el.classList.toggle("invalid", bad);
      if(bad) ok = false;
    });
    if(!ok){ errEl.classList.add("show"); return; }

    const payload = {};
    [...form.elements].forEach(el => { if(el.name) payload[el.name] = el.value.trim(); });

    if(!canWrite()){
      confirmMsg.innerHTML = "It's in the queue for triage. You'll get a first response within 5 business days. <span class=\"mono\" style=\"color:var(--faint);\">(Demo — submissions aren't saved yet; see README to enable.)</span>";
      form.style.display = "none";
      confirm.classList.add("show");
      return;
    }

    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = "Submitting…";
    try{
      await fetch(CONFIG.WRITE_URL, {
        method:"POST",
        headers:{ "Content-Type":"text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      confirmMsg.textContent = "It's in the queue for triage. You'll get a first response within 5 business days.";
      form.style.display = "none";
      confirm.classList.add("show");
      if(document.querySelector("#portfolioTbl")) loadData();
    }catch(err){
      console.error("Submit failed:", err);
      errEl.textContent = "Something went wrong submitting your request. Please try again.";
      errEl.classList.add("show");
    }finally{
      btn.disabled = false;
      btn.textContent = label;
    }
  });
}

/* ============================================================
   4. PORTFOLIO (only on pages with #portfolioTbl)
   ============================================================ */
const STATUS_KEY = { "In progress":"prog", "In triage":"triage", "On hold":"hold", "Done":"done" };
const SAMPLE_PORTFOLIO = [
  {project:"HQ chilled-water plant upgrade",   domain:"Facilities",       owner:"J. Okafor", priority:"High", status:"In progress"},
  {project:"Lab 4 ventilation recertification",domain:"Lab Oversight",    owner:"M. Reyes",  priority:"High", status:"In progress"},
  {project:"West campus lease consolidation",  domain:"Real Estate",      owner:"—",         priority:"—",    status:"In triage"},
  {project:"Badge-access system migration",    domain:"Global Security",  owner:"D. Lin",    priority:"Med",  status:"In progress"},
  {project:"Capital request — Bldg 7 retrofit",domain:"Capital Projects", owner:"—",         priority:"—",    status:"In triage"},
  {project:"Generator load-test standardization",domain:"Engineering",    owner:"A. Park",   priority:"Low",  status:"On hold"},
  {project:"Intake & triage SOP rollout",      domain:"OpEx",             owner:"You",       priority:"High", status:"Done"},
  {project:"Space utilization dashboard",      domain:"Real Estate",      owner:"S. Haddad", priority:"Med",  status:"In progress"}
];

function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function hasSheet(){ return CONFIG.SHEET_CSV_URL && !CONFIG.SHEET_CSV_URL.startsWith("PASTE_"); }

function parseCSV(text){
  const rows = []; let row = [], field = "", inQ = false;
  for(let i = 0; i < text.length; i++){
    const c = text[i];
    if(inQ){
      if(c === '"'){ if(text[i+1] === '"'){ field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if(c === '"'){ inQ = true; }
    else if(c === ','){ row.push(field); field = ""; }
    else if(c === '\n'){ row.push(field); rows.push(row); row = []; field = ""; }
    else if(c !== '\r'){ field += c; }
  }
  if(field.length || row.length){ row.push(field); rows.push(row); }
  return rows;
}
function rowsToPortfolio(rows){
  if(!rows.length) return [];
  const head = rows[0].map(h => h.trim().toLowerCase());
  const at = name => head.indexOf(name);
  const iP = at('project'), iD = at('domain'), iO = at('owner'), iPr = at('priority'), iS = at('status');
  return rows.slice(1)
    .filter(r => r.join("").trim() !== "")
    .map(r => ({
      project:(r[iP]||"").trim(), domain:(r[iD]||"").trim(), owner:(r[iO]||"").trim(),
      priority:(r[iPr]||"").trim(), status:(r[iS]||"").trim()
    }));
}
function renderPortfolio(rows){
  const tbody = document.querySelector("#portfolioTbl tbody");
  if(!tbody) return;
  if(!rows || !rows.length){
    tbody.innerHTML = '<tr class="tbl-state"><td colspan="5">No projects yet.</td></tr>';
    bindFilters(); return;
  }
  tbody.innerHTML = rows.map(r => {
    const key = STATUS_KEY[r.status] || "prog";
    return `<tr data-s="${key}">
      <td>${esc(r.project)}</td><td>${esc(r.domain)}</td>
      <td>${esc(r.owner || "—")}</td><td class="mono">${esc(r.priority || "—")}</td>
      <td><span class="pill ${key}">${esc(r.status)}</span></td></tr>`;
  }).join("");
  bindFilters();
}
function applyStats(stats, portfolio){
  const s = Object.assign({}, stats);
  if(portfolio){
    if(s.activeProjects == null) s.activeProjects = portfolio.filter(r => r.status === "In progress").length;
    if(s.inTriage == null)       s.inTriage       = portfolio.filter(r => r.status === "In triage").length;
  }
  document.querySelectorAll("[data-stat]").forEach(el => {
    const k = el.dataset.stat;
    if(s[k] != null && s[k] !== "") el.textContent = s[k];
  });
  document.querySelectorAll("[data-bar]").forEach(el => {
    const k = el.dataset.bar;
    if(s[k] != null && s[k] !== "") el.style.width = String(s[k]).replace("%","") + "%";
  });
}
function bindFilters(){
  const rows = [...document.querySelectorAll("#portfolioTbl tbody tr")];
  const active = document.querySelector(".fbtn.on")?.dataset.f || "all";
  rows.forEach(r => { r.style.display = (active === "all" || r.dataset.s === active) ? "" : "none"; });
}
async function loadData(){
  const note = document.getElementById("portfolioNote");
  if(!document.querySelector("#portfolioTbl")) return;
  if(!hasSheet()){
    renderPortfolio(SAMPLE_PORTFOLIO); applyStats(CONFIG.STATS, SAMPLE_PORTFOLIO);
    if(note) note.textContent = "Sample data — no sheet configured (set SHEET_CSV_URL in app.js).";
    return;
  }
  try{
    const res = await fetch(SHEET_CSV_URL);
    if(!res.ok) throw new Error("HTTP " + res.status);
    const portfolio = rowsToPortfolio(parseCSV(await res.text()));
    renderPortfolio(portfolio); applyStats(CONFIG.STATS, portfolio);
    if(note) note.textContent = "Live from Google Sheets · updates whenever the sheet changes.";
  }catch(err){
    console.error("Could not load the sheet:", err);
    renderPortfolio(SAMPLE_PORTFOLIO); applyStats(CONFIG.STATS, SAMPLE_PORTFOLIO);
    if(note) note.textContent = "Couldn't reach the sheet — showing sample data. (Is it shared “Anyone with the link: Viewer”?)";
  }
}

/* ============================================================
   5. UI WIRING (mobile nav · reveal · CTA buttons)
   ============================================================ */
function wireUI(){
  const side = document.getElementById("side");
  const backdrop = document.getElementById("backdrop");
  const menuBtn = document.getElementById("menuBtn");
  const closeNav = () => { side?.classList.remove("open"); backdrop?.classList.remove("show"); };
  menuBtn?.addEventListener("click", () => { side?.classList.toggle("open"); backdrop?.classList.toggle("show"); });
  backdrop?.addEventListener("click", closeNav);
  side?.querySelectorAll("a[href]").forEach(a => a.addEventListener("click", () => { if(innerWidth <= 880) closeNav(); }));

  // any element with data-open-intake opens the modal
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-open-intake]");
    if(t){ e.preventDefault(); if(innerWidth <= 880) closeNav(); openModal(); }
  });

  // reveal on scroll
  const rev = new IntersectionObserver(entries => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add("in"); rev.unobserve(e.target); } });
  }, { rootMargin:"0px 0px -10% 0px" });
  document.querySelectorAll(".reveal").forEach(el => rev.observe(el));

  // portfolio filter buttons
  document.querySelectorAll(".fbtn").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll(".fbtn").forEach(x => x.classList.remove("on"));
    b.classList.add("on"); bindFilters();
  }));
}

/* ============================================================
   LOCAL DEV: bust page cache on localhost only
   ------------------------------------------------------------
   Embedded preview browsers aggressively cache plain page URLs.
   On localhost we append a unique token to internal links so every
   navigation loads fresh. On the live site this is a no-op, so
   production keeps clean URLs and normal caching.
   ============================================================ */
function bustLocalLinks(){
  const host = location.hostname;
  if(host !== "localhost" && host !== "127.0.0.1") return;
  const token = "_=" + (performance.timeOrigin + performance.now()).toString(36);
  document.querySelectorAll('a[href]').forEach(a => {
    const h = a.getAttribute("href");
    if(h && /\.html$/.test(h)) a.setAttribute("href", h + (h.includes("?") ? "&" : "?") + token);
  });
}

/* ============================================================
   BOOT
   ============================================================ */
function boot(){
  buildSidebar();
  buildFooter();
  buildModal();
  bustLocalLinks();
  wireUI();
  applyStats(CONFIG.STATS);   // populate KPI/stat elements on any page
  loadData();                 // portfolio pages also re-apply with derived counts
  if(!isUnlocked()){
    document.documentElement.classList.add("gate-lock");
    injectGate();
  } else {
    document.documentElement.classList.remove("gate-lock");
  }
}
if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
