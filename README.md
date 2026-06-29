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

## Setup — one time, ~10 minutes

### 1. The Google Sheet

A blank sheet has already been created in your Drive:
**Opex Hub — Backend**. The next step fills in its tabs automatically, so
there's nothing to build by hand. (If you'd rather start fresh, just make a new
blank Google Sheet — any empty one works.)

### 2. Add the backend script and run `setup`

1. Open the sheet → **Extensions → Apps Script**.
2. Delete the starter `function myFunction() {}`.
3. Paste the entire contents of `apps-script.gs`. **Save** (disk icon).
4. In the toolbar, pick **`setup`** from the function dropdown → click **Run**.
5. Approve the permissions prompt (it's your own script — choose your account,
   "Advanced → Go to … (unsafe)" is normal for personal scripts, then Allow).

`setup` builds three tabs and seeds them:

- **`Portfolio`** — `Project | Domain | Owner | Priority | Status`, with sample
  rows. `Status` must stay one of **In progress · In triage · On hold · Done**
  (those drive the pills and filters). Edit/add rows freely.
- **`Settings`** — `Key | Value` stat rows (avg response, on-time rate, KPI bar
  widths, etc.). `activeProjects` and `inTriage` are **counted automatically**
  from the Portfolio tab, so you don't maintain those by hand. Full key list is
  at the top of `apps-script.gs`.
- **`Intake`** — header row; the form appends a new row here on each submit.

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

### 5. Publish the change

The site is **already live** on GitHub Pages at:

```
https://nickmohara.github.io/vrtx-kate/
```

So once you've pasted your `/exec` URL into `index.html` (step 4), just push and
Pages redeploys automatically (~1 min):

```bash
cd vrtx-kate
git add index.html
git commit -m "Connect site to Google Sheet backend"
git push origin main
```

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
