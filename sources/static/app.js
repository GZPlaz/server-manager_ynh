/* Server Manager - web file manager for YunoHost */
(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------

  const $ = (id) => document.getElementById(id);
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const ICONS = {
    logo: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01M11 7.5h6M11 16.5h6"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    text: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4"/>',
    extract: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M12 11v6M9 14l3 3 3-3"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
    special: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l2 2"/>',
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    forward: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    uploadFolder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 16v-6M9 13l3-3 3 3"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    folderPlus: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10v6M9 13h6"/>',
    filePlus: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11v6M9 14h6"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
    rename: '<path d="M4 7V5h16v2M12 5v14M9 19h6"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
    cut: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.2 8.2L20 20M8.2 15.8L20 4"/>',
    paste: '<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 15h18"/>',
    open: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/>',
    maximize: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    save: '<path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
    replace: '<path d="M4 7h11l-3-3M20 17H9l3 3"/>',
    goto: '<path d="M4 6h10M4 12h16M4 18h10"/><path d="M17 4l3 2-3 2"/>',
    comment: '<path d="M7 4L5 20M15 4l-2 16M4 9h16M3 15h16"/>',
    wrap: '<path d="M4 6h16M4 12h13a3 3 0 0 1 0 6h-4"/><path d="M15 16l-2 2 2 2M4 18h5"/>',
    code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13 5l-2 14"/>',
  };

  function icon(name) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'i');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = ICONS[name] || ICONS.file; // static, trusted markup
    return svg;
  }

  // Create an element: h('div', {class: 'x', onclick: fn}, child, 'text', ...)
  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k === 'style') Object.assign(el.style, v); // CSSOM: allowed by the CSP
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k in el && typeof v !== 'string') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) {
      if (c === null || c === undefined || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem('sm.' + key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('sm.' + key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    },
  };

  function fmtSize(n) {
    if (n === undefined || n === null) return '';
    if (n < 1024) return n + ' B';
    const units = ['KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
    let v = n / 1024;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return (v >= 100 ? v.toFixed(0) : v.toFixed(1)) + ' ' + units[i];
  }

  function fmtDate(sec) {
    if (!sec) return '';
    const d = new Date(sec * 1000);
    const p = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function fmtTime(d) {
    const p = (x) => String(x).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  function joinPath(dir, name) {
    return dir === '/' ? '/' + name : dir + '/' + name;
  }

  function parentPath(p) {
    if (p === '/') return '/';
    const i = p.lastIndexOf('/');
    return i <= 0 ? '/' : p.slice(0, i);
  }

  function baseName(p) {
    return p === '/' ? '/' : p.slice(p.lastIndexOf('/') + 1);
  }

  function ancestors(p) {
    const out = ['/'];
    let cur = '';
    for (const part of p.split('/').filter(Boolean)) {
      cur += '/' + part;
      out.push(cur);
    }
    return out;
  }

  const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'avif'];
  const ARCHIVE_SUFFIXES = ['.zip', '.tar', '.tar.gz', '.tgz', '.tar.bz2', '.tbz2', '.tar.xz', '.txz'];

  const extOf = (name) => {
    const i = name.lastIndexOf('.');
    return i > 0 ? name.slice(i + 1).toLowerCase() : '';
  };
  const isImage = (name) => IMAGE_EXT.includes(extOf(name));
  const isArchive = (name) => ARCHIVE_SUFFIXES.some((s) => name.toLowerCase().endsWith(s));

  const isDirLike = (e) => e.type === 'dir' || (e.type === 'link' && e.target_type === 'dir');
  const isFileLike = (e) => e.type === 'file' || (e.type === 'link' && e.target_type === 'file');

  function typeLabel(e) {
    if (e.type === 'dir') return 'Folder';
    if (e.type === 'link') return e.target_type === 'dir' ? 'Link to folder' : (e.target_type === 'broken' ? 'Broken link' : 'Link');
    if (e.type === 'special') return 'Special file';
    const ext = extOf(e.name);
    return ext ? ext.toUpperCase() + ' file' : 'File';
  }

  function entryIcon(e) {
    if (e.type === 'dir') return ['folder', 'dir'];
    if (e.type === 'link') return [e.target_type === 'dir' ? 'folder' : 'link', 'link'];
    if (e.type === 'special') return ['special', ''];
    if (isImage(e.name)) return ['image', ''];
    if (isArchive(e.name)) return ['archive', ''];
    return ['text', ''];
  }

  // ---------------------------------------------------------------------------
  // API
  // ---------------------------------------------------------------------------

  class ApiError extends Error {
    constructor(status, message, data) {
      super(message);
      this.status = status;
      this.data = data || {};
    }
  }

  const SESSION_HINT = 'Unexpected answer from the server. Your session may have expired: reload the page.';

  function apiUrl(endpoint, params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params || {})) {
      for (const item of [].concat(v)) qs.append(k, item);
    }
    const s = qs.toString();
    return 'api/' + endpoint + (s ? '?' + s : '');
  }

  async function api(method, endpoint, { params, body } = {}) {
    const opts = { method, headers: { 'X-Requested-With': 'ServerManager' }, credentials: 'same-origin' };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    let res;
    try {
      res = await fetch(apiUrl(endpoint, params), opts);
    } catch (e) {
      throw new ApiError(0, 'Could not reach the server. ' + SESSION_HINT);
    }
    const ctype = res.headers.get('Content-Type') || '';
    if (!ctype.includes('application/json')) {
      throw new ApiError(res.status, res.ok ? SESSION_HINT : `${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    if (!res.ok) throw new ApiError(res.status, data.error || res.statusText, data);
    return data;
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const S = {
    info: null,
    cwd: null,
    writable: true,
    disk: null,
    entries: [],
    view: [],
    byPath: new Map(),
    selected: new Set(),
    focus: null,
    anchor: null,
    sort: store.get('sort', { key: 'name', desc: false }),
    showHidden: store.get('hidden', true),
    filter: '',
    search: null,
    clipboard: null,
    tree: new Map(),
    bookmarks: store.get('bookmarks', null),
    loadSeq: 0,
    lastPointer: 'mouse',
  };

  // ---------------------------------------------------------------------------
  // Log, toasts
  // ---------------------------------------------------------------------------

  const LEVEL_LABEL = { info: 'Status:', ok: 'Status:', error: 'Error:' };

  function logMsg(level, text) {
    const list = $('log');
    list.append(h('li', { class: level },
      h('time', { text: fmtTime(new Date()) }),
      h('span', { class: 'lvl', text: LEVEL_LABEL[level] || '' }), ' ', text));
    while (list.childElementCount > 500) list.firstElementChild.remove();
    const panel = $('panel-log');
    panel.scrollTop = panel.scrollHeight;
  }

  function toast(text, kind = 'info') {
    const el = h('div', { class: 'toast ' + kind, text });
    $('toasts').append(el);
    setTimeout(() => el.remove(), kind === 'error' ? 8000 : 3500);
  }

  function fail(err, context) {
    const msg = err && err.message ? err.message : String(err);
    logMsg('error', context ? `${context}: ${msg}` : msg);
    toast(context ? `${context}: ${msg}` : msg, 'error');
  }

  // ---------------------------------------------------------------------------
  // Dialogs
  // ---------------------------------------------------------------------------

  let openModals = 0;

  function modal({ title, body, buttons, wide, onOpen }) {
    return new Promise((resolve) => {
      let result = null;
      const form = h('form', { method: 'dialog' });
      const dlg = h('dialog', { class: 'modal' + (wide ? ' wide' : '') }, form);
      const foot = h('div', { class: 'modal-foot' });
      for (const b of buttons) {
        foot.append(h('button', {
          class: 'btn' + (b.kind ? ' ' + b.kind : '') + (b.left ? ' left' : ''),
          type: b.submit ? 'submit' : 'button',
          text: b.label,
          onclick: (ev) => {
            ev.preventDefault();
            if (b.validate && !b.validate()) return;
            result = b.value;
            dlg.close();
          },
        }));
      }
      form.append(h('div', { class: 'modal-head', text: title }),
        h('div', { class: 'modal-body' }, typeof body === 'string' ? h('p', { text: body }) : body),
        foot);
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const def = buttons.find((b) => b.submit);
        if (!def || (def.validate && !def.validate())) return;
        result = def.value;
        dlg.close();
      });
      dlg.addEventListener('close', () => {
        openModals--;
        dlg.remove();
        resolve(result);
      });
      if (typeof dlg.showModal !== 'function') {
        // Minimal fallback for browsers without <dialog> support (Safari < 15.4)
        dlg.classList.add('fallback');
        dlg.showModal = () => dlg.setAttribute('open', '');
        dlg.close = () => {
          if (!dlg.hasAttribute('open')) return;
          dlg.removeAttribute('open');
          dlg.dispatchEvent(new Event('close'));
        };
        dlg.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') dlg.close(); });
      }
      document.body.append(dlg);
      openModals++;
      dlg.showModal();
      if (onOpen) onOpen(dlg);
    });
  }

  async function confirmBox(title, message, okLabel = 'OK', danger = false, extra = null) {
    const body = h('div', {}, h('p', { text: message }), extra);
    const r = await modal({
      title,
      body,
      buttons: [
        { label: 'Cancel', value: false },
        { label: okLabel, value: true, kind: danger ? 'danger' : 'primary', submit: true },
      ],
    });
    return r === true;
  }

  async function promptBox(title, label, value = '', { okLabel = 'OK', selectBase = false } = {}) {
    const input = h('input', { type: 'text', value, spellcheck: 'false', autocomplete: 'off' });
    const r = await modal({
      title,
      body: h('label', { class: 'field' }, h('span', { text: label }), input),
      buttons: [
        { label: 'Cancel', value: null },
        { label: okLabel, value: 'ok', kind: 'primary', submit: true, validate: () => input.value.trim() !== '' },
      ],
      onOpen: () => {
        input.focus();
        const dot = value.lastIndexOf('.');
        if (selectBase && dot > 0) input.setSelectionRange(0, dot);
        else input.select();
      },
    });
    return r === 'ok' ? input.value.trim() : null;
  }

  function nameList(names, max = 12) {
    const list = h('ul', { class: 'name-list' });
    names.slice(0, max).forEach((n) => list.append(h('li', { text: n, title: n })));
    if (names.length > max) list.append(h('li', { class: 'muted', text: `… and ${names.length - max} more` }));
    return list;
  }

  async function reportResult(r, verb, context) {
    if (r.errors && r.errors.length) {
      r.errors.forEach((e) => logMsg('error', `${context}: ${e.path}: ${e.error}`));
      await modal({
        title: `Some items could not be ${verb}`,
        body: h('div', {},
          h('p', { text: `${r.done || 0} succeeded, ${r.errors.length} failed:` }),
          nameList(r.errors.map((e) => `${e.path}: ${e.error}`), 30)),
        buttons: [{ label: 'OK', value: true, kind: 'primary', submit: true }],
        wide: true,
      });
    } else {
      toast(`${context}: done`, 'ok');
    }
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/');

  function hashPath() {
    try {
      return decodeURIComponent(location.hash.slice(1)) || '/';
    } catch (e) {
      return '/';
    }
  }

  function go(path) {
    const target = '#' + encodePath(path);
    if (location.hash === target) load(path);
    else location.hash = target;
  }

  async function load(path, opts = {}) {
    const seq = ++S.loadSeq;
    document.body.style.cursor = 'progress';
    try {
      const data = await api('GET', 'list', { params: { path } });
      if (seq !== S.loadSeq) return;
      const changed = data.path !== S.cwd;
      S.cwd = data.path;
      S.writable = data.writable;
      S.disk = data.disk || null;
      S.entries = data.entries.map((e) => Object.assign(e, { path: joinPath(data.path, e.name), dir: data.path }));
      if (changed) {
        S.selected.clear();
        S.focus = null;
        S.anchor = null;
        S.search = null;
        S.filter = '';
        $('search').value = '';
        $('table-wrap').scrollTop = 0;
        logMsg('ok', `Directory listing of "${S.cwd}" successful (${plural(S.entries.length, 'item')})` +
          (data.unreadable ? `, ${data.unreadable} unreadable` : ''));
      } else if (S.search && !opts.keepSearch) {
        await runSearch(S.search.query, true);
      }
      if (opts.select) {
        S.selected = new Set(opts.select);
        S.focus = opts.select[0] || null;
        S.anchor = S.focus;
      }
      $('address').value = S.cwd;
      const wanted = '#' + encodePath(S.cwd);
      if (location.hash !== wanted) history.replaceState(null, '', wanted);
      render();
      if (opts.select && opts.select[0]) scrollToPath(opts.select[0]);
      revealInTree(S.cwd);
    } catch (err) {
      if (seq !== S.loadSeq) return;
      fail(err, `Could not open ${path}`);
      if (S.cwd === null) {
        if (path !== '/') go('/');
      } else {
        $('address').value = S.cwd;
        history.replaceState(null, '', '#' + encodePath(S.cwd));
      }
    } finally {
      if (seq === S.loadSeq) document.body.style.cursor = '';
    }
  }

  function refresh() {
    if (S.cwd === null) return Promise.resolve();
    reloadTreeNodes([S.cwd]);
    return load(S.cwd);
  }

  // ---------------------------------------------------------------------------
  // File list rendering
  // ---------------------------------------------------------------------------

  function baseList() {
    return S.search ? S.search.results : S.entries;
  }

  function computeView() {
    let list = baseList();
    if (!S.showHidden) list = list.filter((e) => !e.name.startsWith('.'));
    if (S.filter && !S.search) {
      const f = S.filter.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(f));
    }
    const { key, desc } = S.sort;
    const dir = desc ? -1 : 1;
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    list = list.slice().sort((a, b) => {
      const da = isDirLike(a) ? 0 : 1;
      const db = isDirLike(b) ? 0 : 1;
      if (da !== db) return da - db;
      let r = 0;
      if (key === 'size' || key === 'mtime') r = (a[key] || 0) - (b[key] || 0);
      else if (key === 'type') r = collator.compare(typeLabel(a), typeLabel(b));
      else if (key === 'owner') r = collator.compare(a.owner + ':' + a.group, b.owner + ':' + b.group);
      else if (key === 'perms') r = collator.compare(a.perms, b.perms);
      if (r === 0) r = collator.compare(a.name, b.name);
      return r * dir;
    });
    S.view = list;
    S.byPath = new Map(baseList().map((e) => [e.path, e]));
    for (const p of [...S.selected]) if (!S.byPath.has(p)) S.selected.delete(p);
  }

  function render() {
    computeView();
    const tbody = $('rows');
    const frag = document.createDocumentFragment();

    if (!S.search && S.cwd !== '/') {
      const tr = h('tr', { class: 'parent-row', dataset: { parent: '1', path: parentPath(S.cwd) } },
        h('td', { class: 'c-check' }),
        h('td', { class: 'c-name' }, h('div', { class: 'name-cell' },
          h('span', { class: 'ficon dir' }, icon('folder')), h('span', { class: 'name', text: '..' }))),
        h('td', { class: 'c-size' }), h('td', { class: 'c-type', text: 'Parent folder' }),
        h('td', { class: 'c-mtime' }), h('td', { class: 'c-perms' }), h('td', { class: 'c-owner' }));
      frag.append(tr);
    }

    const cutPaths = S.clipboard && S.clipboard.mode === 'cut' ? new Set(S.clipboard.paths) : null;
    for (const e of S.view) {
      const [ic, icCls] = entryIcon(e);
      const nameCell = h('div', { class: 'name-cell' },
        h('span', { class: 'ficon ' + icCls }, icon(ic)),
        h('span', { class: 'name', text: e.name, title: e.name }));
      if (e.type === 'link') {
        nameCell.append(h('span', { class: 'sub' + (e.target_type === 'broken' ? ' broken' : ''), text: '→ ' + e.target, title: e.target }));
      }
      if (S.search) {
        nameCell.append(h('span', { class: 'sub', text: 'in ' + e.dir, title: e.dir }));
      }
      const selected = S.selected.has(e.path);
      const tr = h('tr', {
        class: [selected ? 'selected' : '', S.focus === e.path ? 'focused' : '', cutPaths && cutPaths.has(e.path) ? 'cut' : ''].join(' ').trim(),
        draggable: 'true',
        dataset: { path: e.path },
      },
      h('td', { class: 'c-check' }, h('input', { type: 'checkbox', checked: selected, tabindex: '-1', 'aria-label': 'Select ' + e.name })),
      h('td', { class: 'c-name' }, nameCell),
      h('td', { class: 'c-size num', text: isDirLike(e) ? '' : fmtSize(e.size), title: isDirLike(e) ? '' : e.size.toLocaleString() + ' bytes' }),
      h('td', { class: 'c-type', text: typeLabel(e) }),
      h('td', { class: 'c-mtime num', text: fmtDate(e.mtime) }),
      h('td', { class: 'c-perms mono', text: e.perms, title: e.mode }),
      h('td', { class: 'c-owner', text: `${e.owner} ${e.group}`, title: `owner: ${e.owner}, group: ${e.group}` }));
      frag.append(tr);
    }
    tbody.replaceChildren(frag);

    $('empty').classList.toggle('hidden', S.view.length > 0);
    $('empty').textContent = S.search
      ? 'No results.'
      : (baseList().length ? 'All items are hidden by the current filter.' : 'This folder is empty. Drop files here to upload them.');

    document.querySelectorAll('.listing th.sortable').forEach((th) => {
      th.classList.toggle('sorted', th.dataset.sort === S.sort.key);
      th.classList.toggle('desc', th.dataset.sort === S.sort.key && S.sort.desc);
    });

    const banner = $('search-banner');
    if (S.search) {
      banner.replaceChildren(
        icon('search'),
        h('span', { text: `${plural(S.search.results.length, 'result')} for “${S.search.query}” in ${S.search.path}` +
          (S.search.truncated ? ' (search stopped early, refine your query)' : '') }),
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn', type: 'button', text: 'Back to folder', onclick: exitSearch }));
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }

    updateSelectionUi();
    renderBookmarks();
  }

  function updateSelectionUi() {
    document.querySelectorAll('#rows tr[data-path]:not([data-parent])').forEach((tr) => {
      const sel = S.selected.has(tr.dataset.path);
      tr.classList.toggle('selected', sel);
      tr.classList.toggle('focused', S.focus === tr.dataset.path);
      const cb = tr.querySelector('input[type=checkbox]');
      if (cb) cb.checked = sel;
    });
    const all = $('check-all');
    all.checked = S.view.length > 0 && S.selected.size === S.view.length;
    all.indeterminate = S.selected.size > 0 && S.selected.size < S.view.length;
    updateToolbar();
    updateStatus();
  }

  function updateStatus() {
    const dirs = S.view.filter(isDirLike).length;
    const files = S.view.length - dirs;
    const total = S.view.filter((e) => !isDirLike(e)).reduce((a, e) => a + (e.size || 0), 0);
    $('status-left').textContent = `${plural(files, 'file')} and ${plural(dirs, 'folder')}. Total size: ${fmtSize(total)}`;
    const sel = selectedEntries();
    if (sel.length) {
      const size = sel.filter((e) => !isDirLike(e)).reduce((a, e) => a + (e.size || 0), 0);
      $('status-sel').textContent = `Selected ${plural(sel.length, 'item')}` + (size ? ` (${fmtSize(size)})` : '');
    } else {
      $('status-sel').textContent = '';
    }
    $('status-disk').textContent = S.disk ? `Free space: ${fmtSize(S.disk.free)} of ${fmtSize(S.disk.total)}` : '';
  }

  function scrollToPath(path) {
    const tr = document.querySelector(`#rows tr[data-path="${CSS.escape(path)}"]`);
    if (tr) tr.scrollIntoView({ block: 'nearest' });
  }

  function selectedEntries() {
    return [...S.selected].map((p) => S.byPath.get(p)).filter(Boolean);
  }

  function selectOnly(path) {
    S.selected = new Set(path ? [path] : []);
    S.focus = path;
    S.anchor = path;
    updateSelectionUi();
  }

  function toggleSelect(path) {
    if (S.selected.has(path)) S.selected.delete(path);
    else S.selected.add(path);
    S.focus = path;
    S.anchor = path;
    updateSelectionUi();
  }

  function rangeSelect(path, additive) {
    const paths = S.view.map((e) => e.path);
    const a = paths.indexOf(S.anchor);
    const b = paths.indexOf(path);
    if (a < 0 || b < 0) return selectOnly(path);
    const [lo, hi] = a < b ? [a, b] : [b, a];
    if (!additive) S.selected.clear();
    for (let i = lo; i <= hi; i++) S.selected.add(paths[i]);
    S.focus = path;
    updateSelectionUi();
  }

  // ---------------------------------------------------------------------------
  // Toolbar
  // ---------------------------------------------------------------------------

  const ctx = () => {
    const sel = selectedEntries();
    const one = sel.length === 1 ? sel[0] : null;
    return { sel, one, any: sel.length > 0, browsing: !S.search };
  };

  const ACTIONS = [
    { id: 'mkdir', icon: 'folderPlus', label: 'New folder', enabled: (c) => c.browsing, run: newFolder },
    { id: 'touch', icon: 'filePlus', label: 'New file', enabled: (c) => c.browsing, run: newFile },
    { id: 'upload', icon: 'upload', label: 'Upload', title: 'Upload files', enabled: (c) => c.browsing, run: () => $('file-input').click() },
    { id: 'upload-folder', icon: 'uploadFolder', label: 'Upload folder', enabled: (c) => c.browsing, run: () => $('folder-input').click() },
    { id: 'download', icon: 'download', label: 'Download', enabled: (c) => c.any && c.sel.every((e) => e.type !== 'special' && e.target_type !== 'broken'), run: () => downloadPaths(selectedEntries().map((e) => e.path)) },
    'sep',
    { id: 'edit', icon: 'edit', label: 'Edit', title: 'Edit the selected file (Enter)', enabled: (c) => c.one && isFileLike(c.one), run: () => openEntry(ctx().one, true) },
    { id: 'editor', icon: 'code', label: 'Editor', title: 'Open the code editor', enabled: () => true, run: () => showEditor() },
    { id: 'rename', icon: 'rename', label: 'Rename', title: 'Rename (F2)', enabled: (c) => !!c.one, run: () => renameEntry(ctx().one) },
    { id: 'copy', icon: 'copy', label: 'Copy', title: 'Copy (Ctrl+C)', enabled: (c) => c.any, run: () => setClipboard('copy') },
    { id: 'cut', icon: 'cut', label: 'Cut', title: 'Cut (Ctrl+X)', enabled: (c) => c.any, run: () => setClipboard('cut') },
    { id: 'paste', icon: 'paste', label: 'Paste', title: 'Paste (Ctrl+V)', enabled: (c) => !!S.clipboard && c.browsing, run: () => paste(S.cwd) },
    { id: 'delete', icon: 'trash', label: 'Delete', title: 'Delete (Del)', cls: 'danger', enabled: (c) => c.any, run: () => deleteEntries(selectedEntries()) },
    'sep',
    { id: 'chmod', icon: 'lock', label: 'Permissions', title: 'Change permissions (chmod)', enabled: (c) => c.any, run: () => chmodDialog(selectedEntries()) },
    { id: 'chown', icon: 'user', label: 'Owner', title: 'Change owner and group (chown)', enabled: (c) => c.any && S.info && S.info.full_access, run: () => chownDialog(selectedEntries()) },
    { id: 'compress', icon: 'archive', label: 'Compress', title: 'Create a zip archive', enabled: (c) => c.any && c.browsing, run: () => compressEntries(selectedEntries()) },
    { id: 'extract', icon: 'extract', label: 'Extract', title: 'Extract archive here', enabled: (c) => c.one && isFileLike(c.one) && isArchive(c.one.name), run: () => extractEntry(ctx().one) },
    'sep',
    { id: 'terminal', icon: 'terminal', label: 'Terminal', title: 'Open a terminal (shell) in this folder', enabled: () => !!(S.info && S.info.terminal), run: () => openTerminal(S.cwd) },
    { id: 'hidden', icon: 'eye', label: 'Hidden files', title: 'Show hidden files (dotfiles)', toggle: true, run: toggleHidden },
  ];

  function renderToolbar() {
    const bar = $('toolbar');
    for (const a of ACTIONS) {
      if (a === 'sep') {
        bar.append(h('span', { class: 'tool-sep' }));
        continue;
      }
      a.el = h('button', {
        class: 'tool' + (a.cls ? ' ' + a.cls : '') + (a.toggle ? ' toggle' : ''),
        type: 'button',
        title: a.title || a.label,
        onclick: () => a.run(),
      }, icon(a.icon), h('span', { class: 'label', text: a.label }));
      bar.append(a.el);
    }
  }

  function updateToolbar() {
    const c = ctx();
    for (const a of ACTIONS) {
      if (a === 'sep') continue;
      if (a.toggle) a.el.classList.toggle('on', S.showHidden);
      else a.el.disabled = !a.enabled(c);
      if (a.id === 'editor') a.el.querySelector('.label').textContent = ED.tabs.length ? `Editor (${ED.tabs.length})` : 'Editor';
    }
    $('btn-up').disabled = S.cwd === '/' && !S.search;
    const bm = bookmarks();
    $('btn-bookmark').classList.toggle('on', bm.includes(S.cwd));
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  async function newFolder() {
    const name = await promptBox('New folder', 'Folder name', 'New folder', { okLabel: 'Create' });
    if (!name) return;
    const path = joinPath(S.cwd, name);
    try {
      await api('POST', 'mkdir', { body: { path } });
      logMsg('ok', `Created folder ${path}`);
      reloadTreeNodes([S.cwd]);
      await load(S.cwd, { select: [path] });
    } catch (err) {
      fail(err, 'Could not create folder');
    }
  }

  async function newFile() {
    const name = await promptBox('New file', 'File name', 'new-file.txt', { okLabel: 'Create', selectBase: true });
    if (!name) return;
    const path = joinPath(S.cwd, name);
    try {
      await api('POST', 'touch', { body: { path } });
      logMsg('ok', `Created file ${path}`);
      await load(S.cwd, { select: [path] });
      openEditor(path);
    } catch (err) {
      fail(err, 'Could not create file');
    }
  }

  async function renameEntry(e) {
    if (!e) return;
    const name = await promptBox('Rename', `New name for “${e.name}”`, e.name, { okLabel: 'Rename', selectBase: !isDirLike(e) });
    if (!name || name === e.name) return;
    try {
      const r = await api('POST', 'rename', { body: { path: e.path, name } });
      logMsg('ok', `Renamed ${e.path} to ${r.path}`);
      if (isDirLike(e)) reloadTreeNodes([e.dir]);
      await load(S.cwd, { select: [r.path] });
    } catch (err) {
      fail(err, 'Could not rename');
    }
  }

  async function deleteEntries(list) {
    if (!list.length) return;
    const names = list.map((e) => (S.search ? e.path : e.name) + (isDirLike(e) && e.type === 'dir' ? '/' : ''));
    const hasDir = list.some((e) => e.type === 'dir');
    const ok = await confirmBox(
      `Delete ${plural(list.length, 'item')}?`,
      `These items will be permanently deleted${hasDir ? ', including everything inside the folders' : ''}. This can't be undone.`,
      'Delete', true, nameList(names));
    if (!ok) return;
    try {
      const r = await api('POST', 'delete', { body: { paths: list.map((e) => e.path) } });
      logMsg('ok', `Deleted ${plural(r.done, 'item')}`);
      await reportResult(r, 'deleted', 'Delete');
      reloadTreeNodes([...new Set(list.map((e) => e.dir))]);
      await load(S.cwd);
    } catch (err) {
      fail(err, 'Could not delete');
    }
  }

  function setClipboard(mode) {
    const paths = selectedEntries().map((e) => e.path);
    if (!paths.length) return;
    S.clipboard = { mode, paths };
    toast(`${plural(paths.length, 'item')} ${mode === 'cut' ? 'cut' : 'copied'}. Open another folder and paste.`);
    render();
  }

  async function paste(dest) {
    const cb = S.clipboard;
    if (!cb) return;
    const move = cb.mode === 'cut';
    if (await transferItems(cb.paths, dest, move) && move) {
      S.clipboard = null;
      render();
    }
  }

  // Copy or move items to a folder, asking what to do on conflicts.
  async function transferItems(paths, dest, move) {
    const endpoint = move ? 'move' : 'copy';
    const body = { paths, dest };
    if (!move) body.conflict = 'error';
    try {
      let r;
      try {
        r = await api('POST', endpoint, { body });
      } catch (err) {
        if (!(err.status === 409 && err.data.code === 'conflict')) throw err;
        const buttons = [{ label: 'Cancel', value: null }];
        if (!move) buttons.push({ label: 'Keep both', value: 'rename' });
        buttons.push({ label: 'Overwrite', value: 'overwrite', kind: 'danger' });
        const choice = await modal({
          title: 'Items already exist',
          body: h('div', {},
            h('p', { text: `These items already exist in ${dest}:` }),
            nameList(err.data.conflicts || []),
            h('p', { class: 'muted', text: move
              ? 'Overwrite replaces existing files. Folders with the same name can\'t be overwritten by a move.'
              : 'Overwrite replaces existing files and merges folders.' })),
          buttons,
        });
        if (!choice) return false;
        if (move) body.overwrite = true;
        else body.conflict = choice;
        r = await api('POST', endpoint, { body });
      }
      logMsg('ok', `${move ? 'Moved' : 'Copied'} ${plural(r.done, 'item')} to ${dest}`);
      await reportResult(r, move ? 'moved' : 'copied', move ? 'Move' : 'Copy');
      reloadTreeNodes([dest, ...paths.map(parentPath)]);
      await load(S.cwd);
      return true;
    } catch (err) {
      fail(err, move ? 'Could not move' : 'Could not copy');
      return false;
    }
  }

  async function moveTo(paths, dest, copy) {
    paths = paths.filter((p) => p !== dest && (copy || parentPath(p) !== dest));
    if (!paths.length) return;
    const ok = await confirmBox(
      `${copy ? 'Copy' : 'Move'} ${plural(paths.length, 'item')}?`,
      `${copy ? 'Copy' : 'Move'} to ${dest}:`, copy ? 'Copy' : 'Move', false,
      nameList(paths.map(baseName)));
    if (ok) await transferItems(paths, dest, !copy);
  }

  // Downloads go through a hidden iframe: successful downloads are handed to
  // the browser's download manager, errors (plain text) stay in the iframe
  // where we can read them instead of navigating away from the app.
  function downloadPaths(paths) {
    if (!paths.length) return;
    const frame = h('iframe', { class: 'hidden', title: 'download', src: apiUrl('download', { path: paths }) });
    frame.addEventListener('load', () => {
      let text = '';
      try { text = frame.contentDocument.body.textContent || ''; } catch (e) { /* ignore */ }
      if (text.startsWith('Download failed:')) fail(new Error(text.slice(16).trim()), 'Download failed');
      setTimeout(() => frame.remove(), 1000);
    });
    setTimeout(() => frame.remove(), 30 * 60 * 1000);
    document.body.append(frame);
    logMsg('info', paths.length === 1 && !isDirLike(S.byPath.get(paths[0]) || {})
      ? `Downloading ${paths[0]}`
      : `Downloading ${paths.length === 1 ? paths[0] : plural(paths.length, 'item')} as a zip archive`);
  }

  async function compressEntries(list) {
    if (!list.length) return;
    const def = (list.length === 1 ? list[0].name : baseName(S.cwd) === '/' ? 'archive' : baseName(S.cwd)) + '.zip';
    const name = await promptBox('Compress', 'Name of the zip archive', def, { okLabel: 'Create', selectBase: true });
    if (!name) return;
    try {
      logMsg('info', `Compressing ${plural(list.length, 'item')}…`);
      const r = await api('POST', 'compress', { body: { paths: list.map((e) => e.path), dest: S.cwd, name } });
      logMsg('ok', `Created ${r.path}`);
      if (r.skipped && r.skipped.length) toast(`${r.skipped.length} unreadable files were skipped`, 'error');
      await load(S.cwd, { select: [r.path] });
    } catch (err) {
      fail(err, 'Could not create archive');
    }
  }

  async function extractEntry(e) {
    if (!e) return;
    try {
      logMsg('info', `Extracting ${e.path}…`);
      const r = await api('POST', 'extract', { body: { path: e.path } });
      logMsg('ok', `Extracted ${e.path} to ${r.path}`);
      reloadTreeNodes([e.dir]);
      if (S.search) exitSearch();
      await load(e.dir, { select: [r.path] });
    } catch (err) {
      fail(err, 'Could not extract');
    }
  }

  function toggleHidden() {
    S.showHidden = !S.showHidden;
    store.set('hidden', S.showHidden);
    render();
    renderTree();
  }

  function openEntry(e, forceEdit = false) {
    if (!e) return;
    if (isDirLike(e)) {
      if (S.search) S.search = null;
      go(e.path);
    } else if (e.type === 'special') {
      toast('Special files (devices, sockets, pipes) can\'t be opened', 'error');
    } else if (e.target_type === 'broken') {
      toast('This link is broken: its target does not exist', 'error');
    } else if (!forceEdit && isImage(e.name)) {
      previewImage(e);
    } else {
      openEditor(e.path);
    }
  }

  async function previewImage(e) {
    const img = h('img', { class: 'preview-img', alt: e.name, src: apiUrl('raw', { path: e.path }) });
    const r = await modal({
      title: e.name,
      body: img,
      wide: true,
      buttons: [
        { label: 'Download', value: 'download', left: true },
        { label: 'Close', value: null, kind: 'primary', submit: true },
      ],
    });
    if (r === 'download') downloadPaths([e.path]);
  }

  function copyPathToClipboard(path) {
    const done = () => toast('Path copied to clipboard', 'ok');
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(path).then(done, () => promptBox('Path', 'Copy this path', path));
    } else {
      promptBox('Path', 'Copy this path', path);
    }
  }

  // ----- Permissions ---------------------------------------------------------

  async function chmodDialog(list) {
    if (!list.length) return;
    const first = list.find((e) => e.type !== 'link') || list[0];
    const initial = parseInt(first.mode, 8) & 0o7777;
    const differ = list.some((e) => e.mode !== first.mode);
    const who = ['Owner', 'Group', 'Public'];
    const what = ['Read', 'Write', 'Execute'];
    const boxes = [];
    const grid = h('div', { class: 'perm-grid' }, h('span'), ...what.map((w) => h('span', { class: 'h', text: w })));
    who.forEach((label, wi) => {
      grid.append(h('span', { class: 'r', text: label }));
      what.forEach((_, pi) => {
        const bit = 1 << ((2 - wi) * 3 + (2 - pi));
        const cb = h('input', { type: 'checkbox', checked: !!(initial & bit), onchange: syncFromBoxes });
        cb.dataset.bit = bit;
        boxes.push(cb);
        grid.append(h('label', {}, cb));
      });
    });
    const numeric = h('input', { class: 'input', value: (initial & 0o7000 ? initial.toString(8).padStart(4, '0') : (initial & 0o777).toString(8).padStart(3, '0')), maxlength: '4', oninput: syncFromNumeric });
    function syncFromBoxes() {
      const special = (parseInt(numeric.value, 8) || 0) & 0o7000;
      let m = special;
      boxes.forEach((cb) => { if (cb.checked) m |= Number(cb.dataset.bit); });
      numeric.value = special ? m.toString(8).padStart(4, '0') : m.toString(8).padStart(3, '0');
    }
    function syncFromNumeric() {
      if (!/^[0-7]{3,4}$/.test(numeric.value)) return;
      const m = parseInt(numeric.value, 8);
      boxes.forEach((cb) => { cb.checked = !!(m & Number(cb.dataset.bit)); });
    }
    const hasDir = list.some((e) => e.type === 'dir');
    const recursive = h('input', { type: 'checkbox' });
    const applyRadios = ['all', 'files', 'dirs'].map((v, i) => h('input', { type: 'radio', name: 'apply_to', value: v, checked: i === 0 }));
    const applyGroup = h('div', { class: 'radio-group' },
      h('label', { class: 'check' }, applyRadios[0], 'Apply to all files and folders'),
      h('label', { class: 'check' }, applyRadios[1], 'Apply to files only'),
      h('label', { class: 'check' }, applyRadios[2], 'Apply to folders only'));
    applyRadios.forEach((r) => { r.disabled = true; });
    recursive.addEventListener('change', () => applyRadios.forEach((r) => { r.disabled = !recursive.checked; }));

    const body = h('div', {},
      h('p', { text: list.length === 1 ? `Permissions of “${list[0].name}”` : `Permissions of ${plural(list.length, 'item')}` }),
      differ ? h('p', { class: 'muted', text: 'The selected items have different permissions, the values of the first one are shown.' }) : null,
      grid,
      h('div', { class: 'perm-numeric' }, h('span', { text: 'Numeric value:' }), numeric,
        h('span', { class: 'muted', text: 'e.g. 644 for files, 755 for folders' })),
      hasDir ? h('div', {}, h('label', { class: 'check' }, recursive, 'Recurse into subfolders'), applyGroup) : null);

    const r = await modal({
      title: 'Change permissions',
      body,
      buttons: [
        { label: 'Cancel', value: null },
        { label: 'Apply', value: 'ok', kind: 'primary', submit: true, validate: () => /^[0-7]{3,4}$/.test(numeric.value) },
      ],
    });
    if (r !== 'ok') return;
    const applyTo = applyRadios.find((x) => x.checked).value;
    try {
      const res = await api('POST', 'chmod', {
        body: { paths: list.map((e) => e.path), mode: numeric.value, recursive: recursive.checked, apply_to: applyTo },
      });
      logMsg('ok', `Permissions set to ${numeric.value} on ${plural(res.done, 'item')}`);
      await reportResult(res, 'changed', 'Permissions');
      await load(S.cwd);
    } catch (err) {
      fail(err, 'Could not change permissions');
    }
  }

  async function chownDialog(list) {
    if (!list.length) return;
    const owner = h('input', { type: 'text', value: list[0].owner, spellcheck: 'false' });
    const group = h('input', { type: 'text', value: list[0].group, spellcheck: 'false' });
    const recursive = h('input', { type: 'checkbox' });
    const hasDir = list.some((e) => e.type === 'dir');
    const r = await modal({
      title: 'Change owner and group',
      body: h('div', {},
        h('p', { text: list.length === 1 ? `Owner of “${list[0].name}”` : `Owner of ${plural(list.length, 'item')}` }),
        h('label', { class: 'field' }, h('span', { text: 'Owner (user name or uid, empty to keep)' }), owner),
        h('label', { class: 'field' }, h('span', { text: 'Group (group name or gid, empty to keep)' }), group),
        hasDir ? h('label', { class: 'check' }, recursive, 'Recurse into subfolders') : null),
      buttons: [
        { label: 'Cancel', value: null },
        { label: 'Apply', value: 'ok', kind: 'primary', submit: true },
      ],
    });
    if (r !== 'ok') return;
    try {
      const res = await api('POST', 'chown', {
        body: { paths: list.map((e) => e.path), owner: owner.value.trim(), group: group.value.trim(), recursive: recursive.checked },
      });
      logMsg('ok', `Owner changed on ${plural(res.done, 'item')}`);
      await reportResult(res, 'changed', 'Owner');
      await load(S.cwd);
    } catch (err) {
      fail(err, 'Could not change owner');
    }
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  async function runSearch(query, quiet = false) {
    const path = S.search ? S.search.path : S.cwd;
    if (!quiet) logMsg('info', `Searching “${query}” in ${path}…`);
    document.body.style.cursor = 'progress';
    try {
      const r = await api('GET', 'search', { params: { path, q: query } });
      r.results.forEach((e) => { e.path = joinPath(e.dir, e.name); });
      S.search = { query, path, results: r.results, truncated: r.truncated };
      S.selected.clear();
      S.focus = null;
      if (!quiet) logMsg('ok', `Search finished: ${plural(r.results.length, 'result')}`);
      render();
    } catch (err) {
      fail(err, 'Search failed');
    } finally {
      document.body.style.cursor = '';
    }
  }

  function exitSearch() {
    S.search = null;
    S.filter = '';
    $('search').value = '';
    S.selected.clear();
    render();
  }

  // ---------------------------------------------------------------------------
  // Tree & bookmarks
  // ---------------------------------------------------------------------------

  async function loadTreeNode(path) {
    const node = S.tree.get(path) || { open: false, dirs: null };
    S.tree.set(path, node);
    try {
      const r = await api('GET', 'tree', { params: { path } });
      node.dirs = r.dirs.map((d) => d.name);
    } catch (err) {
      node.dirs = [];
      node.error = true;
    }
    return node;
  }

  function reloadTreeNodes(paths) {
    const jobs = [...new Set(paths)].filter((p) => S.tree.has(p) && S.tree.get(p).dirs !== null).map(loadTreeNode);
    if (jobs.length) Promise.all(jobs).then(renderTree);
  }

  async function revealInTree(path) {
    for (const p of ancestors(path)) {
      let node = S.tree.get(p);
      if (!node || node.dirs === null) node = await loadTreeNode(p);
      node.open = true;
    }
    renderTree();
    const cur = document.querySelector('#tree .tree-row.current');
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  }

  function renderTree() {
    const container = $('tree');
    const frag = document.createDocumentFragment();
    const rootLabel = S.info ? (S.info.root === '/' ? '/' : S.info.root) : '/';
    const walk = (path, label, depth) => {
      const node = S.tree.get(path);
      const loaded = node && node.dirs !== null;
      const open = node && node.open;
      const twisty = h('span', { class: 'twisty' + (open ? ' open' : '') + (loaded && node.dirs.length === 0 ? ' none' : '') }, icon('chevron'));
      twisty.dataset.toggle = '1';
      frag.append(h('div', {
        class: 'tree-row' + (path === S.cwd ? ' current' : ''),
        role: 'treeitem',
        style: { paddingLeft: `${depth * 14 + 2}px` },
        dataset: { path },
        title: path,
      }, twisty, h('span', { class: 'ficon' }, icon('folder')), h('span', { class: 'label', text: label })));
      if (open && loaded) {
        for (const name of node.dirs) {
          if (!S.showHidden && name.startsWith('.')) continue;
          walk(joinPath(path, name), name, depth + 1);
        }
      }
    };
    walk('/', rootLabel, 0);
    container.replaceChildren(frag);
  }

  async function toggleTreeNode(path) {
    let node = S.tree.get(path);
    if (!node || node.dirs === null) node = await loadTreeNode(path);
    node.open = !node.open;
    renderTree();
  }

  function defaultBookmarks() {
    if (S.info && S.info.root === '/') {
      return ['/', '/etc', '/var/www', '/var/log', '/home', '/home/yunohost.app', '/etc/nginx/conf.d'];
    }
    return ['/'];
  }

  const bookmarks = () => S.bookmarks || defaultBookmarks();

  function saveBookmarks(list) {
    S.bookmarks = list;
    store.set('bookmarks', list);
    renderBookmarks();
    updateToolbar();
  }

  function renderBookmarks() {
    const ul = $('bookmarks');
    const list = bookmarks();
    ul.replaceChildren(...list.map((p) => h('li', { class: p === S.cwd ? 'current' : '', title: p, onclick: () => go(p) },
      icon('star'), h('span', { text: p }),
      h('button', {
        class: 'icon-btn', type: 'button', title: 'Remove bookmark',
        onclick: (ev) => { ev.stopPropagation(); saveBookmarks(bookmarks().filter((x) => x !== p)); },
      }, icon('x')))));
    if (!list.length) ul.append(h('li', { class: 'muted', text: 'Use the ☆ button next to the path to add bookmarks.' }));
  }

  function toggleBookmark() {
    if (S.cwd === null) return;
    const list = bookmarks();
    if (list.includes(S.cwd)) saveBookmarks(list.filter((p) => p !== S.cwd));
    else saveBookmarks([...list, S.cwd]);
  }

  // ---------------------------------------------------------------------------
  // Uploads (transfer queue)
  // ---------------------------------------------------------------------------

  const Q = { items: [], active: 0, max: 3, seq: 0, prompt: Promise.resolve() };

  function enqueueUploads(files, destDir) {
    if (!files.length) return;
    const batch = { policy: null };
    for (const { file, rel } of files) {
      const t = {
        id: ++Q.seq,
        file,
        name: rel,
        dest: joinPath(destDir, rel),
        size: file.size,
        loaded: 0,
        status: 'queued',
        batch,
      };
      Q.items.push(t);
      t.el = renderTransfer(t);
    }
    logMsg('info', `Queued ${plural(files.length, 'file')} for upload to ${destDir}`);
    switchTab('transfers');
    if ($('bottom').classList.contains('collapsed')) toggleBottom();
    pump();
  }

  function pump() {
    while (Q.active < Q.max) {
      const t = Q.items.find((x) => x.status === 'queued');
      if (!t) break;
      t.status = 'starting';
      Q.active++;
      runUpload(t).finally(() => {
        Q.active--;
        updateTransfer(t);
        scheduleRefresh();
        pump();
      });
    }
    updateTransferCount();
  }

  let refreshTimer = null;
  function scheduleRefresh() {
    if (refreshTimer) return;
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      refresh();
    }, 1200);
  }

  // Ask what to do with an existing file. Prompts are serialized.
  function askConflict(t) {
    const run = async () => {
      if (t.batch.policy) return t.batch.policy;
      const all = h('input', { type: 'checkbox' });
      const choice = await modal({
        title: 'File already exists',
        body: h('div', {},
          h('p', { text: `“${t.dest}” already exists on the server.` }),
          h('label', { class: 'check' }, all, 'Do the same for the other files of this upload')),
        buttons: [
          { label: 'Skip', value: 'skip' },
          { label: 'Keep both', value: 'rename' },
          { label: 'Overwrite', value: 'overwrite', kind: 'danger', submit: true },
        ],
      }) || 'skip';
      if (all.checked) t.batch.policy = choice;
      return choice;
    };
    const p = Q.prompt.then(run);
    Q.prompt = p.catch(() => null);
    return p;
  }

  async function uniqueDest(path) {
    const dir = parentPath(path);
    const name = baseName(path);
    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    for (let i = 1; i < 1000; i++) {
      const candidate = joinPath(dir, `${base} (${i})${ext}`);
      const st = await api('GET', 'stat', { params: { path: candidate } });
      if (!st.exists) return candidate;
    }
    throw new Error('Could not find a free name');
  }

  async function runUpload(t) {
    t.status = 'checking';
    updateTransfer(t);
    let overwrite = false;
    try {
      const st = await api('GET', 'stat', { params: { path: t.dest } });
      if (st.exists) {
        if (st.type === 'dir') throw new Error('A folder with this name already exists');
        const choice = await askConflict(t);
        if (choice === 'skip') {
          t.status = 'skipped';
          logMsg('info', `Skipped ${t.dest} (already exists)`);
          return;
        }
        if (choice === 'rename') t.dest = await uniqueDest(t.dest);
        else overwrite = true;
      }
    } catch (err) {
      if (err.status !== 404) {
        t.status = 'error';
        t.error = err.message;
        logMsg('error', `Upload of ${t.dest} failed: ${err.message}`);
        return;
      }
    }
    if (t.status === 'cancelled') return;

    await new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      t.xhr = xhr;
      t.status = 'active';
      t.started = performance.now();
      updateTransfer(t);
      xhr.open('PUT', apiUrl('upload', { path: t.dest, overwrite: overwrite ? '1' : '0', mkdirs: '1' }));
      xhr.setRequestHeader('X-Requested-With', 'ServerManager');
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.upload.onprogress = (ev) => {
        t.loaded = ev.loaded;
        updateTransfer(t);
      };
      xhr.onload = () => {
        let data = {};
        try { data = JSON.parse(xhr.responseText); } catch (e) { /* not JSON */ }
        if (xhr.status === 200 && data.path) {
          t.status = 'done';
          t.loaded = t.size;
          logMsg('ok', `Uploaded ${t.dest} (${fmtSize(t.size)})`);
        } else {
          t.status = 'error';
          t.error = data.error || (xhr.status === 413 ? 'File too large for the web server'
            : (xhr.status === 200 ? SESSION_HINT : `${xhr.status} ${xhr.statusText}`));
          logMsg('error', `Upload of ${t.dest} failed: ${t.error}`);
        }
        resolve();
      };
      xhr.onerror = () => {
        t.status = 'error';
        t.error = 'Network error';
        logMsg('error', `Upload of ${t.dest} failed: network error`);
        resolve();
      };
      xhr.onabort = () => {
        t.status = 'cancelled';
        logMsg('info', `Upload of ${t.dest} cancelled`);
        resolve();
      };
      xhr.send(t.file);
    });
    t.xhr = null;
  }

  function cancelTransfer(t) {
    if (t.xhr) t.xhr.abort();
    else if (['queued', 'checking', 'starting'].includes(t.status)) t.status = 'cancelled';
    updateTransfer(t);
    pump();
  }

  const STATUS_ICON = { queued: 'clock', starting: 'clock', checking: 'clock', active: 'upload', done: 'check', error: 'alert', skipped: 'x', cancelled: 'x' };

  function renderTransfer(t) {
    const list = $('transfers');
    if (list.querySelector('.muted')) list.replaceChildren();
    const bar = h('div');
    const el = h('div', { class: 'transfer' },
      h('span', { class: 't-icon' }),
      h('div', { class: 't-main' }, h('div', { class: 't-name', text: t.name, title: t.name }), h('div', { class: 't-dest', text: '→ ' + parentPath(t.dest) })),
      h('div', { class: 'progress' }, bar),
      h('span', { class: 't-status' }),
      h('button', { class: 'icon-btn small', type: 'button', title: 'Cancel', onclick: () => cancelTransfer(t) }, icon('x')));
    t.bar = bar;
    list.append(el);
    t.el = el;
    updateTransfer(t);
    return el;
  }

  function updateTransfer(t) {
    if (!t.el) return;
    const finished = ['done', 'error', 'skipped', 'cancelled'].includes(t.status);
    t.el.className = 'transfer ' + t.status;
    const ic = t.el.querySelector('.t-icon');
    if (ic.dataset.icon !== t.status) {
      ic.replaceChildren(icon(STATUS_ICON[t.status] || 'clock'));
      ic.dataset.icon = t.status;
    }
    const pct = t.size ? Math.min(100, Math.round((t.loaded / t.size) * 100)) : (t.status === 'done' ? 100 : 0);
    t.bar.style.width = pct + '%';
    let text;
    if (t.status === 'active') {
      const secs = (performance.now() - t.started) / 1000;
      const speed = secs > 0.5 ? t.loaded / secs : 0;
      text = `${pct}% of ${fmtSize(t.size)}` + (speed ? ` · ${fmtSize(speed)}/s` : '');
    } else if (t.status === 'error') {
      text = t.error || 'Failed';
    } else {
      text = { queued: 'Queued', starting: 'Starting', checking: 'Checking', done: fmtSize(t.size), skipped: 'Skipped', cancelled: 'Cancelled' }[t.status];
    }
    const st = t.el.querySelector('.t-status');
    st.textContent = text;
    st.title = text;
    t.el.querySelector('button').classList.toggle('hidden', finished);
    updateTransferCount();
  }

  function updateTransferCount() {
    const pending = Q.items.filter((x) => !['done', 'error', 'skipped', 'cancelled'].includes(x.status)).length;
    const badge = $('transfer-count');
    badge.textContent = pending;
    badge.classList.toggle('hidden', pending === 0);
  }

  function clearFinishedTransfers() {
    Q.items = Q.items.filter((t) => {
      const finished = ['done', 'skipped', 'cancelled'].includes(t.status);
      if (finished) t.el.remove();
      return !finished;
    });
    if (!Q.items.length) {
      $('transfers').replaceChildren(h('div', { class: 'muted pad', text: 'No transfers.' }));
    }
  }

  // Collect files from a drop event, including dropped folders.
  async function filesFromDrop(dt) {
    const entries = [];
    if (dt.items && dt.items.length && typeof dt.items[0].webkitGetAsEntry === 'function') {
      for (const item of dt.items) {
        if (item.kind !== 'file') continue;
        const entry = item.webkitGetAsEntry();
        if (entry) entries.push(entry);
      }
    }
    if (!entries.length) {
      return { files: [...(dt.files || [])].map((file) => ({ file, rel: file.name })), dirs: [] };
    }
    const files = [];
    const dirs = [];
    const readAll = (reader) => new Promise((resolve, reject) => {
      const out = [];
      const next = () => reader.readEntries((batch) => {
        if (!batch.length) resolve(out);
        else { out.push(...batch); next(); }
      }, reject);
      next();
    });
    const walk = async (entry, prefix) => {
      if (entry.isFile) {
        const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
        files.push({ file, rel: prefix + entry.name });
      } else if (entry.isDirectory) {
        dirs.push(prefix + entry.name);
        const children = await readAll(entry.createReader());
        for (const child of children) await walk(child, prefix + entry.name + '/');
      }
    };
    for (const entry of entries) await walk(entry, '');
    return { files, dirs };
  }

  async function uploadDropped(dt, destDir) {
    let collected;
    try {
      collected = await filesFromDrop(dt);
    } catch (err) {
      fail(err, 'Could not read dropped files');
      return;
    }
    // Create empty folders too (folders containing files are created by the upload).
    const withFiles = new Set(collected.files.map((f) => f.rel.split('/').slice(0, -1).join('/')));
    const emptyDirs = collected.dirs.filter((d) => ![...withFiles].some((w) => w === d || w.startsWith(d + '/')));
    for (const d of emptyDirs.sort()) {
      try {
        await api('POST', 'mkdir', { body: { path: joinPath(destDir, d) } });
      } catch (err) {
        if (err.status !== 409) fail(err, `Could not create folder ${d}`);
      }
    }
    if (emptyDirs.length) scheduleRefresh();
    enqueueUploads(collected.files, destDir);
  }

  // ---------------------------------------------------------------------------
  // Editor: a code editor (CodeMirror 5) with tabs, syntax highlighting,
  // find & replace. If CodeMirror can't load, a plain text area is used.
  // ---------------------------------------------------------------------------

  const LANGUAGES = [
    ['text/plain', 'Plain text'], ['text/x-sh', 'Shell'], ['text/x-nginx-conf', 'Nginx'],
    ['text/x-yaml', 'YAML'], ['application/json', 'JSON'], ['text/x-properties', 'INI / config'],
    ['text/x-toml', 'TOML'], ['text/javascript', 'JavaScript'], ['text/x-python', 'Python'],
    ['application/x-httpd-php', 'PHP'], ['text/html', 'HTML'], ['text/css', 'CSS'],
    ['application/xml', 'XML'], ['text/x-sql', 'SQL'], ['text/x-markdown', 'Markdown'],
    ['text/x-dockerfile', 'Dockerfile'], ['text/x-diff', 'Diff'], ['text/x-lua', 'Lua'],
    ['text/x-go', 'Go'], ['text/x-rustsrc', 'Rust'], ['text/x-ruby', 'Ruby'], ['text/x-perl', 'Perl'],
    ['text/jinja2', 'Jinja2'], ['text/x-cmake', 'CMake'],
  ];
  const LANGUAGE_NAME = new Map(LANGUAGES);

  const ED = {
    engine: null,
    loading: null,
    tabs: [],
    active: null,
    wrap: store.get('wrap', false),
    fontSize: store.get('editorFont', 13),
  };

  function detectIndent(text) {
    let tabs = 0;
    let spaces = 0;
    let two = 0;
    for (const line of text.split('\n', 5000)) {
      if (line.startsWith('\t')) tabs++;
      else {
        const m = /^( +)\S/.exec(line);
        if (m) {
          spaces++;
          if (m[1].length % 4 === 2) two++;
        }
      }
    }
    if (tabs > spaces) return '\t';
    return two > spaces * 0.2 ? '  ' : '    ';
  }

  // Pick the syntax highlighting from the file name or its first line
  function detectLanguage(path, text) {
    const name = baseName(path).toLowerCase();
    const first = text.slice(0, 200).split('\n')[0];
    if (/^#!.*\b(ba|z|da|k)?sh\b/.test(first)) return 'text/x-sh';
    if (/^#!.*python/.test(first)) return 'text/x-python';
    if (/^#!.*(node|deno)/.test(first)) return 'text/javascript';
    if (/^#!.*perl/.test(first)) return 'text/x-perl';
    if (/^<\?php/.test(first)) return 'application/x-httpd-php';
    if ((/\/nginx\//.test(path) && /\.(conf|inc)$/.test(name)) || /^nginx.*\.conf$/.test(name)) return 'text/x-nginx-conf';
    if (/\.(service|timer|socket|mount|target|path|network|netdev|ini|cfg|cnf|conf|env|properties|desktop)$/.test(name)
      || /^\.env(\..*)?$/.test(name) || /^(sshd_config|ssh_config|php\.ini|my\.cnf)$/.test(name)) return 'text/x-properties';
    if (/^(\.?bashrc|\.?profile|\.bash_\w+|\.zshrc|crontab)$/.test(name) || /\/cron\.d\//.test(path)) return 'text/x-sh';
    if (/^dockerfile(\..*)?$/.test(name)) return 'text/x-dockerfile';
    if (/\.(ya?ml)$/.test(name)) return 'text/x-yaml';
    if (/\.json$/.test(name)) return 'application/json';
    if (window.CodeMirror && CodeMirror.findModeByFileName) {
      const info = CodeMirror.findModeByFileName(name);
      if (info && info.mode !== 'null' && CodeMirror.modes[info.mode]) return info.mime || (info.mimes && info.mimes[0]) || info.mode;
    }
    return 'text/plain';
  }

  function loadCodeMirror() {
    if (!ED.loading) {
      ED.loading = Promise.all([
        loadAsset('link', { rel: 'stylesheet', href: assetUrl('static/vendor/codemirror/codemirror-bundle.css') }),
        loadAsset('script', { src: assetUrl('static/vendor/codemirror/codemirror-bundle.js') }),
      ]).catch(() => null);
    }
    return ED.loading;
  }

  const darkScheme = window.matchMedia('(prefers-color-scheme: dark)');

  // CodeMirror engine: one editor, one document per tab
  function codeMirrorEngine(container) {
    const indentUnitOf = (tab) => (tab && tab.indent !== '\t' ? tab.indent.length : 4);
    const cm = CodeMirror(container, {
      value: '',
      lineNumbers: true,
      matchBrackets: true,
      styleActiveLine: true,
      lineWrapping: ED.wrap,
      tabSize: 4,
      indentUnit: 4,
      theme: darkScheme.matches ? 'material-darker' : 'default',
      inputStyle: 'contenteditable',
      spellcheck: false,
      autocorrect: false,
      autocapitalize: false,
      extraKeys: {
        Tab: (ed) => {
          if (ed.somethingSelected()) ed.indentSelection('add');
          else ed.replaceSelection(ed.getOption('indentWithTabs') ? '\t' : ' '.repeat(ed.getOption('indentUnit')), 'end');
        },
        'Shift-Tab': 'indentLess',
        'Ctrl-/': 'toggleComment',
        'Cmd-/': 'toggleComment',
      },
    });
    const listen = (fn) => (darkScheme.addEventListener ? darkScheme.addEventListener('change', fn) : darkScheme.addListener(fn));
    listen(() => cm.setOption('theme', darkScheme.matches ? 'material-darker' : 'default'));
    cm.on('cursorActivity', updateEditorStatus);
    cm.on('changes', updateDirtyState);
    return {
      basic: false,
      newDoc: (text, mode) => CodeMirror.Doc(text, mode),
      show(tab) {
        cm.swapDoc(tab.doc);
        cm.setOption('indentWithTabs', tab.indent === '\t');
        cm.setOption('indentUnit', indentUnitOf(tab));
        cm.refresh();
      },
      value: (tab) => tab.doc.getValue(),
      setValue(tab, text) { tab.doc.setValue(text); tab.doc.clearHistory(); },
      markClean(tab) { tab.gen = tab.doc.changeGeneration(true); },
      isDirty: (tab) => !tab.doc.isClean(tab.gen),
      setMode(tab, mode) { tab.mode = mode; if (tab === ED.active) cm.setOption('mode', mode); else tab.doc.modeOption = mode; },
      cursor() {
        const c = cm.getCursor();
        return { line: c.line + 1, col: c.ch + 1, lines: cm.lineCount() };
      },
      exec(command) { cm.focus(); cm.execCommand(command); },
      setWrap(on) { cm.setOption('lineWrapping', on); },
      setFont(px) { cm.getWrapperElement().style.fontSize = px + 'px'; cm.refresh(); },
      focus() { cm.focus(); },
      refresh() { cm.refresh(); },
      dialogOpen: () => !!container.querySelector('.CodeMirror-dialog'),
    };
  }

  // Fallback engine: a plain text area
  function textareaEngine(container) {
    const ta = h('textarea', { class: 'ed-fallback', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', wrap: 'off' });
    container.append(ta);
    let shown = null;
    ta.addEventListener('input', () => { if (shown) shown.doc.text = ta.value; updateDirtyState(); updateEditorStatus(); });
    ta.addEventListener('keyup', updateEditorStatus);
    ta.addEventListener('click', updateEditorStatus);
    ta.addEventListener('keydown', (ev) => {
      if (ev.key === 'Tab' && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
        ev.preventDefault();
        const unit = shown && shown.indent === '\t' ? '\t' : (shown ? shown.indent : '    ');
        if (!document.execCommand('insertText', false, unit)) ta.setRangeText(unit, ta.selectionStart, ta.selectionEnd, 'end');
        if (shown) shown.doc.text = ta.value;
        updateDirtyState();
      }
    });
    return {
      basic: true,
      newDoc: (text) => ({ text, clean: text }),
      show(tab) {
        if (shown) shown.doc.text = ta.value;
        shown = tab;
        ta.value = tab.doc.text;
        ta.scrollTop = 0;
      },
      value: (tab) => (tab === shown ? ta.value : tab.doc.text),
      setValue(tab, text) { tab.doc.text = text; if (tab === shown) ta.value = text; },
      markClean(tab) { tab.doc.clean = tab === shown ? ta.value : tab.doc.text; },
      isDirty: (tab) => (tab === shown ? ta.value : tab.doc.text) !== tab.doc.clean,
      setMode(tab, mode) { tab.mode = mode; },
      cursor() {
        const before = ta.value.slice(0, ta.selectionStart);
        return { line: before.split('\n').length, col: ta.selectionStart - before.lastIndexOf('\n'), lines: ta.value.split('\n').length };
      },
      exec() {},
      setWrap(on) { ta.classList.toggle('wrap', on); ta.setAttribute('wrap', on ? 'soft' : 'off'); },
      setFont(px) { ta.style.fontSize = px + 'px'; },
      focus() { ta.focus(); },
      refresh() {},
      dialogOpen: () => false,
    };
  }

  async function ensureEditorEngine() {
    if (ED.engine) return ED.engine;
    await loadCodeMirror();
    const body = $('ed-body');
    if (typeof window.CodeMirror === 'function') {
      try {
        ED.engine = codeMirrorEngine(body);
      } catch (err) {
        ED.engine = null;
      }
    }
    if (!ED.engine) {
      ED.engine = textareaEngine(body);
      $('editor').classList.add('basic');
      logMsg('info', 'Editor: using the basic text editor (the code editor could not load in this browser)');
    }
    ED.engine.setFont(ED.fontSize);
    ED.engine.setWrap(ED.wrap);
    return ED.engine;
  }

  function editorOpen() {
    return !$('editor').classList.contains('hidden');
  }

  function editorDirty() {
    return ED.engine ? ED.tabs.some((t) => ED.engine.isDirty(t)) : false;
  }

  async function showEditor() {
    $('editor').classList.remove('hidden');
    await ensureEditorEngine();
    renderEditor();
    if (ED.active) {
      ED.engine.refresh();
      ED.engine.focus();
    }
  }

  function hideEditor() {
    $('editor').classList.add('hidden');
    updateToolbar();
    if (S.cwd !== null) load(S.cwd);
  }

  // Kept for the existing keyboard shortcut: Esc goes back to the files
  const closeEditor = hideEditor;

  async function openEditor(path) {
    const existing = ED.tabs.find((t) => t.path === path);
    if (existing) {
      await showEditor();
      activateTab(existing);
      return;
    }
    let d;
    try {
      [d] = await Promise.all([api('GET', 'read', { params: { path } }), ensureEditorEngine()]);
    } catch (err) {
      if (err.data && err.data.code === 'binary') {
        const ok = await confirmBox('Binary file', `${baseName(path)} is not a text file and can't be edited here. Download it instead?`, 'Download');
        if (ok) downloadPaths([path]);
      } else {
        fail(err, `Could not open ${path}`);
      }
      return;
    }
    const mode = detectLanguage(d.path, d.content);
    const tab = {
      path: d.path,
      encoding: d.encoding,
      eol: d.eol,
      mtime: d.mtime_ns,
      size: d.size,
      writable: d.writable,
      indent: detectIndent(d.content),
      mode,
      doc: ED.engine.newDoc(d.content, mode),
    };
    ED.engine.markClean(tab);
    ED.tabs.push(tab);
    logMsg('info', `Opened ${d.path} in the editor`);
    await showEditor();
    activateTab(tab);
  }

  function activateTab(tab) {
    ED.active = tab;
    ED.engine.show(tab);
    renderEditor();
    ED.engine.focus();
  }

  async function closeTab(tab) {
    if (ED.engine.isDirty(tab)
      && !(await confirmBox('Unsaved changes', `Close ${baseName(tab.path)} and discard your changes?`, 'Discard', true))) return;
    const i = ED.tabs.indexOf(tab);
    ED.tabs.splice(i, 1);
    if (ED.active === tab) {
      ED.active = ED.tabs[Math.min(i, ED.tabs.length - 1)] || null;
      if (ED.active) ED.engine.show(ED.active);
    }
    renderEditor();
    if (ED.active) ED.engine.focus();
  }

  function renderEditor() {
    const editor = $('editor');
    editor.classList.toggle('no-file', !ED.active);
    const tabs = $('ed-tabs');
    tabs.replaceChildren(...ED.tabs.map((tab) => {
      const el = h('div', {
        class: 'ed-tab' + (tab === ED.active ? ' active' : '') + (ED.engine.isDirty(tab) ? ' dirty' : ''),
        role: 'tab',
        title: tab.path,
        onclick: () => { if (tab !== ED.active) activateTab(tab); },
      }, h('span', { class: 'ed-tab-name', text: baseName(tab.path) }),
      h('button', { class: 'icon-btn', type: 'button', title: 'Close', onclick: (ev) => { ev.stopPropagation(); closeTab(tab); } }, icon('x')));
      return el;
    }));
    const active = tabs.querySelector('.active');
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (ED.active) $('ed-lang').value = ED.active.mode;
    $('ed-wrap').classList.toggle('on', ED.wrap);
    updateEditorStatus();
    updateToolbar();
  }

  function updateDirtyState() {
    const tabEls = $('ed-tabs').children;
    ED.tabs.forEach((tab, i) => { if (tabEls[i]) tabEls[i].classList.toggle('dirty', ED.engine.isDirty(tab)); });
  }

  function updateEditorStatus() {
    const tab = ED.active;
    const status = $('ed-status');
    if (!tab || !ED.engine) {
      status.replaceChildren();
      return;
    }
    const c = ED.engine.cursor();
    const parts = [
      `Line ${c.line}, column ${c.col}`,
      `${c.lines} lines`,
      LANGUAGE_NAME.get(tab.mode) || tab.mode,
      tab.encoding === 'utf-8-sig' ? 'UTF-8 with BOM' : tab.encoding.toUpperCase(),
      tab.eol.toUpperCase(),
      tab.indent === '\t' ? 'Tabs' : `Spaces: ${tab.indent.length}`,
    ];
    status.replaceChildren(...parts.map((p) => h('span', { text: p })), h('span', { class: 'spacer' }), h('span', { text: tab.path }));
    if (!tab.writable) status.prepend(h('span', { class: 'ro', text: 'Read-only' }));
  }

  async function saveEditor(force = false, tab = ED.active) {
    if (!tab) return false;
    const content = ED.engine.value(tab);
    try {
      const r = await api('POST', 'write', {
        body: { path: tab.path, content, encoding: tab.encoding, eol: tab.eol, expected_mtime_ns: tab.mtime, force },
      });
      tab.mtime = r.mtime_ns;
      tab.size = r.size;
      // Only mark as saved what was actually sent (the user may have typed meanwhile)
      if (ED.engine.value(tab) === content) ED.engine.markClean(tab);
      updateDirtyState();
      toast(`Saved ${baseName(tab.path)}`, 'ok');
      logMsg('ok', `Saved ${tab.path} (${fmtSize(r.size)})`);
      return true;
    } catch (err) {
      if (err.status === 409 && err.data.code === 'modified') {
        const ok = await confirmBox('File changed on the server',
          `${baseName(tab.path)} was modified on the server after you opened it. Overwrite those changes with your version?`, 'Overwrite', true);
        if (ok) return saveEditor(true, tab);
        return false;
      }
      fail(err, 'Could not save');
      return false;
    }
  }

  async function reloadTab(tab = ED.active) {
    if (!tab) return;
    if (ED.engine.isDirty(tab)
      && !(await confirmBox('Unsaved changes', 'Reload the file from the server and discard your changes?', 'Reload', true))) return;
    try {
      const d = await api('GET', 'read', { params: { path: tab.path } });
      Object.assign(tab, { encoding: d.encoding, eol: d.eol, mtime: d.mtime_ns, size: d.size, writable: d.writable });
      ED.engine.setValue(tab, d.content);
      ED.engine.markClean(tab);
      renderEditor();
      toast(`Reloaded ${baseName(tab.path)}`);
    } catch (err) {
      fail(err, 'Could not reload');
    }
  }

  async function openByPath() {
    const start = S.cwd && S.cwd !== '/' ? S.cwd + '/' : '/';
    const path = await promptBox('Open a file', 'Path of the file to edit (it is created if it doesn\'t exist)', start, { okLabel: 'Open' });
    if (!path) return;
    const full = path.startsWith('/') ? path : joinPath(S.cwd || '/', path);
    try {
      const st = await api('GET', 'stat', { params: { path: full } });
      if (!st.exists) {
        if (!(await confirmBox('New file', `${full} doesn't exist. Create it?`, 'Create'))) return;
        await api('POST', 'touch', { body: { path: full } });
        logMsg('ok', `Created file ${full}`);
      } else if (st.type === 'dir' || st.target_type === 'dir') {
        toast(`${full} is a folder`, 'error');
        return;
      }
      await openEditor(full);
    } catch (err) {
      fail(err, 'Could not open the file');
    }
  }

  function changeFont(delta) {
    ED.fontSize = Math.max(9, Math.min(28, ED.fontSize + delta));
    store.set('editorFont', ED.fontSize);
    if (ED.engine) ED.engine.setFont(ED.fontSize);
  }

  function setupEditor() {
    const tool = (id, iconName, label, title, run, cls = '') => h('button', {
      class: 'tool ' + cls, type: 'button', id, title, onclick: run,
    }, iconName ? icon(iconName) : null, h('span', { class: 'label', text: label }));
    const sep = () => h('span', { class: 'tool-sep' });
    const lang = h('select', { id: 'ed-lang', title: 'Syntax highlighting', class: 'cm-only' },
      ...LANGUAGES.map(([value, label]) => h('option', { value, text: label })));
    lang.addEventListener('change', () => {
      if (ED.active) {
        ED.engine.setMode(ED.active, lang.value);
        updateEditorStatus();
      }
    });
    $('ed-tools').append(
      tool('ed-save', 'save', 'Save', 'Save (Ctrl+S)', () => saveEditor(), 'primary-tool'),
      sep(),
      tool('ed-undo', 'undo', 'Undo', 'Undo (Ctrl+Z)', () => ED.engine.exec('undo'), 'cm-only'),
      tool('ed-redo', 'redo', 'Redo', 'Redo (Ctrl+Y)', () => ED.engine.exec('redo'), 'cm-only'),
      tool('ed-find', 'search', 'Find', 'Find (Ctrl+F), then Enter for the next match', () => ED.engine.exec('findPersistent'), 'cm-only'),
      tool('ed-replace', 'replace', 'Replace', 'Find and replace (Shift+Ctrl+F)', () => ED.engine.exec('replace'), 'cm-only'),
      tool('ed-goto', 'goto', 'Go to line', 'Go to line (Alt+G)', () => ED.engine.exec('jumpToLine'), 'cm-only'),
      tool('ed-comment', 'comment', 'Comment', 'Comment / uncomment the selected lines (Ctrl+/)', () => ED.engine.exec('toggleComment'), 'cm-only'),
      sep(),
      tool('ed-wrap', 'wrap', 'Wrap', 'Wrap long lines', () => {
        ED.wrap = !ED.wrap;
        store.set('wrap', ED.wrap);
        ED.engine.setWrap(ED.wrap);
        $('ed-wrap').classList.toggle('on', ED.wrap);
      }, 'toggle'),
      tool('ed-smaller', null, 'A−', 'Smaller text', () => changeFont(-1)),
      tool('ed-bigger', null, 'A+', 'Bigger text', () => changeFont(1)),
      lang,
      sep(),
      tool('ed-reload', 'refresh', 'Reload', 'Reload the file from the server', () => reloadTab()),
      tool('ed-download', 'download', 'Download', 'Download this file', () => ED.active && downloadPaths([ED.active.path])),
    );
    $('ed-files').addEventListener('click', hideEditor);
    $('ed-open').addEventListener('click', openByPath);
    $('ed-empty-open').addEventListener('click', openByPath);
  }

  // ---------------------------------------------------------------------------
  // Terminal: a shell on the server, rendered with xterm.js.
  // The connection uses a WebSocket, or plain HTTP requests when WebSockets
  // don't get through (proxies, some browsers). If xterm.js can't run in the
  // browser, a simple text view is used instead.
  // ---------------------------------------------------------------------------

  const T = { term: null, fit: null, conn: null, connected: false, ctrl: false, loading: null, opening: false, simple: false };

  const shellQuote = (s) => `'${s.replace(/'/g, `'\\''`)}'`;

  // Paths shown in the app are relative to the managed folder; the shell needs the real ones.
  function systemPath(p) {
    const root = (S.info && S.info.root) || '/';
    if (root === '/') return p;
    return p === '/' ? root : root + p;
  }

  const cdCommand = (p) => ({ type: 'input', data: `cd ${shellQuote(systemPath(p))}\r` });

  const assetUrl = (path) => `${path}?v=${encodeURIComponent((S.info && S.info.version) || '')}`;

  function loadAsset(tag, attrs) {
    return new Promise((resolve, reject) => {
      const el = document.createElement(tag);
      Object.assign(el, attrs);
      el.onload = resolve;
      el.onerror = () => reject(new Error('Could not load ' + (attrs.src || attrs.href)));
      document.head.append(el);
    });
  }

  function ensureXterm() {
    if (!T.loading) {
      T.loading = Promise.all([
        loadAsset('link', { rel: 'stylesheet', href: assetUrl('static/vendor/xterm/xterm.css') }),
        loadAsset('script', { src: assetUrl('static/vendor/xterm/xterm.js') })
          .then(() => loadAsset('script', { src: assetUrl('static/vendor/xterm/addon-fit.js') })),
      ]);
    }
    return T.loading;
  }

  function termStatus(text, cls = '') {
    const el = $('term-status');
    el.textContent = text;
    el.title = text;
    el.className = 'term-status' + (cls ? ' ' + cls : '');
    $('term-dot').classList.toggle('hidden', !T.connected);
  }

  let fitFrame = 0;
  function fitTerminal() {
    if (!T.fit || fitFrame) return;
    fitFrame = requestAnimationFrame(() => {
      fitFrame = 0;
      if ($('panel-terminal').classList.contains('hidden') || $('bottom').classList.contains('collapsed')) return;
      try { T.fit.fit(); } catch (e) { /* not visible yet */ }
    });
  }

  function termSend(obj) {
    if (T.conn && T.connected) T.conn.send(obj);
  }

  function termInput(data) {
    if (T.ctrl && data.length === 1) {
      const code = data.toUpperCase().charCodeAt(0);
      if (code >= 64 && code <= 95) data = String.fromCharCode(code - 64);
      setCtrl(false);
    }
    if (!T.connected) {
      // Enter on a closed session starts a new one
      if (data === '\r' && !T.conn) connectTerminal(S.cwd);
      return;
    }
    termSend({ type: 'input', data });
  }

  function setCtrl(on) {
    T.ctrl = on;
    const btn = $('term-keys').querySelector('[data-ctrl]');
    if (btn) btn.classList.toggle('on', on);
  }

  // Plain text terminal view, used when xterm.js can't run in this browser.
  // It understands the basics (new lines, carriage returns, backspace, clear
  // screen) and ignores colors and cursor movements.
  class SimpleTerm {
    constructor(container) {
      this.el = h('pre', { class: 'simple-term', tabindex: '0' });
      container.replaceChildren(this.el);
      this.decoder = typeof TextDecoder === 'function' ? new TextDecoder() : null;
      this.handlers = [];
      this.cols = 80;
      this.rows = 24;
      this.reset();
      this.el.addEventListener('keydown', (ev) => {
        const keys = { Enter: '\r', Backspace: '\x7f', Tab: '\t', Escape: '\x1b', ArrowUp: '\x1b[A', ArrowDown: '\x1b[B', ArrowRight: '\x1b[C', ArrowLeft: '\x1b[D' };
        let data = keys[ev.key];
        if (!data && ev.ctrlKey && ev.key.length === 1) data = String.fromCharCode(ev.key.toUpperCase().charCodeAt(0) & 31);
        else if (!data && ev.key.length === 1 && !ev.metaKey) data = ev.key;
        if (data) {
          ev.preventDefault();
          this.handlers.forEach((fn) => fn(data));
        }
      });
    }

    reset() {
      this.lines = [''];
      this.col = 0;
      this.render();
    }

    onData(fn) { this.handlers.push(fn); }

    focus() { this.el.focus(); }

    write(bytes) {
      let text = this.decoder ? this.decoder.decode(bytes, { stream: true }) : String.fromCharCode.apply(null, bytes);
      if (/\x1b\[(2|3)J|\x1bc/.test(text)) {
        this.lines = [''];
        this.col = 0;
        text = text.replace(/[\s\S]*(\x1b\[(2|3)J|\x1bc)/, '');
      }
      text = text
        .replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g, '') // window titles
        .replace(/\x1b\[[0-9;?<=>]*[ -\/]*[@-~]/g, '') // colors, cursor moves
        .replace(/\x1b[()*+][0-9A-Za-z]|\x1b[=>78NODEHM]/g, '');
      let line = this.lines[this.lines.length - 1];
      for (const ch of text) {
        if (ch === '\n') {
          this.lines[this.lines.length - 1] = line;
          this.lines.push('');
          line = '';
          this.col = 0;
        } else if (ch === '\r') {
          this.col = 0;
        } else if (ch === '\b') {
          this.col = Math.max(0, this.col - 1);
        } else if (ch >= ' ' || ch === '\t') {
          line = line.slice(0, this.col) + ch + line.slice(this.col + 1);
          this.col++;
        }
      }
      this.lines[this.lines.length - 1] = line;
      if (this.lines.length > 3000) this.lines.splice(0, this.lines.length - 3000);
      this.render();
    }

    render() {
      this.el.textContent = this.lines.join('\n');
      this.el.scrollTop = this.el.scrollHeight;
    }
  }

  function createTerminal() {
    const container = $('term');
    if (T.simple) {
      T.term = new SimpleTerm(container);
      T.term.onData(termInput);
      $('panel-terminal').classList.add('simple');
      return;
    }
    T.term = new window.Terminal({
      cursorBlink: true,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "DejaVu Sans Mono", monospace',
      fontSize: 13,
      scrollback: 5000,
      theme: { background: '#111418', foreground: '#e4e8ef', cursor: '#e4e8ef', selectionBackground: '#2c4a80' },
    });
    T.fit = new window.FitAddon.FitAddon();
    T.term.loadAddon(T.fit);
    T.term.open(container);
    T.term.onData(termInput);
    T.term.onResize(({ cols, rows }) => termSend({ type: 'resize', cols, rows }));
    if (typeof ResizeObserver === 'function') new ResizeObserver(fitTerminal).observe(container);
    fitTerminal();
  }

  // ----- connections ---------------------------------------------------------

  function base64ToBytes(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function wsConnection(params, cb) {
    const url = new URL(apiUrl('terminal', params), location.href);
    url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    url.hash = '';
    let opened = false;
    let done = false;
    const ws = new WebSocket(url.href);
    ws.binaryType = 'arraybuffer';
    const finish = (reason) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      clearInterval(keepalive);
      cb.onClose(reason, opened);
    };
    // Some proxies hold WebSockets without ever answering
    const timer = setTimeout(() => { if (!opened) { finish('timeout'); try { ws.close(); } catch (e) { /* ignore */ } } }, 8000);
    let keepalive = null;
    ws.onopen = () => {
      opened = true;
      clearTimeout(timer);
      keepalive = setInterval(() => ws.readyState === 1 && ws.send('{"type":"ping"}'), 25000);
      cb.onOpen();
    };
    ws.onmessage = (ev) => { if (typeof ev.data !== 'string') cb.onData(new Uint8Array(ev.data)); };
    ws.onerror = () => { if (!opened) finish('error'); };
    ws.onclose = () => finish(opened ? 'closed' : 'error');
    return {
      kind: 'websocket',
      send: (obj) => { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); },
      close: () => { done = true; clearTimeout(timer); clearInterval(keepalive); try { ws.close(); } catch (e) { /* ignore */ } },
    };
  }

  function httpConnection(params, cb) {
    let id = null;
    let done = false;
    let queue = [];
    let sending = false;
    const finish = (reason, opened) => {
      if (done) return;
      done = true;
      cb.onClose(reason, opened);
    };
    const flush = async () => {
      if (sending || !id || !queue.length || done) return;
      sending = true;
      const messages = queue;
      queue = [];
      try {
        await api('POST', 'terminal/send', { body: { id, messages } });
      } catch (err) {
        if (err.status === 410) finish('closed', true);
      }
      sending = false;
      flush();
    };
    const poll = async () => {
      let failures = 0;
      while (!done) {
        try {
          const r = await api('GET', 'terminal/read', { params: { id, wait: 25 } });
          failures = 0;
          if (done) return;
          if (r.data) cb.onData(base64ToBytes(r.data));
          if (r.ended) return finish('closed', true);
        } catch (err) {
          if (done) return;
          if (err.status === 410 || ++failures > 4) return finish(err.status === 410 ? 'closed' : err.message, true);
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
    };
    api('POST', 'terminal/open', { body: params }).then((r) => {
      if (done) {
        api('POST', 'terminal/close', { body: { id: r.id } }).catch(() => {});
        return;
      }
      id = r.id;
      cb.onOpen();
      poll();
      flush();
    }, (err) => finish(err, false));
    return {
      kind: 'http',
      send: (obj) => { queue.push(obj); flush(); },
      close: () => {
        if (done) return;
        done = true;
        if (id) api('POST', 'terminal/close', { body: { id } }).catch(() => {});
      },
    };
  }

  function openFailureMessage(err) {
    if (err instanceof ApiError && err.status && err.status !== 200) return err.message;
    // SSOwat answers with its portal page (not JSON) when access is refused
    return 'access refused. Make sure your account has the "Terminal" permission of the app '
      + '(YunoHost admin > Users > Groups and permissions), then reload this page.';
  }

  function connectTerminal(cwd, forceKind) {
    if (T.conn) T.conn.close();
    T.conn = null;
    T.connected = false;
    fitTerminal();
    const dir = cwd || S.cwd || '/';
    const params = { cwd: dir, cols: T.term.cols, rows: T.term.rows };
    const canWs = typeof WebSocket === 'function' && store.get('termTransport', 'websocket') !== 'http';
    const kind = forceKind || (canWs ? 'websocket' : 'http');
    termStatus(kind === 'http' ? 'Connecting (compatibility mode)…' : 'Connecting…');
    let conn = null;
    const cb = {
      onOpen() {
        if (T.conn !== conn) return;
        T.connected = true;
        termStatus(`Connected to ${S.info.hostname} as ${S.info.running_as}` + (conn.kind === 'http' ? ' (compatibility mode)' : ''), 'on');
        logMsg('ok', `Terminal session opened in ${dir}` + (conn.kind === 'http' ? ' (over HTTP)' : ''));
        termSend({ type: 'resize', cols: T.term.cols, rows: T.term.rows });
        T.term.focus();
      },
      onData(bytes) {
        if (T.conn === conn) T.term.write(bytes);
      },
      onClose(reason, opened) {
        if (T.conn !== conn) return;
        T.conn = null;
        T.connected = false;
        if (opened) {
          T.term.write('\r\n\x1b[90m[Session closed. Press Enter or tap “New session” to start a new one.]\x1b[0m\r\n');
          termStatus('Disconnected', 'warn');
          logMsg('info', 'Terminal session closed');
        } else if (conn.kind === 'websocket') {
          // The WebSocket didn't get through: use plain HTTP requests instead, and remember it
          logMsg('info', `Terminal: WebSocket connection failed (${reason}), switching to compatibility mode`);
          store.set('termTransport', 'http');
          connectTerminal(dir, 'http');
        } else {
          const msg = 'Could not open a terminal: ' + openFailureMessage(reason);
          termStatus(msg, 'warn');
          logMsg('error', msg);
        }
      },
    };
    conn = kind === 'http' ? httpConnection(params, cb) : wsConnection(params, cb);
    T.conn = conn;
  }

  async function openTerminal(cwd) {
    if (!S.info || !S.info.terminal || T.opening) return;
    T.opening = true;
    try {
      if ($('bottom').classList.contains('collapsed')) toggleBottom();
      if (window.matchMedia('(max-width: 680px)').matches) toggleMaxBottom(true);
      if ($('panel-terminal').classList.contains('hidden')) switchTab('terminal');
      if (!T.term) {
        termStatus('Loading the terminal…');
        if (!T.simple) {
          try {
            await ensureXterm();
          } catch (err) {
            T.loading = null;
          }
          if (typeof window.Terminal !== 'function' || !window.FitAddon) {
            // xterm.js couldn't load or run in this browser: use the simple text view
            T.simple = true;
            logMsg('info', 'Terminal: using the simple text view (this browser can\'t run the full terminal)');
          }
        }
        // Give the terminal some room the first time it's opened
        const bottom = $('bottom');
        if (bottom.getBoundingClientRect().height < 320 && window.innerHeight > 700) {
          bottom.style.height = Math.round(window.innerHeight * 0.45) + 'px';
        }
        createTerminal();
      }
      if (T.connected) {
        if (cwd) termSend(cdCommand(cwd));
        T.term.focus();
      } else {
        connectTerminal(cwd);
      }
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      termStatus('Error: ' + msg, 'warn');
      fail(err, 'Terminal');
    } finally {
      T.opening = false;
    }
  }

  function toggleLineInput(show) {
    const panel = $('panel-terminal');
    const on = panel.classList.toggle('line-input', show);
    store.set('termLineInput', on);
    if (on) $('term-line-input').focus();
    fitTerminal();
  }

  function setupTerminal() {
    const keys = [
      ['Esc', '\x1b'], ['Tab', '\t'], ['Ctrl', null], ['↑', '\x1b[A'], ['↓', '\x1b[B'], ['←', '\x1b[D'], ['→', '\x1b[C'],
      ['^C', '\x03'], ['^D', '\x04'], ['^Z', '\x1a'], ['^L', '\x0c'], ['|', '|'], ['~', '~'], ['/', '/'], ['-', '-'],
    ];
    const bar = $('term-keys');
    for (const [label, seq] of keys) {
      const btn = h('button', { type: 'button', text: label });
      if (seq === null) btn.dataset.ctrl = '1';
      // preventDefault on pointerdown keeps the focus (and the on-screen keyboard) where it is
      btn.addEventListener('pointerdown', (ev) => ev.preventDefault());
      btn.addEventListener('mousedown', (ev) => ev.preventDefault());
      btn.addEventListener('click', () => {
        if (seq === null) setCtrl(!T.ctrl);
        else termInput(seq);
      });
      bar.append(btn);
    }
    const touch = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);
    if (touch) document.body.classList.add('touch');
    // On touch devices, a regular text field is the most reliable way to type commands
    if (store.get('termLineInput', touch)) $('panel-terminal').classList.add('line-input');

    $('term-line').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const input = $('term-line-input');
      if (!T.connected) {
        if (!T.conn) connectTerminal(S.cwd);
        return;
      }
      termSend({ type: 'input', data: input.value + '\r' });
      input.value = '';
      input.focus();
    });
    $('term-line-toggle').addEventListener('click', () => toggleLineInput());
    $('term-new').addEventListener('click', () => {
      if (T.term) {
        T.term.reset();
        connectTerminal(S.cwd);
      } else {
        openTerminal(S.cwd);
      }
    });
    $('term-cd').addEventListener('click', () => {
      if (T.connected) {
        termSend(cdCommand(S.cwd));
        if (T.term) T.term.focus();
      } else {
        openTerminal(S.cwd);
      }
    });
    // Tapping the terminal must give it the keyboard focus (iPad)
    $('term').addEventListener('click', () => { if (T.term) T.term.focus(); });
    window.addEventListener('resize', fitTerminal);
  }

  // ---------------------------------------------------------------------------
  // Context menu
  // ---------------------------------------------------------------------------

  function closeMenu() {
    $('context-menu').classList.add('hidden');
  }

  function showMenu(x, y, items) {
    const menu = $('context-menu');
    menu.replaceChildren();
    for (const it of items) {
      if (it === 'sep') {
        menu.append(h('hr'));
        continue;
      }
      if (it.hidden) continue;
      menu.append(h('button', {
        type: 'button',
        role: 'menuitem',
        class: it.danger ? 'danger' : '',
        disabled: !!it.disabled,
        onclick: () => { closeMenu(); it.run(); },
      }, icon(it.icon), h('span', { text: it.label }), it.kbd ? h('span', { class: 'kbd', text: it.kbd }) : null));
    }
    menu.classList.remove('hidden');
    const r = menu.getBoundingClientRect();
    menu.style.left = Math.max(4, Math.min(x, window.innerWidth - r.width - 4)) + 'px';
    menu.style.top = Math.max(4, Math.min(y, window.innerHeight - r.height - 4)) + 'px';
    const first = menu.querySelector('button:not(:disabled)');
    if (first) first.focus();
  }

  function rowMenu(ev, e) {
    const c = ctx();
    const sel = c.sel;
    const one = c.one;
    const fullAccess = S.info && S.info.full_access;
    showMenu(ev.clientX, ev.clientY, [
      { icon: one && isDirLike(one) ? 'folder' : 'open', label: one && isDirLike(one) ? 'Open' : (one && isImage(one.name) ? 'View' : 'Open'), disabled: !one, kbd: 'Enter', run: () => openEntry(one) },
      { icon: 'edit', label: 'Edit as text', hidden: !(one && isFileLike(one)), run: () => openEntry(one, true) },
      { icon: 'folder', label: 'Show in folder', hidden: !(S.search && one), run: () => { const p = one.path; exitSearch(); load(one.dir, { select: [p] }); } },
      { icon: 'download', label: sel.length > 1 || (one && isDirLike(one)) ? 'Download as zip' : 'Download', run: () => downloadPaths(sel.map((x) => x.path)) },
      'sep',
      { icon: 'copy', label: 'Copy', kbd: 'Ctrl+C', run: () => setClipboard('copy') },
      { icon: 'cut', label: 'Cut', kbd: 'Ctrl+X', run: () => setClipboard('cut') },
      { icon: 'paste', label: one && isDirLike(one) ? 'Paste into folder' : 'Paste', disabled: !S.clipboard || (!(one && isDirLike(one)) && S.search), kbd: 'Ctrl+V', run: () => paste(one && isDirLike(one) ? one.path : S.cwd) },
      { icon: 'rename', label: 'Rename', disabled: !one, kbd: 'F2', run: () => renameEntry(one) },
      { icon: 'link', label: 'Copy path', disabled: !one, run: () => copyPathToClipboard(one.path) },
      { icon: 'terminal', label: 'Open terminal here', hidden: !(S.info && S.info.terminal && one && isDirLike(one)), run: () => openTerminal(one.path) },
      'sep',
      { icon: 'lock', label: 'Permissions…', run: () => chmodDialog(sel) },
      { icon: 'user', label: 'Owner…', hidden: !fullAccess, run: () => chownDialog(sel) },
      { icon: 'archive', label: 'Compress to zip…', hidden: !!S.search, run: () => compressEntries(sel) },
      { icon: 'extract', label: 'Extract here', hidden: !(one && isFileLike(one) && isArchive(one.name)), run: () => extractEntry(one) },
      'sep',
      { icon: 'trash', label: 'Delete', danger: true, kbd: 'Del', run: () => deleteEntries(sel) },
    ]);
  }

  function emptyMenu(ev) {
    if (S.search) return;
    showMenu(ev.clientX, ev.clientY, [
      { icon: 'folderPlus', label: 'New folder…', run: newFolder },
      { icon: 'filePlus', label: 'New file…', run: newFile },
      { icon: 'upload', label: 'Upload files…', run: () => $('file-input').click() },
      { icon: 'uploadFolder', label: 'Upload folder…', run: () => $('folder-input').click() },
      'sep',
      { icon: 'paste', label: 'Paste', disabled: !S.clipboard, kbd: 'Ctrl+V', run: () => paste(S.cwd) },
      { icon: 'refresh', label: 'Refresh', kbd: 'F5', run: refresh },
      { icon: 'link', label: 'Copy folder path', run: () => copyPathToClipboard(S.cwd) },
      { icon: 'terminal', label: 'Open terminal here', hidden: !(S.info && S.info.terminal), run: () => openTerminal(S.cwd) },
      { icon: 'download', label: 'Download folder as zip', run: () => downloadPaths([S.cwd]) },
    ]);
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  function rowFromEvent(ev) {
    const tr = ev.target.closest('#rows tr[data-path]');
    return tr || null;
  }

  function setupListEvents() {
    const tbody = $('rows');
    const wrap = $('table-wrap');

    document.addEventListener('pointerdown', (ev) => { S.lastPointer = ev.pointerType || 'mouse'; }, true);

    tbody.addEventListener('click', (ev) => {
      const tr = rowFromEvent(ev);
      if (!tr) return;
      if (tr.dataset.parent) {
        if (S.lastPointer === 'touch') go(tr.dataset.path);
        return;
      }
      const path = tr.dataset.path;
      if (ev.target.matches('input[type=checkbox]')) {
        toggleSelect(path);
        return;
      }
      if (S.lastPointer === 'touch' && !ev.shiftKey && !ev.ctrlKey && !ev.metaKey) {
        openEntry(S.byPath.get(path));
        return;
      }
      if (ev.shiftKey) rangeSelect(path, ev.ctrlKey || ev.metaKey);
      else if (ev.ctrlKey || ev.metaKey) toggleSelect(path);
      else selectOnly(path);
      wrap.focus({ preventScroll: true });
    });

    tbody.addEventListener('dblclick', (ev) => {
      const tr = rowFromEvent(ev);
      if (!tr || ev.target.matches('input')) return;
      if (tr.dataset.parent) {
        go(tr.dataset.path);
        return;
      }
      openEntry(S.byPath.get(tr.dataset.path));
    });

    wrap.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      const tr = rowFromEvent(ev);
      if (!tr || tr.dataset.parent) {
        if (!tr) selectOnly(null);
        emptyMenu(ev);
        return;
      }
      if (!S.selected.has(tr.dataset.path)) selectOnly(tr.dataset.path);
      rowMenu(ev, S.byPath.get(tr.dataset.path));
    });

    wrap.addEventListener('click', (ev) => {
      if (ev.target === wrap || ev.target.id === 'empty') selectOnly(null);
    });

    $('check-all').addEventListener('change', (ev) => {
      S.selected = ev.target.checked ? new Set(S.view.map((e) => e.path)) : new Set();
      updateSelectionUi();
    });

    document.querySelectorAll('.listing th.sortable').forEach((th) => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        S.sort = { key, desc: S.sort.key === key ? !S.sort.desc : false };
        store.set('sort', S.sort);
        render();
      });
    });

    // ----- drag & drop: internal moves and uploads from the desktop -----
    const files = $('files');
    const overlay = $('drop-overlay');
    let hoverRow = null;
    const isInternal = (dt) => [...dt.types].includes('application/x-sm-paths');
    const isExternal = (dt) => [...dt.types].includes('Files') && !isInternal(dt);
    const clearHover = () => {
      if (hoverRow) hoverRow.classList.remove('drop-hover');
      hoverRow = null;
    };
    const dropDirOf = (tr) => {
      if (!tr) return null;
      if (tr.dataset.parent) return tr.dataset.path;
      const e = S.byPath.get(tr.dataset.path);
      return e && isDirLike(e) ? e.path : null;
    };

    tbody.addEventListener('dragstart', (ev) => {
      const tr = rowFromEvent(ev);
      if (!tr || tr.dataset.parent) {
        ev.preventDefault();
        return;
      }
      if (!S.selected.has(tr.dataset.path)) selectOnly(tr.dataset.path);
      ev.dataTransfer.setData('application/x-sm-paths', JSON.stringify([...S.selected]));
      ev.dataTransfer.effectAllowed = 'copyMove';
    });

    files.addEventListener('dragover', (ev) => {
      const dt = ev.dataTransfer;
      if (!isInternal(dt) && !isExternal(dt)) return;
      const tr = rowFromEvent(ev);
      const dir = dropDirOf(tr);
      clearHover();
      if (dir && !(tr && S.selected.has(tr.dataset.path) && isInternal(dt))) {
        hoverRow = tr;
        tr.classList.add('drop-hover');
        overlay.classList.add('hidden');
      } else if (isExternal(dt) && !S.search) {
        $('drop-target').textContent = S.cwd;
        overlay.classList.remove('hidden');
      } else {
        overlay.classList.add('hidden');
        return;
      }
      ev.preventDefault();
      dt.dropEffect = isInternal(dt) ? (ev.ctrlKey || ev.altKey ? 'copy' : 'move') : 'copy';
    });

    files.addEventListener('dragleave', (ev) => {
      if (!files.contains(ev.relatedTarget)) {
        clearHover();
        overlay.classList.add('hidden');
      }
    });

    files.addEventListener('drop', (ev) => {
      ev.preventDefault();
      const dt = ev.dataTransfer;
      const tr = rowFromEvent(ev);
      const dir = dropDirOf(tr) || (S.search ? null : S.cwd);
      clearHover();
      overlay.classList.add('hidden');
      if (!dir) return;
      if (isInternal(dt)) {
        const paths = JSON.parse(dt.getData('application/x-sm-paths') || '[]');
        if (dir !== S.cwd || tr) moveTo(paths, dir, ev.ctrlKey || ev.altKey);
      } else if ([...dt.types].includes('Files')) {
        uploadDropped(dt, dir);
      }
    });

    // Tree drop targets
    const tree = $('tree');
    tree.addEventListener('dragover', (ev) => {
      const row = ev.target.closest('.tree-row');
      tree.querySelectorAll('.drop-hover').forEach((r) => r.classList.remove('drop-hover'));
      if (!row) return;
      const dt = ev.dataTransfer;
      if (!isInternal(dt) && !isExternal(dt)) return;
      ev.preventDefault();
      row.classList.add('drop-hover');
      dt.dropEffect = isInternal(dt) ? (ev.ctrlKey || ev.altKey ? 'copy' : 'move') : 'copy';
    });
    tree.addEventListener('dragleave', (ev) => {
      if (!tree.contains(ev.relatedTarget)) tree.querySelectorAll('.drop-hover').forEach((r) => r.classList.remove('drop-hover'));
    });
    tree.addEventListener('drop', (ev) => {
      const row = ev.target.closest('.tree-row');
      tree.querySelectorAll('.drop-hover').forEach((r) => r.classList.remove('drop-hover'));
      if (!row) return;
      ev.preventDefault();
      const dt = ev.dataTransfer;
      if (isInternal(dt)) moveTo(JSON.parse(dt.getData('application/x-sm-paths') || '[]'), row.dataset.path, ev.ctrlKey || ev.altKey);
      else if ([...dt.types].includes('Files')) uploadDropped(dt, row.dataset.path);
    });

    tree.addEventListener('click', (ev) => {
      const row = ev.target.closest('.tree-row');
      if (!row) return;
      if (ev.target.closest('[data-toggle]')) {
        toggleTreeNode(row.dataset.path);
        return;
      }
      if (S.search) S.search = null;
      go(row.dataset.path);
      $('sidebar').classList.remove('open');
    });
    tree.addEventListener('dblclick', (ev) => {
      const row = ev.target.closest('.tree-row');
      if (row && !ev.target.closest('[data-toggle]')) toggleTreeNode(row.dataset.path);
    });

    // Prevent the browser from opening files dropped outside of drop zones.
    window.addEventListener('dragover', (ev) => ev.preventDefault());
    window.addEventListener('drop', (ev) => ev.preventDefault());
  }

  function moveFocus(delta, extend) {
    if (!S.view.length) return;
    const paths = S.view.map((e) => e.path);
    let i = paths.indexOf(S.focus);
    i = i < 0 ? (delta > 0 ? 0 : paths.length - 1) : Math.max(0, Math.min(paths.length - 1, i + delta));
    const p = paths[i];
    if (extend) {
      if (!S.anchor) S.anchor = S.focus || p;
      rangeSelect(p, false);
    } else {
      selectOnly(p);
    }
    scrollToPath(p);
  }

  function setupKeyboard() {
    document.addEventListener('keydown', (ev) => {
      if (editorOpen()) {
        if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
          ev.preventDefault();
          if (!openModals) saveEditor();
        } else if (ev.key === 'Escape' && !openModals && !(ED.engine && ED.engine.dialogOpen())) {
          ev.preventDefault();
          hideEditor();
        }
        return;
      }
      if (openModals) return;
      if (ev.target.closest && ev.target.closest('#panel-terminal')) return; // keys belong to the shell
      if (ev.key === 'Escape' && !$('context-menu').classList.contains('hidden')) {
        closeMenu();
        return;
      }
      const inField = ev.target.matches('input, textarea, select');
      const mod = ev.ctrlKey || ev.metaKey;
      if (ev.key === 'F5') {
        ev.preventDefault();
        refresh();
        return;
      }
      if (ev.altKey && ev.key === 'ArrowLeft') { history.back(); ev.preventDefault(); return; }
      if (ev.altKey && ev.key === 'ArrowRight') { history.forward(); ev.preventDefault(); return; }
      if (ev.altKey && ev.key === 'ArrowUp') { goUp(); ev.preventDefault(); return; }
      if (inField) {
        if (ev.key === 'Escape' && ev.target.id === 'search') {
          exitSearch();
          ev.target.blur();
        }
        return;
      }
      if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('button, a, summary')) return;
      // Let the browser copy text the user selected (e.g. in the message log).
      if ((ev.ctrlKey || ev.metaKey) && 'cx'.includes(ev.key.toLowerCase()) && String(window.getSelection())) return;
      const c = ctx();
      switch (true) {
        case ev.key === 'ArrowDown': moveFocus(1, ev.shiftKey); break;
        case ev.key === 'ArrowUp': moveFocus(-1, ev.shiftKey); break;
        case ev.key === 'Home': moveFocus(-1e9, ev.shiftKey); break;
        case ev.key === 'End': moveFocus(1e9, ev.shiftKey); break;
        case ev.key === 'Enter': if (S.focus) openEntry(S.byPath.get(S.focus)); break;
        case ev.key === 'Backspace': goUp(); break;
        case ev.key === 'Delete': if (c.any) deleteEntries(c.sel); break;
        case ev.key === 'F2': if (c.one) renameEntry(c.one); break;
        case ev.key === 'Escape':
          if (S.search) exitSearch();
          else selectOnly(null);
          break;
        case mod && ev.key.toLowerCase() === 'a':
          S.selected = new Set(S.view.map((e) => e.path));
          updateSelectionUi();
          break;
        case mod && ev.key.toLowerCase() === 'c': if (c.any) setClipboard('copy'); break;
        case mod && ev.key.toLowerCase() === 'x': if (c.any) setClipboard('cut'); break;
        case mod && ev.key.toLowerCase() === 'v': if (S.clipboard && !S.search) paste(S.cwd); break;
        default: return;
      }
      ev.preventDefault();
    });

    document.addEventListener('click', (ev) => {
      if (!ev.target.closest('#context-menu')) closeMenu();
    });
    window.addEventListener('blur', closeMenu);
    window.addEventListener('resize', closeMenu);
    $('table-wrap').addEventListener('scroll', closeMenu);

    window.addEventListener('beforeunload', (ev) => {
      const uploading = Q.items.some((t) => ['queued', 'checking', 'starting', 'active'].includes(t.status));
      if (editorDirty() || uploading || T.connected) {
        ev.preventDefault();
        ev.returnValue = '';
      }
    });
  }

  function goUp() {
    if (S.search) {
      exitSearch();
      return;
    }
    if (S.cwd && S.cwd !== '/') {
      const child = S.cwd;
      go(parentPath(S.cwd));
      pendingSelect = child;
    }
  }

  let pendingSelect = null;

  function switchTab(name) {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    for (const tab of ['transfers', 'log', 'terminal']) {
      $('panel-' + tab).classList.toggle('hidden', name !== tab);
    }
    $('btn-clear-transfers').classList.toggle('hidden', name !== 'transfers');
    if (name === 'log') $('panel-log').scrollTop = $('panel-log').scrollHeight;
    if (name === 'terminal') {
      if (!T.term && !T.opening) openTerminal();
      else fitTerminal();
    }
  }

  function toggleBottom() {
    const bottom = $('bottom');
    const collapsed = bottom.classList.toggle('collapsed');
    if (collapsed) bottom.classList.remove('max');
    store.set('bottomCollapsed', collapsed);
    fitTerminal();
  }

  function toggleMaxBottom(force) {
    const bottom = $('bottom');
    const max = bottom.classList.toggle('max', force);
    if (max) bottom.classList.remove('collapsed');
    fitTerminal();
    if (max && T.term && !$('panel-terminal').classList.contains('hidden')) T.term.focus();
  }

  function setupBottomResizer() {
    const bottom = $('bottom');
    const handle = $('bottom-resizer');
    const saved = store.get('bottomHeight', null);
    if (saved) bottom.style.height = saved + 'px';
    handle.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      handle.setPointerCapture(ev.pointerId);
      handle.classList.add('active');
      const startY = ev.clientY;
      const startH = bottom.getBoundingClientRect().height;
      const move = (e) => {
        const h = Math.max(90, Math.min(window.innerHeight - 160, startH - (e.clientY - startY)));
        bottom.style.height = h + 'px';
        fitTerminal();
      };
      const up = () => {
        handle.classList.remove('active');
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        store.set('bottomHeight', Math.round(bottom.getBoundingClientRect().height));
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
    });
  }

  function setupChrome() {
    $('btn-sidebar').append(icon('menu'));
    $('btn-back').append(icon('back'));
    $('btn-forward').append(icon('forward'));
    $('btn-up').append(icon('up'));
    $('btn-refresh').append(icon('refresh'));
    $('btn-bookmark').append(icon('star'));
    $('btn-toggle-bottom').append(icon('panel'));
    $('btn-max-bottom').append(icon('maximize'));
    $('btn-max-bottom').addEventListener('click', () => toggleMaxBottom());
    setupBottomResizer();
    setupTerminal();
    document.querySelector('.brand-logo').append(icon('logo'));

    $('btn-back').addEventListener('click', () => history.back());
    $('btn-forward').addEventListener('click', () => history.forward());
    $('btn-up').addEventListener('click', goUp);
    $('btn-refresh').addEventListener('click', refresh);
    $('btn-bookmark').addEventListener('click', toggleBookmark);
    $('btn-sidebar').addEventListener('click', () => $('sidebar').classList.toggle('open'));
    $('btn-toggle-bottom').addEventListener('click', toggleBottom);
    $('btn-clear-transfers').addEventListener('click', clearFinishedTransfers);
    if (store.get('bottomCollapsed', false)) $('bottom').classList.add('collapsed');
    document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)));

    $('address-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      let p = $('address').value.trim() || '/';
      if (!p.startsWith('/')) p = joinPath(S.cwd || '/', p);
      if (S.search) S.search = null;
      go(p);
      $('address').blur();
    });

    const search = $('search');
    search.addEventListener('input', () => {
      if (S.search) return;
      S.filter = search.value;
      render();
    });
    $('search-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const q = search.value.trim();
      if (!q) {
        exitSearch();
        return;
      }
      if (S.search) S.search.path = S.search.path || S.cwd;
      runSearch(q);
    });

    $('file-input').addEventListener('change', (ev) => {
      const files = [...ev.target.files].map((file) => ({ file, rel: file.name }));
      ev.target.value = '';
      enqueueUploads(files, S.cwd);
    });
    $('folder-input').addEventListener('change', (ev) => {
      const files = [...ev.target.files].map((file) => ({ file, rel: file.webkitRelativePath || file.name }));
      ev.target.value = '';
      enqueueUploads(files, S.cwd);
    });

    // Sidebar resizing
    const sidebar = $('sidebar');
    const resizer = $('resizer');
    const savedWidth = store.get('sidebarWidth', null);
    if (savedWidth) sidebar.style.width = savedWidth + 'px';
    resizer.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      resizer.setPointerCapture(ev.pointerId);
      resizer.classList.add('active');
      const startX = ev.clientX;
      const startW = sidebar.getBoundingClientRect().width;
      const move = (e) => { sidebar.style.width = Math.max(160, startW + e.clientX - startX) + 'px'; };
      const up = () => {
        resizer.classList.remove('active');
        resizer.removeEventListener('pointermove', move);
        resizer.removeEventListener('pointerup', up);
        store.set('sidebarWidth', Math.round(sidebar.getBoundingClientRect().width));
      };
      resizer.addEventListener('pointermove', move);
      resizer.addEventListener('pointerup', up);
    });

    window.addEventListener('hashchange', () => {
      const p = hashPath();
      if (p === S.cwd && !S.search) return;
      S.search = null;
      const select = pendingSelect;
      pendingSelect = null;
      load(p, select ? { select: [select] } : {});
    });
  }

  // ---------------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------------

  async function init() {
    setupChrome();
    renderToolbar();
    setupEditor();
    setupListEvents();
    setupKeyboard();
    try {
      S.info = await api('GET', 'info');
    } catch (err) {
      fail(err, 'Could not connect');
      return;
    }
    const who = $('who');
    who.replaceChildren(h('strong', { text: S.info.user }), ' @ ' + S.info.hostname);
    if (S.info.full_access) {
      who.append(h('span', { class: 'warn-badge', text: 'full access', title: `The file manager runs as ${S.info.running_as}: be careful, you can modify any file of the system.` }));
    }
    document.title = `Server Manager · ${S.info.hostname}`;
    $('status-version').textContent = `v${S.info.version}`;
    $('tab-terminal').classList.toggle('hidden', !S.info.terminal);
    updateToolbar();
    logMsg('info', `Connected as ${S.info.user}. Managing ${S.info.root} as system user ${S.info.running_as}.`);
    renderBookmarks();
    await load(hashPath());
  }

  init();
})();
