# Opex Hub

A multi-page "Operational Excellence" hub for Vertex Operations & Real Estate.
Static pages hosted on **GitHub Pages**; the Active Portfolio reads straight from
a **public Google Sheet** on every load — no backend.

- **Live site:** https://nickmohara.github.io/vrtx-kate/
- **Data sheet:** [Opex Hub — Portfolio](https://docs.google.com/spreadsheets/d/12sE8r9h7vw4mHdailNrtRz11tLZqwYajViZzuuqky0E/edit)

```
Browser (GitHub Pages)
   │
   └─ Home page: GET the sheet's CSV export ──▶ parse ──▶ render Active Portfolio
```

---

## Structure

The site is several pages that share one shell. The sidebar, footer, intake
modal, and password gate are all built by `app.js`, so each page only contains
its own content and stays in sync automatically.

| File / page             | What it is                                                       |
|-------------------------|------------------------------------------------------------------|
| `styles.css`            | All styling + the Vertex purple theme. Shared by every page.     |
| `app.js`                | Shared brain: password gate, sidebar/footer/modal, portfolio fetch, form. **Edit settings here** (see `CONFIG` at the top). |
| `index.html`            | **Home** — what we do, why it matters, goals, and the Active Portfolio. |
| `operating-model.html`  | Operating Model (request→close flow, prioritization, exception handling) |
| `governance.html`       | Governance (decision-rights RACI, forums, escalation, change control) |
| `delivery.html`         | Delivery (stage gates, artifacts/templates, status definitions)  |
| `reporting.html`        | Reporting (metrics, report catalog, review cadence)              |
| `improvement.html`      | Continuous Improvement (PDCA)                                    |
| `apps-script.gs`        | **Optional** — only needed to make the intake form *save* submissions. |

The "Submit a Project" button on any page opens the intake form as a **popup
modal** (no separate page).

---

## Settings — all in `app.js`

Open `app.js` and edit the `CONFIG` block at the top:

- `SHEET_CSV_URL` — the published-to-web CSV link of the Portfolio tab (see
  "How the data is connected" below).
- `STATS` — the headline numbers that aren't derived from the sheet (the
  Active/In-triage counts are computed automatically).
- `WRITE_URL` — leave blank for a demo form; set it to enable real submissions
  (see "Make the form save submissions" below).
- `PASSWORD_HASH` — see "Password" below.

The portfolio sheet needs columns **`Project | Domain | Owner | Priority |
Status`** in row 1. `Status` must be one of **In progress · In triage · On hold ·
Done** (those drive the pills and filters).

---

## How the data is connected

The portfolio is read from the Google Sheet's **Publish to web** CSV — a link
that Google serves as plain CSV with open CORS, so the browser can fetch it
directly (a plain "Anyone with the link" share is *not* enough on its own).

To (re)connect a sheet:

1. In the sheet: **File → Share → Publish to web**.
2. Choose the **Portfolio** tab and format **Comma-separated values (.csv)** →
   **Publish**.
3. Copy the `…/pub?output=csv` link and paste it into `CONFIG.SHEET_CSV_URL`
   in `app.js`. Commit + push.

The sheet needs columns **`Project | Domain | Owner | Priority | Status`** in
row 1 (extra columns are fine and ignored). `Status` must be one of **In
progress · In triage · On hold · Done**.

> **Note:** published CSV can be cached by Google for a few minutes, so sheet
> edits may take up to ~5 min to show on the site. Until a link is set the site
> shows built-in sample data with a small note (never breaks).

---

## Password

The site is gated by a password (`operational-excellence`). Entering it stores a
cookie so the visitor isn't asked again **for 30 days** on that device.

> ⚠️ **This is a soft gate, not real security.** The check runs in the browser,
> and the portfolio data lives in a *public* Google Sheet — so a determined
> person can bypass the page or read the sheet directly. It's good for keeping
> the page out of casual view, nothing more. If you need genuine access control,
> this host isn't the right fit — ask and we'll move to an authenticated setup.

**To change the password:** compute the SHA-256 of the new password and paste it
into `CONFIG.PASSWORD_HASH` in `app.js` (and update the same hash in the small
inline `<script>` near the top of each `.html` page — that's what prevents a
flash of content before the gate loads). On macOS:

```bash
printf '%s' 'your-new-password' | shasum -a 256
```

---

## Everyday updates

| To change…                | Do this                                                       |
|---------------------------|---------------------------------------------------------------|
| Portfolio rows            | Edit the Google Sheet. Live site updates on next load.        |
| Headline stat numbers     | Edit `CONFIG.STATS` in `app.js`, commit, push.                |
| Page content / copy       | Edit the relevant `.html`, commit, push.                      |
| Look & feel               | Edit `styles.css` (the `:root` block holds the colors).       |

```bash
cd vrtx-kate
git add -A && git commit -m "Update site" && git push origin main
```

GitHub Pages redeploys automatically (~1 min).

---

## Optional: make the intake form save submissions

A public sheet is read-only to the browser, so the form shows a confirmation but
can't write rows without a small backend. To enable real submissions:

1. Open the sheet → **Extensions → Apps Script**. Paste all of `apps-script.gs`,
   **Save**.
2. Pick **`setup`** in the function dropdown → **Run** → approve the prompt.
   (Adds an `Intake` tab.)
3. **Deploy → New deployment → Web app** (Execute as: Me · Who has access:
   Anyone) → copy the `/exec` URL.
4. Set `CONFIG.WRITE_URL` in `app.js` to that URL. Commit + push.

Submissions then append to the sheet's `Intake` tab.
