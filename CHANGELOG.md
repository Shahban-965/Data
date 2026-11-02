# Changelog

## 2.0.0 — ATLAS (complete renewal)

### New interface
- Replaced all 14 v1 stylesheets with three new files: `css/nova.css`
  (design system), `css/shell.css` (frame), `css/motion.css` (choreography).
- New application shell: ink rail, paper header, dotted canvas, responsive
  mobile drawer, new boot screen and new split-screen sign-in gate.
- New single motion engine (`js/motion.js`) replacing `motion-fx.js`,
  `motion2.js` and `arrows.js`: staged page entrance, scroll reveal, number
  count-up, ripples, cursor spotlight, page wipe, reduced-motion support.
- New **View Studio** (`js/appearance.js`): light/ink mode, four accents,
  corner shapes, density, motion switch. Preferences are saved permanently in
  `DATA/ui-state.json`, so they travel with the project.

### Excel (fully rewritten `js/excel.js`)
- Strict black & white styling (only `000000` / `FFFFFF`).
- Header in row 1, data from row 2. Removed title banners, blank spacer rows,
  merged cells, "no records" note and trailing empty rows.
- Empty columns, empty rows and empty cells are removed automatically.
- No download at all when there is no data; one row or one column is enough.
- Empty sheets are dropped from multi-sheet workbooks; callers now abort
  cleanly when a download is cancelled.
- Created/Updated (entry/update) date columns removed from schemas, exports
  and visible detail/table views; internal timestamps remain for filters.
- Report metadata moved to workbook properties instead of sheet rows.

### Permanent data engine (`main.js`, `preload.js`, `js/storage.js`)
- No in-memory database: every read goes to the real DATA file; a failed write
  never becomes a RAM-only "saved" value.
- Each save writes `<name>.json` **and** `<name>.txt`, atomically with fsync,
  rename and read-back verification.
- Daily previous-version snapshots, manual snapshots including `.txt` files,
  `save-log.txt` audit trail, and `meta.json` `lastWrite` / `writeCount`.
- Corrupt JSON is repaired from the `.txt` mirror; damaged originals are
  quarantined in `DATA/backup/corrupt-<stamp>/` instead of being wiped.
- `ensureFiles`, `status`, `verify`, `flush` APIs; Settings / Backup pages and
  the sidebar now show real disk health and the last permanent save.
- Login token and appearance prefs also live in DATA, not device-local storage.
- Added 14 automated contract tests (16 assertions total with `npm run check`).

### Housekeeping
- Version 2.0.0, new title/manifest, refreshed README + DATA/README.txt,
- service-worker cache refreshed for the new asset list, generated backups
  and save logs excluded from Git.
