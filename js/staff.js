/* ==========================================================================
   staff.js — Staff Systems page
   ========================================================================== */
(function (w) {
  'use strict';

  var ITL = w.ITL = w.ITL || {};
  var U = ITL.utils;
  var S = ITL.storage;
  var K = S.KEYS;
  var C = ITL.constants;
  var ui = ITL.ui;

  var pages = ITL.pages = ITL.pages || {};
  var staff = ITL.staffPage = {};

  var VIEW = 'staff';

  function view() {
    return ITL.state.view(VIEW, {
      search: '', page: 1, sortKey: 'pcName', sortDir: 'asc',
      filters: { status: '', department: '', os: '', ram: '' }
    });
  }

  function filtered() {
    var v = view();
    var f = v.filters;
    return ITL.data.staff().filter(function (r) {
      if (f.status && r.status !== f.status) return false;
      if (f.department && r.department !== f.department) return false;
      if (f.os && r.os !== f.os) return false;
      if (f.ram && r.ram !== f.ram) return false;
      if (v.search && !U.matches(r, v.search,
        ['id', 'pcName', 'staffName', 'department', 'serialNumber', 'processor', 'ram', 'storage', 'os', 'software', 'status', 'remarks'])) return false;
      return true;
    });
  }

  pages.staff = {
    title: 'Staff Systems',

    render: function (root, params) {
      var v = view();
      if (params && params.status) { v.filters.status = params.status; v.page = 1; }
      var all = ITL.data.staff();
      var st = ITL.data.stats().staff;

      root.innerHTML =
        '<div class="page-head">' +
        '<div><div class="page-title">Staff Systems</div>' +
        '<div class="page-sub">Computers assigned to staff members and offices</div></div>' +
        '<div class="page-head-actions">' +
        '<button class="btn btn-secondary" data-action="import">' + ITL.icon('upload') + 'Import Excel</button>' +
        '<button class="btn btn-excel" data-action="export">' + ITL.icon('excel') + 'Download Excel</button>' +
        '<button class="btn btn-primary" data-action="add">' + ITL.icon('plus') + 'Add Staff System</button>' +
        '</div></div>' +

        '<div class="stat-grid mb-4">' +
        ui.statCard({ label: 'Total systems', value: st.total, icon: 'users', color: '#8b5cf6', bg: 'var(--purple-bg)' }) +
        ui.statCard({ label: 'Working', value: st.byStatus['Working'] || 0, icon: 'checkCircle', color: '#10b981', bg: 'var(--success-bg)', action: 'filter-status', args: { status: 'Working' } }) +
        ui.statCard({ label: 'Pending', value: st.byStatus['Pending'] || 0, icon: 'clock', color: '#f59e0b', bg: 'var(--warn-bg)', action: 'filter-status', args: { status: 'Pending' } }) +
        ui.statCard({ label: 'Faulty', value: st.byStatus['Faulty'] || 0, icon: 'alert', color: '#ef4444', bg: 'var(--danger-bg)', action: 'filter-status', args: { status: 'Faulty' } }) +
        ui.statCard({ label: 'Hold', value: st.byStatus['Hold'] || 0, icon: 'slash', color: '#3b82f6', bg: 'var(--info-bg)', action: 'filter-status', args: { status: 'Hold' } }) +
        ui.statCard({ label: 'Retired', value: st.byStatus['Retired'] || 0, icon: 'archive', color: '#94a3b8', bg: 'var(--neutral-bg)', action: 'filter-status', args: { status: 'Retired' } }) +
        '</div>' +

        '<div class="card">' +
        '<div class="toolbar">' +
        ui.searchInput(v.search, 'Search staff name, PC name, department…') +
        ui.selectFilter('status', 'Status', C.STAFF_STATUS, v.filters.status) +
        ui.selectFilter('department', 'Department', U.uniqueValues(all, 'department'), v.filters.department) +
        ui.selectFilter('os', 'OS', U.uniqueValues(all, 'os'), v.filters.os) +
        ui.selectFilter('ram', 'RAM', U.uniqueValues(all, 'ram'), v.filters.ram) +
        '<div class="toolbar-spacer"></div>' +
        '<button class="btn btn-secondary btn-sm" data-action="clear-filters">' + ITL.icon('x') + 'Clear</button>' +
        '</div>' +
        '<div id="stFilterChips"></div>' +
        '<div id="stTable"></div>' +
        '</div>';

      renderTable(root);
      bind(root);
      if (params && params.focus) ui.highlightRow(params.focus);
      if (params && params.open) { var rec = ITL.data.staffMember(params.open); if (rec) staff.openDetail(rec.id); }
    }
  };

  function renderTable(root) {
    var v = view();
    var rows = filtered();
    var chips = root.querySelector('#stFilterChips');
    if (chips) chips.innerHTML = ui.filterChips(v.filters, { status: 'Status', department: 'Department', os: 'OS', ram: 'RAM' });

    ui.renderTable({
      mount: root.querySelector('#stTable'),
      view: v,
      noun: 'staff system',
      totalUnfiltered: ITL.data.staff().length,
      rows: rows,
      rowId: function (r) { return r.id; },
      rowClass: function (r) { return r.status === 'Faulty' ? 'row-danger' : (r.status === 'Pending' ? 'row-warn' : ''); },
      columns: [
        { key: 'id', label: 'ID', sortable: true, cls: 'cell-id', width: '92px' },
        {
          key: 'staffName', label: 'Staff / User', sortable: true, render: function (r) {
            return '<div class="cell-stack"><span class="cs-main">' + (U.esc(r.staffName) || '—') + '</span>' +
              (r.department ? '<span class="cs-sub">' + U.esc(r.department) + '</span>' : '') + '</div>';
          }
        },
        {
          key: 'pcName', label: 'PC Name', sortable: true, render: function (r) {
            return '<div class="cell-stack"><span class="cs-main">' + (U.esc(r.pcName) || '—') + '</span>' +
              (r.serialNumber ? '<span class="cs-sub mono">S/N ' + U.esc(r.serialNumber) + '</span>' : '') + '</div>';
          }
        },
        { key: 'processor', label: 'Processor', sortable: true },
        { key: 'ram', label: 'RAM', sortable: true, width: '84px' },
        { key: 'storage', label: 'Storage', sortable: true },
        { key: 'os', label: 'Operating System', sortable: true },
        { key: 'status', label: 'Status', sortable: true, width: '110px', render: function (r) { return ui.pcStatusBadge(r.status); } },
        { key: 'updatedAt', label: 'Updated', sortable: true, cls: 'cell-date', width: '112px', render: function (r) { return U.esc(U.fmtDate(r.updatedAt)); } }
      ],
      actions: function (r) {
        return ui.rowActions([
          { action: 'view', id: r.id, icon: 'eye', label: 'View details' },
          { action: 'edit', id: r.id, icon: 'edit', label: 'Edit' },
          { action: 'delete', id: r.id, icon: 'trash', label: 'Delete', danger: true }
        ]);
      },
      onRowClick: function (r) { staff.openDetail(r.id); },
      empty: {
        icon: 'users',
        title: 'No staff systems recorded',
        desc: 'Add the computers used by staff members, or import them from an existing Excel sheet.',
        actions: [
          { label: 'Add Staff System', icon: 'plus', cls: 'btn-primary', action: 'add' },
          { label: 'Import Excel', icon: 'upload', cls: 'btn-secondary', action: 'import' }
        ]
      },
      onChange: function () { renderTable(root); }
    });
  }

  function bind(root) {
    var v = view();
    var search = root.querySelector('[data-search]');
    if (search) search.addEventListener('input', U.debounce(function () {
      v.search = search.value; v.page = 1; renderTable(root);
    }, 200));

    U.on(root, 'change', '[data-filter]', function (e, el) {
      v.filters[el.getAttribute('data-filter')] = el.value; v.page = 1; renderTable(root);
    });
    U.on(root, 'click', '[data-clear-filter]', function (e, el) {
      v.filters[el.getAttribute('data-clear-filter')] = ''; v.page = 1; ITL.router.reload();
    });

    U.on(root, 'click', '[data-action]', function (e, el) {
      var a = el.getAttribute('data-action');
      var id = el.getAttribute('data-id');
      var args = el.getAttribute('data-args');
      try { args = args ? JSON.parse(args) : null; } catch (x) { args = null; }
      switch (a) {
        case 'add': staff.openForm(); break;
        case 'view': staff.openDetail(id); break;
        case 'edit': staff.openForm(id); break;
        case 'delete': staff.remove(id); break;
        case 'import': staff.importExcel(); break;
        case 'export': staff.exportExcel(); break;
        case 'clear-filters':
          v.search = ''; v.page = 1;
          Object.keys(v.filters).forEach(function (k) { v.filters[k] = ''; });
          ITL.router.reload();
          break;
        case 'filter-status':
          if (args && args.status) {
            v.filters.status = v.filters.status === args.status ? '' : args.status;
            v.page = 1; ITL.router.reload();
          }
          break;
      }
    });
  }

  /* ============================================================ ADD/EDIT */
  staff.openForm = function (id) {
    var editing = !!id;
    var rec = editing ? ITL.data.staffMember(id) : null;
    if (editing && !rec) { ITL.toast.error('Record not found'); return; }
    var d = rec || ITL.factory.staff({});
    var all = ITL.data.staff();

    var body =
      '<form id="stForm" novalidate autocomplete="off">' +
      '<div data-error-summary style="display:none;margin-bottom:16px"></div>' +

      '<fieldset class="form-section"><legend>' + ITL.icon('userCheck') + 'Identification</legend>' +
      '<div class="form-grid">' +
      '<div class="field"><label for="sfStaff">Staff / User Name <span class="req">*</span></label>' +
      '<input type="text" id="sfStaff" name="staffName" value="' + U.escAttr(d.staffName) + '" placeholder="e.g. Ahmed Khan" data-autofocus></div>' +

      '<div class="field"><label for="sfPc">PC Name <span class="req">*</span></label>' +
      '<input type="text" id="sfPc" name="pcName" value="' + U.escAttr(d.pcName) + '" placeholder="e.g. STAFF-PC-01">' +
      '<div class="help-text">Must be unique across staff systems.</div></div>' +

      '<div class="field"><label for="sfDept">Department</label>' +
      '<input type="text" id="sfDept" name="department" value="' + U.escAttr(d.department) + '" list="dlDept" placeholder="e.g. Administration">' +
      ui.datalist('dlDept', U.uniqueValues(all, 'department')) + '</div>' +

      '<div class="field"><label for="sfSerial">Serial Number</label>' +
      '<input type="text" id="sfSerial" name="serialNumber" value="' + U.escAttr(d.serialNumber) + '"></div>' +

      '<div class="field col-span-2"><label for="sfPassword">Password</label>' +
      '<div class="input-affix" style="max-width:320px"><input type="password" id="sfPassword" name="password" value="' + U.escAttr(d.password) + '" autocomplete="new-password">' +
      '<button type="button" class="affix-btn" data-toggle-pw="sfPassword" aria-label="Show password">' + ITL.icon('eye') + '</button></div>' +
      '<div class="help-text">Stored only in this browser. Never transmitted anywhere.</div></div>' +
      '</div></fieldset>' +

      '<fieldset class="form-section"><legend>' + ITL.icon('cpu') + 'Hardware</legend>' +
      '<div class="form-grid cols-3">' +
      '<div class="field"><label for="sfProc">Processor</label>' +
      '<input type="text" id="sfProc" name="processor" value="' + U.escAttr(d.processor) + '" list="dlProcS">' +
      ui.datalist('dlProcS', C.PROCESSOR_OPTIONS.concat(U.uniqueValues(all, 'processor'))) + '</div>' +
      '<div class="field"><label for="sfRam">RAM</label>' +
      '<input type="text" id="sfRam" name="ram" value="' + U.escAttr(d.ram) + '" list="dlRamS">' +
      ui.datalist('dlRamS', C.RAM_OPTIONS.concat(U.uniqueValues(all, 'ram'))) + '</div>' +
      '<div class="field"><label for="sfStorage">Storage</label>' +
      '<input type="text" id="sfStorage" name="storage" value="' + U.escAttr(d.storage) + '" list="dlStorS">' +
      ui.datalist('dlStorS', C.STORAGE_OPTIONS.concat(U.uniqueValues(all, 'storage'))) + '</div>' +
      '</div></fieldset>' +

      '<fieldset class="form-section"><legend>' + ITL.icon('layers') + 'Software</legend>' +
      '<div class="form-grid">' +
      '<div class="field"><label for="sfOs">Operating System</label>' +
      '<input type="text" id="sfOs" name="os" value="' + U.escAttr(d.os) + '" list="dlOsS">' +
      ui.datalist('dlOsS', C.OS_OPTIONS.concat(U.uniqueValues(all, 'os'))) + '</div>' +
      '<div class="field"><label for="sfSoftware">Software Installed</label>' +
      '<input type="text" id="sfSoftware" name="software" value="' + U.escAttr(d.software) + '" placeholder="e.g. MS Office, Tally"></div>' +
      '</div></fieldset>' +

      '<fieldset class="form-section"><legend>' + ITL.icon('activity') + 'Status &amp; remarks</legend>' +
      '<div class="form-grid">' +
      '<div class="field"><label for="sfStatus">Status <span class="req">*</span></label>' +
      '<select id="sfStatus" name="status">' + ui.options(C.STAFF_STATUS, d.status) + '</select></div>' +
      '<div class="field"></div>' +
      '<div class="field col-span-2"><label for="sfRemarks">Remarks</label>' +
      '<textarea id="sfRemarks" name="remarks" rows="2">' + U.esc(d.remarks) + '</textarea></div>' +
      '</div></fieldset></form>';

    ITL.modal.open({
      title: editing ? 'Edit staff system' : 'Add staff system',
      subtitle: editing ? d.id + ' · ' + (d.staffName || '') : 'Register a computer assigned to a staff member',
      icon: 'users',
      size: 'lg',
      body: body,
      footer:
        '<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>' +
        '<div style="flex:1"></div>' +
        '<button type="button" class="btn btn-primary" data-primary id="sfSave">' + ITL.icon('check') + (editing ? 'Save changes' : 'Add system') + '</button>',
      onMount: function (el, api) {
        ITL.inventory.bindPwToggles(el);
        el.querySelector('#sfSave').addEventListener('click', function () { save(el, api); });
        el.querySelector('#stForm').addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); save(el, api); }
        });
      }
    });

    function save(el, api) {
      var form = el.querySelector('#stForm');
      var data = ITL.validation.readForm(form);
      var res = ITL.validation.check(data, {
        staffName: { label: 'Staff / User Name', required: true, maxLength: 80 },
        pcName: { label: 'PC Name', required: true, maxLength: 60 },
        status: { label: 'Status', required: true, oneOf: C.STAFF_STATUS },
        remarks: { label: 'Remarks', maxLength: 500 }
      });
      if (!ITL.validation.apply(form, res)) return;

      var dupe = ITL.validation.checkStaffDuplicate(data, editing ? id : null);
      if (dupe.duplicate) {
        ITL.validation.warnDuplicate(dupe).then(function (ok) { if (ok) commit(el, api, data); });
        return;
      }
      commit(el, api, data);
    }

    function commit(el, api, data) {
      api.setBusy(true, 'Saving…');
      setTimeout(function () {
        try {
          if (editing) {
            var merged = Object.assign({}, rec, data, { updatedAt: U.nowISO() });
            S.replace(K.staff, id, merged);
            ITL.activity.log('Staff Systems', 'Updated', id, 'Staff system updated — ' + merged.pcName + ' (' + merged.staffName + ')');
            ITL.toast.success('Staff system updated', merged.pcName);
          } else {
            var created = ITL.factory.staff(data);
            S.insert(K.staff, created);
            ITL.activity.log('Staff Systems', 'Created', created.id, 'Staff system added — ' + created.pcName + ' (' + created.staffName + ')');
            ITL.toast.success('Staff system added', created.staffName + ' · ' + created.pcName);
          }
          api.setBusy(false);
          api.close();
          ITL.router.reload();
          ITL.app.refreshChrome();
        } catch (err) {
          api.setBusy(false);
          ITL.toast.error('Unable to save record', err.message);
        }
      }, 40);
    }
  };

  /* ============================================================== DETAIL */
  staff.openDetail = function (id) {
    var r = ITL.data.staffMember(id);
    if (!r) { ITL.toast.error('Record not found'); return; }

    ITL.modal.open({
      title: r.staffName || r.pcName || r.id,
      subtitle: r.id + ' · ' + (r.pcName || '') + (r.department ? ' · ' + r.department : ''),
      icon: 'users',
      size: 'lg',
      panel: true,
      body:
        '<div class="detail-section">' + ui.sectionTitle('Identification', 'userCheck') +
        '<div class="detail-grid">' +
        ui.field('Record ID', r.id, { mono: true }) +
        ui.field('Staff / User Name', r.staffName) +
        ui.field('PC Name', r.pcName) +
        ui.field('Department', r.department) +
        ui.field('Serial Number', r.serialNumber, { mono: true }) +
        ui.field('Password', ui.passwordCell(r.password), { html: true }) +
        '</div></div>' +
        '<div class="detail-section">' + ui.sectionTitle('Hardware', 'cpu') +
        '<div class="detail-grid">' +
        ui.field('Processor', r.processor) + ui.field('RAM', r.ram) + ui.field('Storage', r.storage) +
        '</div></div>' +
        '<div class="detail-section">' + ui.sectionTitle('Software', 'layers') +
        '<div class="detail-grid">' +
        ui.field('Operating System', r.os) + ui.field('Software Installed', r.software) +
        '</div></div>' +
        '<div class="detail-section">' + ui.sectionTitle('Status & audit', 'info') +
        '<div class="detail-grid">' +
        ui.field('Status', ui.pcStatusBadge(r.status), { html: true }) +
        ui.field('Created', U.fmtDateTime(r.createdAt)) +
        ui.field('Last updated', U.fmtDateTime(r.updatedAt)) +
        ui.field('Remarks', r.remarks, { full: true }) +
        '</div></div>',
      footer:
        '<button type="button" class="btn btn-danger-soft" data-sf="delete">' + ITL.icon('trash') + 'Delete</button>' +
        '<div style="flex:1"></div>' +
        '<button type="button" class="btn btn-primary" data-primary data-sf="edit">' + ITL.icon('edit') + 'Edit</button>',
      onMount: function (el, api) {
        U.on(el, 'click', '[data-sf]', function (e, b) {
          var act = b.getAttribute('data-sf');
          api.close();
          if (act === 'edit') staff.openForm(r.id);
          else if (act === 'delete') staff.remove(r.id);
        });
      }
    });
  };

  staff.remove = function (id) {
    var r = ITL.data.staffMember(id);
    if (!r) return;
    var doDelete = function () {
      S.delete(K.staff, id);
      ITL.activity.log('Staff Systems', 'Deleted', id, 'Staff system deleted — ' + (r.pcName || id));
      ITL.toast.success('Record deleted', (r.staffName || r.pcName || id) + ' removed');
      ITL.router.reload();
      ITL.app.refreshChrome();
    };
    if (ITL.settings.get().confirmDeletes === false) { doDelete(); return; }
    ITL.modal.confirm({
      heading: 'Delete staff system',
      title: 'Delete ' + (r.pcName || r.id) + '?',
      message: 'This permanently removes the staff system record from local storage.',
      tone: 'danger', confirmLabel: 'Delete record'
    }).then(function (ok) { if (ok) doDelete(); });
  };

  /* =============================================================== EXCEL */
  staff.exportExcel = function () {
    var rows = filtered(), all = ITL.data.staff(), v = view();
    ITL.exporter.chooseScope({ filteredCount: rows.length, totalCount: all.length, noun: 'staff systems' })
      .then(function (scope) {
        if (!scope) return;
        var data = scope === 'all' ? all : rows;
        if (!data.length) { ITL.toast.warn('Nothing to export', 'No staff systems to include.'); return; }
        var ft = [];
        if (scope !== 'all') {
          Object.keys(v.filters).forEach(function (k) { if (v.filters[k]) ft.push(U.titleCase(k) + ' = ' + v.filters[k]); });
          if (v.search) ft.push('Search: "' + v.search + '"');
        }
        ITL.modal.withBusy('Generating Excel…', 'Building the staff systems report', function () {
          var name = ITL.excel.exportCollection({
            schemaId: 'staff', rows: data,
            scope: scope === 'all' ? 'All records' : 'Filtered records',
            filters: ft.join(', ') || 'None',
            filenameBase: 'IT_Lab_Staff_Systems'
          });
          ITL.activity.log('Staff Systems', 'Exported', '', 'Downloaded ' + name + ' (' + data.length + ' records)');
          ITL.toast.success('Excel downloaded', name);
        });
      });
  };

  staff.importExcel = function () {
    ITL.importer.open({
      schemaId: 'staff',
      dupCheck: function (data) {
        if (data.id) { var byId = ITL.data.staffMember(data.id); if (byId) return byId; }
        var res = ITL.validation.checkStaffDuplicate(data, null);
        return res.duplicate ? res.record : null;
      },
      buildRecord: function (data) {
        var rec = ITL.factory.staff(data);
        rec.status = ITL.inventory.normalizeStatus(rec.status);
        return rec;
      },
      applyUpdate: function (existing, data) {
        var patch = {};
        Object.keys(data).forEach(function (k) {
          if (k === 'id' || k === 'createdAt') return;
          if (data[k] !== '' && data[k] !== null && data[k] !== undefined) patch[k] = data[k];
        });
        if (patch.status) patch.status = ITL.inventory.normalizeStatus(patch.status);
        return Object.assign({}, existing, patch, { updatedAt: U.nowISO() });
      },
      onDone: function () { ITL.router.reload(); }
    });
  };

})(window);
