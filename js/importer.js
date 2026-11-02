/* ==========================================================================
   importer.js — Excel import wizard + export scope chooser
   Never imports unknown data without a preview and explicit confirmation.
   ========================================================================== */
(function (w) {
  'use strict';

  var ITL = w.ITL = w.ITL || {};
  var U = ITL.utils;
  var S = ITL.storage;
  var K = S.KEYS;

  /* ====================================================== EXPORT SCOPE UI */
  var exporter = ITL.exporter = {};

  /**
   * Ask the user whether to export filtered or all records.
   * Resolves 'filtered' | 'all' | null (cancelled).
   */
  exporter.chooseScope = function (opts) {
    opts = opts || {};
    var filtered = opts.filteredCount || 0;
    var total = opts.totalCount || 0;
    var noun = opts.noun || 'records';

    // No active filtering -> no need to ask
    if (filtered === total) return Promise.resolve('all');

    var dflt = (ITL.settings.get().exportDefaultScope === 'all') ? 'all' : 'filtered';

    return new Promise(function (resolve) {
      var settled = false;
      ITL.modal.open({
        title: 'Download Excel',
        subtitle: 'Choose which records to include',
        icon: 'excel',
        iconTone: 'success',
        size: 'sm',
        body:
          '<div class="stack-3">' +
          '<label class="check-card' + (dflt === 'filtered' ? ' selected' : '') + '" data-scope="filtered">' +
          '<input type="radio" name="scope" value="filtered"' + (dflt === 'filtered' ? ' checked' : '') + '>' +
          '<span><div class="cc-title">Current filtered records</div>' +
          '<div class="cc-desc">Exports the <b>' + U.fmtNum(filtered) + '</b> ' + U.esc(noun) + ' currently shown by your search and filters.</div></span></label>' +

          '<label class="check-card' + (dflt === 'all' ? ' selected' : '') + '" data-scope="all">' +
          '<input type="radio" name="scope" value="all"' + (dflt === 'all' ? ' checked' : '') + '>' +
          '<span><div class="cc-title">All records</div>' +
          '<div class="cc-desc">Exports every one of the <b>' + U.fmtNum(total) + '</b> ' + U.esc(noun) + ' stored in the application.</div></span></label>' +

          '<div class="alert alert-info" style="font-size:12px">' + ITL.icon('info') +
          '<div class="alert-body">The generated .xlsx always includes Excel AutoFilter and a frozen header row, so you can filter again inside Excel.</div></div>' +
          '</div>',
        footer:
          '<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>' +
          '<div style="flex:1"></div>' +
          '<button type="button" class="btn btn-excel" data-primary data-go>' + ITL.icon('download') + 'Download</button>',
        onClose: function () { if (!settled) { settled = true; resolve(null); } },
        onMount: function (el, api) {
          U.qsa('[data-scope]', el).forEach(function (card) {
            card.addEventListener('click', function () {
              U.qsa('[data-scope]', el).forEach(function (c) { c.classList.remove('selected'); });
              card.classList.add('selected');
              card.querySelector('input').checked = true;
            });
          });
          el.querySelector('[data-go]').addEventListener('click', function () {
            var v = (el.querySelector('input[name="scope"]:checked') || {}).value || dflt;
            settled = true;
            api.close();
            resolve(v);
          });
        }
      });
    });
  };

  /* ========================================================= IMPORT WIZARD */
  var importer = ITL.importer = {};

  var MODES = [
    { value: 'add', label: 'Add new only', desc: 'Skip any row that matches an existing record. Safest option.' },
    { value: 'update', label: 'Update existing only', desc: 'Only apply changes to records that already exist. No new records are created.' },
    { value: 'both', label: 'Add new + update existing', desc: 'Create new records and update the ones that already exist.' }
  ];

  /**
   * Open the import wizard.
   * cfg = { schemaId, title, dupCheck(data)->existing|null,
   *         buildRecord(data)->record, applyUpdate(existing,data)->record,
   *         onDone() }
   */
  importer.open = function (cfg) {
    var sc = ITL.schemas[cfg.schemaId];
    if (!sc) { ITL.toast.error('Import unavailable', 'Unknown record type.'); return; }
    if (!ITL.excel.isReady()) {
      ITL.toast.error('Excel engine missing', 'The SheetJS library could not be loaded.');
      return;
    }

    var st = {
      file: null, workbook: null, sheetName: '', grid: [], headerIndex: 0,
      headers: [], mapping: {}, entries: [], batch: null, mode: 'add'
    };

    /**
     * A row's "ID" column is only trusted when it looks like an ID this
     * application generated (e.g. PC-0007). Row numbers or foreign codes
     * from a third-party sheet must never become our record IDs.
     */
    function prep(data) {
      if (data.id && !ITL.schemas.isNativeId(cfg.schemaId, data.id)) {
        var d = {};
        Object.keys(data).forEach(function (k) { if (k !== 'id') d[k] = data[k]; });
        if (!d.remarks) d.remarks = '';
        return d;
      }
      return data;
    }
    var dupCheck = function (data) { return cfg.dupCheck ? cfg.dupCheck(prep(data)) : null; };
    var buildRecord = function (data) { return cfg.buildRecord(prep(data)); };
    var applyUpdate = function (existing, data) { return cfg.applyUpdate(existing, prep(data)); };

    var api = ITL.modal.open({
      title: 'Import ' + sc.label + ' from Excel',
      subtitle: 'Preview every row before anything is saved',
      icon: 'upload',
      size: 'xl',
      body: step1(),
      footer: footer1(),
      onMount: function (el, m) { bindStep1(el, m); }
    });

    /* ---------------------------------------------------------- STEP 1 */
    function step1() {
      return '<div id="impStep1">' +
        '<div class="dropzone" id="impDrop" tabindex="0" role="button" aria-label="Choose an Excel file">' +
        '<div class="dz-ico">' + ITL.icon('excel') + '</div>' +
        '<div class="dz-title">Drop your Excel file here, or click to browse</div>' +
        '<div class="dz-sub">Supported formats: .xlsx and .xls — nothing is saved until you confirm the preview</div>' +
        '</div>' +
        '<input type="file" id="impFile" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" class="hidden">' +
        '<div class="alert alert-info mt-4">' + ITL.icon('info') +
        '<div class="alert-body"><div class="alert-title">How column matching works</div>' +
        'Headers are matched automatically, ignoring capitalisation, spaces and punctuation — ' +
        '<code>PC NAME</code>, <code>PC Name</code>, <code>pc_name</code> and <code>Computer Name</code> all map to <b>PC Name</b>. ' +
        'You can correct any mapping in the next step.</div></div>' +
        '<div class="divider-label">Fields recognised for ' + U.esc(sc.label) + '</div>' +
        '<div class="row-2">' + sc.fields.map(function (f) {
          return '<span class="chip">' + U.esc(f.label) + '</span>';
        }).join('') + '</div>' +
        '</div>';
    }
    function footer1() {
      return '<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>' +
        '<div style="flex:1"></div>' +
        '<button type="button" class="btn btn-primary" data-primary id="impPick">' + ITL.icon('folder') + 'Choose file</button>';
    }
    function bindStep1(el, m) {
      var drop = el.querySelector('#impDrop');
      var input = el.querySelector('#impFile');
      var pick = el.querySelector('#impPick');
      if (!drop) return;
      var choose = function () { input.click(); };
      drop.addEventListener('click', choose);
      drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } });
      if (pick) pick.addEventListener('click', choose);

      ['dragenter', 'dragover'].forEach(function (ev) {
        drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('dragover'); });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('dragover'); });
      });
      drop.addEventListener('drop', function (e) {
        if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0], m);
      });
      input.addEventListener('change', function () {
        if (input.files && input.files[0]) handleFile(input.files[0], m);
      });
    }

    function handleFile(file, m) {
      if (!/\.(xlsx|xls|xlsm)$/i.test(file.name)) {
        ITL.toast.error('Unsupported file', 'Please choose an .xlsx or .xls workbook.');
        return;
      }
      st.file = file;
      m.setBody('<div style="padding:48px;text-align:center"><div class="load-spinner" style="margin:0 auto 14px"></div>' +
        '<div style="font-weight:700">Reading workbook…</div><div class="muted" style="font-size:12.5px">' + U.esc(file.name) + '</div></div>');
      m.setFooter('');

      ITL.excel.readFile(file).then(function (wb) {
        st.workbook = wb;
        st.sheetName = wb.SheetNames[0];
        loadSheet(st.sheetName);
        renderStep2(m);
      }).catch(function (err) {
        m.setBody('<div class="alert alert-danger">' + ITL.icon('alert') +
          '<div class="alert-body"><div class="alert-title">Could not read this file</div>' + U.esc(err.message) + '</div></div>');
        m.setFooter('<button type="button" class="btn btn-secondary" data-modal-close>Close</button>' +
          '<div style="flex:1"></div><button type="button" class="btn btn-primary" id="impRetry">Try another file</button>');
        var r = m.el.querySelector('#impRetry');
        if (r) r.addEventListener('click', function () { m.setBody(step1()); m.setFooter(footer1()); bindStep1(m.el, m); });
        U.qsa('[data-modal-close]', m.el).forEach(function (b) { b.addEventListener('click', function () { m.close(); }); });
      });
    }

    function loadSheet(name) {
      var ws = st.workbook.Sheets[name];
      st.grid = ITL.excel.sheetGrid(ws);
      var det = ITL.excel.detectHeaderRow(st.grid, cfg.schemaId);
      st.headerIndex = det.index;
      st.headers = det.headers;
      var mapRes = ITL.excel.mapColumns(st.headers, cfg.schemaId);
      st.mapping = mapRes.mapping;
      st.unmapped = mapRes.unmapped;
      revalidate();
    }

    function revalidate() {
      var ext = ITL.excel.extractRecords(st.grid, st.headerIndex, st.mapping, cfg.schemaId);
      st.entries = ext.records;
      st.skipped = ext.skipped;
      st.batch = ITL.excel.validateBatch(st.entries, cfg.schemaId, dupCheck);
    }

    /* ---------------------------------------------------------- STEP 2 */
    function renderStep2(m) {
      var b = st.batch;
      var total = st.entries.length;
      var mappedKeys = Object.keys(st.mapping).map(function (i) { return st.mapping[i]; });

      var sheetSel = st.workbook.SheetNames.length > 1
        ? '<div class="field" style="max-width:230px"><label for="impSheet">Worksheet</label>' +
        '<select id="impSheet">' + st.workbook.SheetNames.map(function (n) {
          return '<option value="' + U.escAttr(n) + '"' + (n === st.sheetName ? ' selected' : '') + '>' + U.esc(n) + '</option>';
        }).join('') + '</select></div>'
        : '';

      var headerSel = '<div class="field" style="max-width:230px"><label for="impHeaderRow">Header row</label>' +
        '<select id="impHeaderRow">' +
        st.grid.slice(0, Math.min(st.grid.length, 25)).map(function (r, i) {
          var preview = r.filter(function (c) { return c !== '' && c !== null; }).slice(0, 4).join(' | ').slice(0, 46);
          return '<option value="' + i + '"' + (i === st.headerIndex ? ' selected' : '') + '>Row ' + (i + 1) + ' — ' + U.esc(preview || '(empty)') + '</option>';
        }).join('') + '</select></div>';

      var summary =
        '<div class="preview-summary">' +
        '<div class="stat-tile"><div class="st-label">File</div><div class="st-value" style="font-size:13px;font-weight:600" title="' + U.escAttr(st.file.name) + '">' + U.esc(st.file.name.length > 24 ? st.file.name.slice(0, 22) + '…' : st.file.name) + '</div></div>' +
        '<div class="stat-tile"><div class="st-label">Sheet</div><div class="st-value" style="font-size:13px;font-weight:600">' + U.esc(st.sheetName) + '</div></div>' +
        '<div class="stat-tile"><div class="st-label">Records detected</div><div class="st-value">' + total + '</div></div>' +
        '<div class="stat-tile" style="border-color:var(--success-bd);background:var(--success-bg)"><div class="st-label" style="color:var(--success-fg)">Valid</div><div class="st-value" style="color:var(--success-fg)">' + b.valid.length + '</div></div>' +
        '<div class="stat-tile" style="border-color:var(--warn-bd);background:var(--warn-bg)"><div class="st-label" style="color:var(--warn-fg)">Duplicates</div><div class="st-value" style="color:var(--warn-fg)">' + b.duplicates.length + '</div></div>' +
        '<div class="stat-tile" style="border-color:var(--danger-bd);background:var(--danger-bg)"><div class="st-label" style="color:var(--danger-fg)">Errors</div><div class="st-value" style="color:var(--danger-fg)">' + b.errors.length + '</div></div>' +
        '</div>';

      // mapping editor
      var fieldOpts = '<option value="">— Ignore this column —</option>' +
        ITL.schemas[cfg.schemaId].fields.map(function (f) {
          return '<option value="' + U.escAttr(f.key) + '">' + U.esc(f.label) + '</option>';
        }).join('');

      var mapping = '<div style="max-height:200px;overflow:auto;padding-right:6px">' +
        st.headers.map(function (h, i) {
          if (!U.str(h)) return '';
          var sel = st.mapping[i] || '';
          return '<div class="map-row">' +
            '<div class="map-src" title="' + U.escAttr(h) + '">' + U.esc(h) + '</div>' +
            '<div class="map-arrow">' + ITL.icon('arrowRight') + '</div>' +
            '<select class="sm" data-map-col="' + i + '">' + fieldOpts.replace('value="' + U.escAttr(sel) + '"', 'value="' + U.escAttr(sel) + '" selected') + '</select>' +
            '</div>';
        }).join('') + '</div>';

      // preview rows (first 60)
      var previewFields = ITL.schemas[cfg.schemaId].fields.filter(function (f) {
        return mappedKeys.indexOf(f.key) >= 0;
      }).slice(0, 8);

      var allEntries = b.valid.map(function (e) { return { e: e, tag: 'ok' }; })
        .concat(b.duplicates.map(function (e) { return { e: e, tag: 'dupe' }; }))
        .concat(b.errors.map(function (e) { return { e: e, tag: 'err' }; }))
        .sort(function (a, z) { return a.e.rowNumber - z.e.rowNumber; });

      var previewTable = allEntries.length
        ? '<div class="preview-scroll"><table class="data-table preview-table"><thead><tr>' +
        '<th style="width:52px">Row</th><th style="width:82px">Status</th>' +
        previewFields.map(function (f) { return '<th>' + U.esc(f.label) + '</th>'; }).join('') +
        '<th>Notes</th></tr></thead><tbody>' +
        allEntries.slice(0, 80).map(function (x) {
          var e = x.e;
          return '<tr class="' + (x.tag === 'err' ? 'pv-error' : x.tag === 'dupe' ? 'pv-dupe' : '') + '">' +
            '<td class="mono muted">' + e.rowNumber + '</td>' +
            '<td><span class="pv-tag ' + x.tag + '">' + (x.tag === 'ok' ? 'Valid' : x.tag === 'dupe' ? 'Duplicate' : 'Error') + '</span></td>' +
            previewFields.map(function (f) {
              var v = e.data[f.key];
              if (f.type === 'date' && v) v = U.fmtDate(v);
              if (f.type === 'password' && v) v = '••••••';
              return '<td class="truncate" style="max-width:180px" title="' + U.escAttr(v) + '">' + (U.esc(v) || '<span class="muted">—</span>') + '</td>';
            }).join('') +
            '<td style="font-size:11.5px">' +
            (e.errors && e.errors.length ? U.esc(e.errors.join('; ')) :
              e.duplicateOf ? 'Matches existing ' + U.esc(e.duplicateOf) : '<span class="muted">—</span>') +
            '</td></tr>';
        }).join('') +
        '</tbody></table></div>' +
        (allEntries.length > 80 ? '<div class="help-text" style="margin-top:6px">Showing the first 80 of ' + allEntries.length + ' detected rows. All rows will be processed.</div>' : '')
        : ITL.ui.emptyState({ icon: 'inbox', compact: true, title: 'No data rows found', desc: 'Check that the correct worksheet and header row are selected.' });

      var modeCards = '<div class="stack-2">' + MODES.map(function (mo) {
        return '<label class="check-card' + (st.mode === mo.value ? ' selected' : '') + '" data-mode="' + mo.value + '">' +
          '<input type="radio" name="impMode" value="' + mo.value + '"' + (st.mode === mo.value ? ' checked' : '') + '>' +
          '<span><div class="cc-title">' + U.esc(mo.label) + '</div><div class="cc-desc">' + U.esc(mo.desc) + '</div></span></label>';
      }).join('') + '</div>';

      m.setBody(
        summary +
        '<div class="row-2" style="align-items:flex-end;gap:14px;margin-bottom:4px">' + sheetSel + headerSel +
        '<div style="flex:1"></div>' +
        '<button type="button" class="btn btn-secondary btn-sm" id="impReset">' + ITL.icon('refresh') + 'Choose a different file</button>' +
        '</div>' +
        '<div class="divider-label">Column mapping (' + Object.keys(st.mapping).length + ' of ' + st.headers.filter(function (h) { return U.str(h); }).length + ' columns matched)</div>' +
        mapping +
        '<div class="divider-label">Import mode</div>' +
        modeCards +
        '<div class="divider-label">Row preview</div>' +
        previewTable
      );

      var willAdd = st.mode === 'update' ? 0 : b.valid.length;
      var willUpdate = st.mode === 'add' ? 0 : b.duplicates.filter(function (e) { return e.existing; }).length;

      m.setFooter(
        '<div class="foot-left"><span class="muted" style="font-size:12.5px" id="impPlan">Will add <b>' + willAdd + '</b> · update <b>' + willUpdate + '</b> · skip <b>' + (b.errors.length + (b.duplicates.length - willUpdate)) + '</b></span></div>' +
        '<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>' +
        '<button type="button" class="btn btn-primary" data-primary id="impRun"' + ((willAdd + willUpdate) ? '' : ' disabled') + '>' +
        ITL.icon('upload') + 'Import ' + (willAdd + willUpdate) + ' record' + ((willAdd + willUpdate) === 1 ? '' : 's') + '</button>'
      );

      // bind
      var el = m.el;
      U.qsa('[data-modal-close]', el).forEach(function (b2) {
        if (!b2._bound) { b2._bound = 1; b2.addEventListener('click', function () { m.close(); }); }
      });
      var sh = el.querySelector('#impSheet');
      if (sh) sh.addEventListener('change', function () { st.sheetName = sh.value; loadSheet(sh.value); renderStep2(m); });
      var hr = el.querySelector('#impHeaderRow');
      if (hr) hr.addEventListener('change', function () {
        st.headerIndex = U.int(hr.value, 0);
        st.headers = (st.grid[st.headerIndex] || []).map(function (c) { return U.str(c); });
        var mr = ITL.excel.mapColumns(st.headers, cfg.schemaId);
        st.mapping = mr.mapping;
        revalidate();
        renderStep2(m);
      });
      U.qsa('[data-map-col]', el).forEach(function (s2) {
        s2.addEventListener('change', function () {
          var ci = U.int(s2.getAttribute('data-map-col'), 0);
          var val = s2.value;
          // a field may only be used once
          Object.keys(st.mapping).forEach(function (k) { if (st.mapping[k] === val) delete st.mapping[k]; });
          if (val) st.mapping[ci] = val; else delete st.mapping[ci];
          revalidate();
          renderStep2(m);
        });
      });
      U.qsa('[data-mode]', el).forEach(function (card) {
        card.addEventListener('click', function () {
          st.mode = card.getAttribute('data-mode');
          U.qsa('[data-mode]', el).forEach(function (c) { c.classList.remove('selected'); });
          card.classList.add('selected');
          card.querySelector('input').checked = true;
          renderStep2(m);
        });
      });
      var reset = el.querySelector('#impReset');
      if (reset) reset.addEventListener('click', function () {
        st.file = null; st.workbook = null;
        m.setBody(step1()); m.setFooter(footer1()); bindStep1(el, m);
      });
      var run = el.querySelector('#impRun');
      if (run) run.addEventListener('click', function () { runImport(m); });
    }

    /* ---------------------------------------------------------- IMPORT */
    function runImport(m) {
      m.setBusy(true, 'Importing…');
      setTimeout(function () {
        var b = st.batch;
        var added = 0, updated = 0, skipped = 0;
        var newRecords = [];

        if (st.mode !== 'update') {
          b.valid.forEach(function (e) {
            try { newRecords.push(buildRecord(e.data)); added++; }
            catch (err) { console.error(err); skipped++; }
          });
        } else {
          skipped += b.valid.length;
        }

        if (st.mode !== 'add') {
          b.duplicates.forEach(function (e) {
            if (!e.existing) { skipped++; return; }
            try {
              var merged = applyUpdate(e.existing, e.data);
              S.replace(ITL.schemas[cfg.schemaId].storageKey, e.existing.id, merged);
              updated++;
            } catch (err) { console.error(err); skipped++; }
          });
        } else {
          skipped += b.duplicates.length;
        }

        skipped += b.errors.length;

        if (newRecords.length) {
          S.insertMany(ITL.schemas[cfg.schemaId].storageKey, newRecords);
        }

        // import history
        var hist = S.list(K.importHistory);
        hist.unshift({
          id: U.uid('IMP'),
          date: U.nowISO(),
          module: ITL.schemas[cfg.schemaId].label,
          fileName: st.file.name,
          sheet: st.sheetName,
          detected: st.entries.length,
          added: added, updated: updated, skipped: skipped,
          errors: b.errors.length,
          mode: st.mode
        });
        S.set(K.importHistory, hist.slice(0, 200));

        ITL.activity.log(ITL.schemas[cfg.schemaId].label, 'Imported', st.file.name,
          'Excel import — added ' + added + ', updated ' + updated + ', skipped ' + skipped + ' from ' + st.file.name);

        m.setBusy(false);

        // verification pass
        var after = S.list(ITL.schemas[cfg.schemaId].storageKey).length;

        m.setBody(
          '<div class="empty-state" style="padding:24px 12px">' +
          '<div class="es-ico" style="background:var(--success-bg);color:var(--success-fg)">' + ITL.icon('checkCircle') + '</div>' +
          '<h4>Import complete</h4>' +
          '<p>' + U.esc(st.file.name) + ' → ' + U.esc(ITL.schemas[cfg.schemaId].label) + '</p></div>' +
          '<div class="preview-summary">' +
          '<div class="stat-tile" style="border-color:var(--success-bd);background:var(--success-bg)"><div class="st-label" style="color:var(--success-fg)">Added</div><div class="st-value" style="color:var(--success-fg)">' + added + '</div></div>' +
          '<div class="stat-tile" style="border-color:var(--info-bd);background:var(--info-bg)"><div class="st-label" style="color:var(--info-fg)">Updated</div><div class="st-value" style="color:var(--info-fg)">' + updated + '</div></div>' +
          '<div class="stat-tile"><div class="st-label">Skipped</div><div class="st-value">' + skipped + '</div></div>' +
          '<div class="stat-tile"><div class="st-label">Total now stored</div><div class="st-value">' + after + '</div></div>' +
          '</div>' +
          (b.errors.length
            ? '<div class="divider-label">Rows that could not be imported</div>' +
            '<div class="preview-scroll" style="max-height:190px"><table class="data-table compact-table"><thead><tr><th style="width:60px">Row</th><th>Problem</th></tr></thead><tbody>' +
            b.errors.map(function (e) {
              return '<tr><td class="mono muted">' + e.rowNumber + '</td><td>' + U.esc(e.errors.join('; ')) + '</td></tr>';
            }).join('') + '</tbody></table></div>'
            : '')
        );
        m.setFooter('<div style="flex:1"></div><button type="button" class="btn btn-primary" data-primary id="impDone">' + ITL.icon('check') + 'Done</button>');
        var done = m.el.querySelector('#impDone');
        done.addEventListener('click', function () {
          m.close();
          if (cfg.onDone) cfg.onDone({ added: added, updated: updated, skipped: skipped });
          ITL.app.refreshChrome();
        });

        ITL.toast.success('Import finished', added + ' added · ' + updated + ' updated · ' + skipped + ' skipped');
      }, 60);
    }
  };

})(window);
