# Shakeel Networking — Ultimate Portable Edition

A fully offline IT Lab Management application. The Windows desktop edition has **no web backend, no PHP, no Node server, and no MySQL**. It runs as a local Electron desktop application and stores the live database as readable UTF-8 JSON files in the `DATA` folder beside the application executable.

## Main modules

- Dashboard and global search
- PC inventory
- Staff systems
- Maintenance and repair history
- Monthly archive
- Store inventory and stock movements
- Purchases
- Excel import/export and reports
- JSON backup/restore
- Settings, themes and appearance studio
- Activity history

## Portable data design

```text
Shakeel-Networking/
├── Shakeel Networking Ultimate.exe
└── DATA/
    ├── pcs.json
    ├── staff.json
    ├── maintenance.json
    ├── store.json
    ├── stock-transactions.json
    ├── purchases.json
    ├── activity-logs.json
    ├── settings.json
    ├── import-history.json
    ├── ui-state.json
    ├── meta.json
    └── backup/
        ├── YYYY-MM-DD/          # first previous version per file per day
        └── manual-<timestamp>/  # complete manual snapshots
```

The app writes JSON using temporary files and replacement, and makes a previous-version copy before the first overwrite of each file per day. A manual full snapshot can be created from the sidebar. Do not edit JSON files while the app is open.

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
5. For USB use, copy the portable EXE and its `DATA` folder together into a folder on the USB drive. If the `DATA` folder does not exist on first launch, the app creates it automatically. After first run, close the app before safely ejecting the USB.
6. On another PC, copy the complete application folder from USB to that PC and run the EXE. The same JSON records will be loaded.

`npm start` runs the desktop app in development mode and uses this project's `DATA` folder.

## Existing data migration

The old browser edition stores data in that browser's LocalStorage. Before replacing it, open the old edition and use **Backup & Restore → Export full backup**. In the new desktop edition, use **Backup & Restore → Restore backup** and select that JSON backup. Check the record counts and reports before deleting the old copy. The initial bundled seed data loads only when the new database is empty; existing records are not intentionally overwritten by first-run seeding.

## Important operating rules

- Always close the app before removing the USB drive or copying the DATA folder.
- Never run two copies that point to the same DATA folder simultaneously.
- Do not open/edit the JSON files while the app is running.
- Keep a second backup on another drive. A USB drive can fail or be lost; local files alone are not a backup strategy.
- If a save error is shown, stop editing until the drive is reconnected and the issue is resolved.
- Do not use this app as a shared multi-user database. It is a single-writer portable desktop application; concurrent editing from multiple PCs is not supported.

## Security notes

This is deliberately a local, backend-free application. The login gate is a local convenience lock, not enterprise authentication. Anyone with physical access to the USB and JSON files may inspect or change data. Do not store high-risk secrets or unencrypted credentials in the DATA folder. Use Windows device encryption/BitLocker for the USB if sensitive institutional data is stored.

## Validation

Run `npm run check` to syntax-check the application JavaScript and execute the portable JSON storage tests. A successful static check is not a substitute for testing every workflow on the target Windows PC with a real USB drive.
