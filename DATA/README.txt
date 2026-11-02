SHAKEEL NETWORKING ATLAS — PERMANENT PORTABLE DATABASE (v2)
===========================================================

This folder IS the database. It travels with the application.

  *.json   machine format, one collection per file
  *.txt    readable text mirror of the SAME data (used for recovery)
  meta.json / meta.txt      createdAt, lastWrite, writeCount, lastKey
  ui-state.json / .txt     View Studio + sidebar preferences
  auth.json / .txt         local convenience lock
  save-log.txt             one line per verified save
  backup/                  daily previous versions, manual snapshots,
                           and quarantined corrupt originals

RULES
-----
1. Keep this ENTIRE DATA folder beside the portable application EXE.
2. To move to another PC: close the app, safely eject the USB, then copy the
   whole application folder (including DATA) to the other computer.
3. Copy or share the whole project folder and the records go with it. Nothing
   is stored in RAM only, in a browser only, or on one specific PC.
4. Every save is written twice (JSON + TXT), atomically, fsynced, and read
   back from disk before the app reports success.
5. A damaged .json is repaired from its .txt twin; the damaged original is
   kept in backup/corrupt-<timestamp>/ and is never deleted.
6. Do not edit or remove these files while the application is running.
7. Use the app's "Create safety backup" / Backup & Restore tools.

The .txt files are valid JSON too (pretty-printed), so they are both
human-readable and machine-recoverable.
