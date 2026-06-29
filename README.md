# Opex Hub

A single-page "Operational Excellence" hub for Operations & Real Estate.
The page is static HTML hosted on **GitHub Pages**; the portfolio table reads
straight from a **public Google Sheet** on every page load — no backend.

```
Browser (GitHub Pages)
   │
   └─ on load: GET the sheet's CSV export ──▶ parse ──▶ render portfolio + stats
```

Edit the Google Sheet → the live site reflects it on the next page load.
No code changes, no server, no redeploy for day-to-day data updates.

- **Live site:** https://nickmohara.github.io/vrtx-kate/
- **Data sheet:** [Opex Hub — Portfolio](https://docs.google.com/spreadsheets/d/12sE8r9h7vw4mHdailNrtRz11tLZqwYajViZzuuqky0E/edit)

---

## Files

| File             | What it is                                                          |
|------------------|--------------------------------------------------------------------|
| `index.html`     | The whole website. One file, no build step.                        |
| `apps-script.gs` | **Optional.** Only needed if you want the intake *form* to save submissions back to a sheet. Not required for the live portfolio. |
| `README.md`      | This guide.                                                        |

---

## How it works

The page fetches the sheet via Google's CSV endpoint:

```
https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:csv&gid=<GID>
```

`SHEET_ID`, `GID`, and the headline `STATS` live in the `CONFIG` block near the
bottom of `index.html`. The portfolio's `Active projects` and `In triage` counts
are computed automatically from the sheet; the other headline numbers (avg
response, on-time rate, KPI bars) are illustrative values you edit in `CONFIG`.

The sheet's only requirement: columns **`Project | Domain | Owner | Priority |
Status`** in row 1. `Status` must be one of **In progress · In triage · On hold ·
Done** (those drive the colored pills and the filter buttons).

---

## The one setup step: make the sheet public

For the browser to read the sheet, it must be link-shared:

1. Open [Opex Hub — Portfolio](https://docs.google.com/spreadsheets/d/12sE8r9h7vw4mHdailNrtRz11tLZqwYajViZzuuqky0E/edit).
2. **Share** (top-right) → under **General access**, switch "Restricted" to
   **Anyone with the link**, role **Viewer**. → **Done**.

That's it. Reload https://nickmohara.github.io/vrtx-kate/ and the portfolio is
live from the sheet. Until you do this, the site shows built-in sample data with
a small note (it never breaks).

> **Heads-up — this makes the sheet's data publicly readable** by anyone who has
> (or guesses their way to) the link. Fine for non-sensitive internal info; don't
> put confidential data in it. Need it locked down? See "Private data" below.

---

## Everyday updates

| To change…              | Do this                                                       |
|-------------------------|---------------------------------------------------------------|
| Portfolio rows          | Edit the Google Sheet. Live site updates on next load.        |
| Headline stat numbers   | Edit the `STATS` block in `index.html`, commit, `git push`.   |
| Point at a different tab/sheet | Change `SHEET_ID` / `GID` in `index.html`, commit, push. |
| Page design / copy      | Edit `index.html`, commit, `git push`. Pages redeploys (~1m). |

Push changes with:

```bash
cd vrtx-kate
git add -A && git commit -m "Update site" && git push origin main
```

---

## Optional: make the intake form save submissions

A public sheet is **read-only** to the browser — the form can display a
confirmation, but it can't write rows back without a tiny backend. To enable real
submissions, deploy the included Apps Script (this is the only part that needs
Google's authorization flow):

1. Open the sheet → **Extensions → Apps Script**. Delete the starter code, paste
   all of `apps-script.gs`, **Save**.
2. Pick **`setup`** in the function dropdown → **Run** → approve the permission
   prompt. (This adds an `Intake` tab to catch submissions.)
3. **Deploy → New deployment → Web app**, set **Execute as: Me** and **Who has
   access: Anyone** → **Deploy** → copy the `/exec` URL.
4. In `index.html`, set `CONFIG.WRITE_URL` to that `/exec` URL. Commit + push.

Now form submissions append to the sheet's `Intake` tab. (The form posts as
`text/plain` on purpose — keeps it a "simple" CORS request Apps Script can
answer. Don't change that header.) Re-deploy after editing the script:
**Manage deployments → Edit → Version: New**.

> Prefer no code at all for the form? A **Google Form** whose responses feed a
> sheet is the zero-backend alternative — ask and I'll wire the button to one.

---

## Private data instead?

GitHub Pages + a public sheet is the simplest possible setup, but everything is
public. If the portfolio shouldn't be world-readable, this isn't the right host —
options include a password-gated host (Netlify/Vercel with access control) or a
proper auth'd backend. Ask and we'll pick one.
