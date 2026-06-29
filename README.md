# Opex Hub

A single-page "Operational Excellence" hub for Operations & Real Estate.
The page is static HTML hosted on **GitHub Pages**; its data lives in a
**Google Sheet** and is read/written through a **Google Apps Script** web app.

```
Browser (GitHub Pages)
   │
   ├─ on load:   GET  ──▶ Apps Script ──▶ reads Sheet ──▶ portfolio + stats (JSON)
   │
   └─ on submit: POST ──▶ Apps Script ──▶ appends a row to the "Intake" tab
```

Edit the Google Sheet → the live site reflects it on the next page load.
No code changes or redeploys needed for day-to-day data updates.

---

## Files

| File             | What it is                                                        |
|------------------|-------------------------------------------------------------------|
| `index.html`     | The whole website. One file, no build step.                       |
| `apps-script.gs` | The Google Sheets backend. Paste into Apps Script (not deployed from here). |
| `README.md`      | This guide.                                                       |

---

## Setup — one time, ~15 minutes

### 1. Create the Google Sheet

Make a new Google Sheet with **three tabs** named exactly:

**`Portfolio`** — row 1 headers, then one row per project:

| Project | Domain | Owner | Priority | Status |
|---|---|---|---|---|
| HQ chilled-water plant upgrade | Facilities | J. Okafor | High | In progress |
| West campus lease consolidation | Real Estate |  |  | In triage |

> `Status` must be one of: **In progress · In triage · On hold · Done**
> (those drive the colored pills and the filter buttons).

**`Settings`** — row 1 headers `Key | Value`, then one row per stat. All optional:

| Key | Value |
|---|---|
| avgResponse | 2.4 |
| onTimeRate | 88 |
| intakeResponseDays | 2.4 |
| intakeResponseBar | 52 |
| onTimeDeliveryPct | 88 |
| onTimeDeliveryBar | 88 |
| processStandardizedPct | 45 |
| processStandardizedBar | 45 |

> `activeProjects` and `inTriage` are **counted automatically** from the
> Portfolio tab, so you don't need to maintain them by hand (you can still
> add them to Settings to override). `*Bar` values are 0–100 (the width of
> the little progress bars). Full key list is documented at the top of
> `apps-script.gs`.

**`Intake`** — leave it empty. The script creates the header row and columns
on the first form submission.

### 2. Add the backend script

1. In the Sheet: **Extensions → Apps Script**.
2. Delete the starter `function myFunction() {}`.
3. Paste the entire contents of `apps-script.gs`.
4. **Save** (disk icon).

### 3. Deploy it as a Web App

1. **Deploy → New deployment**.
2. Click the gear → choose **Web app**.
3. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. **Deploy**, approve the permissions prompt (it's your own script).
5. Copy the **Web app URL** — it ends in `/exec`.

### 4. Connect the page to the sheet

Open `index.html`, find this near the bottom (in the `<script>`):

```js
const CONFIG = {
  API_URL: "PASTE_YOUR_APPS_SCRIPT_URL_HERE"
};
```

Replace the placeholder with your `/exec` URL. Save.

> Before this is set, the page works fine and shows **sample data** so you can
> preview it. Once set, it goes live against your sheet.

### 5. Publish to GitHub Pages

This repo is `https://github.com/nickmohara/vrtx-kate`.

```bash
cd vrtx-kate
git add .
git commit -m "Opex Hub: sheet-backed site"
git push origin main
```

Then on GitHub: **Settings → Pages → Build and deployment → Source: Deploy from
a branch → Branch: `main` / `(root)` → Save.**

Your site appears at:

```
https://nickmohara.github.io/vrtx-kate/
```

(First publish takes a minute or two.)

---

## Updating things later

| To change…                | Do this                                                        |
|---------------------------|----------------------------------------------------------------|
| Portfolio rows / stats    | Edit the Google Sheet. Live site updates on next load.         |
| The backend logic         | Edit Apps Script, then **Manage deployments → Edit → Version: New deployment**. |
| The page design / copy    | Edit `index.html`, commit, `git push`. Pages redeploys.        |

---

## Notes & gotchas

- **Re-deploy after editing the script.** Apps Script serves the last
  *deployed* version, not the last saved one. Use **Manage deployments → Edit →
  Version: New** (keeps the same `/exec` URL).
- **CORS / form POST.** The form posts as `text/plain` on purpose — that keeps
  it a "simple" request so the browser doesn't send a preflight that Apps Script
  can't answer. Don't change that header.
- **Public data.** "Who has access: Anyone" means anyone with the `/exec` URL
  can read the portfolio JSON and submit the form. Fine for non-sensitive
  internal info; don't put confidential data in the sheet. For private access,
  GitHub Pages + Apps Script isn't the right host — ask and we'll look at an
  authenticated option.
- **No data loss on the page.** If the sheet is ever unreachable, the page
  falls back to built-in sample data and shows a small note instead of breaking.
