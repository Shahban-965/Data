# Shakeel Networking — ATLAS Portable (v2 · fully renewed)

A completely renewed, **fully offline** IT Lab Management desktop application.
No web backend, no PHP, no Node server, no MySQL, and **no RAM-only database**.
Every record is written permanently into the `DATA` folder beside the
application as a `.json` file **and** a readable `.txt` copy.

> **Roman Urdu summary:** Poora project naya bana diya gaya hai — naya UI/frame,
> nayi CSS aur nayi motion. Excel ab **black & white** hai, **entry/update dates**
> hat gayi hain, download me **koi khali row ya column nahi** aati, aur agar data
> bilkul khaali ho to **koi empty file download hi nahi** hoti. Data ab RAM ya
> kisi ek PC ke browser me temporary nahi rehta: har save `DATA/*.json` +
> `DATA/*.txt` me verify ho kar likha jata hai, is liye project folder ko copy
> ya share karne par data hamesha saath jata hai.

---

## What is new in v2

| Area | v2 behaviour |
| --- | --- |
| UI / frame / CSS / motion | Entirely new **NOVA / ATLAS** design system (`css/nova.css`, `css/shell.css`, `css/motion.css`), new shell, new sign-in gate, new staged page motion, View Studio. All 14 old stylesheets and 3 old motion scripts were removed. |
| Excel | Completely rewritten engine. Strict **black & white**, header in **row 1**, data from **row 2**, no banner/blank/spacer/merged rows, no empty cells. |
| Audit dates | **Created At / Updated At (entry/update date)** are no longer exported or displayed. They remain internal only, for date filters. |
| Empty columns / rows | Columns empty in every record are dropped; rows with no value are dropped. `!ref` covers exactly the used range. |
| Empty downloads | If the prepared data has **zero rows or zero columns, nothing is downloaded** and a warning is shown. **One row or one column is enough** to produce a valid `.xlsx`. Empty sheets are removed from multi-sheet workbooks. |
| Data saving | Disk is the only source of truth. Atomic write → fsync → rename → read-back verification, plus a `.txt` mirror, a daily previous-version snapshot, and `save-log.txt`. A corrupt `.json` is repaired from its `.txt` twin and quarantined, never wiped. |
| Portability | The whole `DATA` folder (JSON + TXT) is the database. Copy/share the project folder and the same records arrive on the other PC. Appearance preferences and the local lock also live in `DATA`. |

### Main modules (unchanged functionality, new skin)

Dashboard and global search · PC inventory · Staff systems · Maintenance ·
Monthly archive · Store and stock movements · Purchases · Excel import/export
and reports · JSON backup/restore · Settings + View Studio · Activity history.

---

## Portable data design

```text
Shakeel-Networking/
├── Shakeel Networking ATLAS.exe
└── DATA/                         ← the complete database (copy this folder!)
    ├── pcs.json                 ← machine format
    ├── pcs.txt                  ← readable text mirror (same data)
    ├── staff.json / staff.txt
    ├── maintenance.json / .txt
    ├── store.json / .txt
    ├── stock-transactions.json / .txt
    ├── purchases.json / .txt
    ├── activity-logs.json / .txt
    ├── settings.json / .txt
    ├── ui-state.json / .txt     ← View Studio + sidebar preferences
    ├── meta.json / .txt         ← createdAt, lastWrite, writeCount, lastKey
    ├── auth.json / .txt         ← local convenience lock
    ├── import-history.json / .txt
    ├── save-log.txt             ← one line per verified save
    └── backup/
        ├── YYYY-MM-DD/          ← first previous version per file per day
        ├── corrupt-<stamp>/     ← damaged originals, never deleted
        └── manual-<timestamp>/  ← complete manual snapshots (JSON + TXT)
```

**How a save works**

1. The renderer serialises the whole collection.
2. The main process keeps one previous copy per file per day in `DATA/backup/YYYY-MM-DD`.
3. It writes `name.json.writing`, `fsync`s it, then renames it over `name.json`.
4. It writes `name.txt` (pretty-printed JSON text) the same atomic way.
5. It reads both files back and compares the parsed data. Only then is the save reported as successful.
6. `meta.json` gets `lastWrite`, `writeCount` and `lastKey`; `save-log.txt` gets an audit line.

If any step fails, the previous on-disk value stays authoritative, the UI shows
**"Data was not saved"**, and nothing is kept in RAM pretending to be saved.

The "last saved" date shown in the sidebar, Settings, and Backup pages comes
from `meta.json` inside `DATA` — not from the PC clock and not from a variable.

---

## Excel export contract (v2)

* Row 1 = headers, row 2+ = records. No title banner, no blank spacer row,
  no "no records available" note, no trailing empty row.
* Only cells with real values exist. A column with no values in any row is
  removed; a row with no values is removed.
* Palette is strictly `000000` / `FFFFFF`: white paper, black ink, black
  header with white bold type, thin black borders. No zebra banding.
* Real Excel dates (`dd-mmm-yyyy`), real numbers (`#,##0` / `#,##0.00`),
  frozen header row, AutoFilter on the real table range, sized columns.
* **No Created / Updated / Entry / Update date columns**, ever — even if a
  caller supplies one.
* Report metadata (organisation, title, scope, filters) lives in the workbook
  properties, not in extra sheet rows.
* If all sheets are empty, `ITL.excel.download()` returns `null` and shows a
  warning. No `.xlsx` file is created.

`npm run check` includes tests that assert all of the above.

---

## Build on Windows

1. Install Node.js LTS from https://nodejs.org/.
2. Extract this project to a normal writable folder.
3. Double-click `BUILD-WINDOWS.bat`, or run:

   ```bash
   npm install
   npm run check
   npm run build:win
   ```

4. The Windows build is created under `release/`.
5. For USB use, copy the portable EXE **and its `DATA` folder together**. On
   first launch missing `.json` / `.txt` pairs are created automatically.
6. On another PC, copy the complete application folder from the USB and run
   the EXE. The same records load — nothing is stored in that PC's browser.

`npm start` runs the desktop app in development mode against this project's
`DATA` folder. A plain static HTTP server is a **preview only**: it uses
`localStorage` and is clearly labelled as such in the UI.

---

## Existing data migration

The old browser edition stored data in LocalStorage. Open it and use
**Backup & Restore → Export full backup**, then in ATLAS use
**Backup & Restore → Restore backup** and select that JSON file. Check record
counts and reports before deleting the old copy. The bundled seed data loads
only when the database is empty; existing records are never overwritten.

---

## Important operating rules

* Always close the app before removing the USB drive or copying `DATA`.
* Never run two copies pointing at the same `DATA` folder (single-instance lock).
* Do not edit the JSON/TXT files while the app is running.
* Keep a second backup on another drive; a USB stick can fail.
* If a save error is shown, stop editing until the drive is reconnected.
* This is a single-writer portable app, not a shared multi-user database.

## Security notes

Deliberately local and backend-free. The login gate is a convenience lock, not
enterprise authentication; anyone with physical access to `DATA` can read or
change it. Do not store high-risk secrets there. Use BitLocker/device
encryption for sensitive institutional data.

## Validation

```bash
npm run check
```

Syntax-checks all project JavaScript and runs the portable-storage and Excel
contract tests (16 assertions). A passing static check is not a substitute for
testing every workflow on the target Windows PC with a real USB drive.
