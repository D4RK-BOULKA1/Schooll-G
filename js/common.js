/* School-G : stockage, authentification et composants d'interface.
   IMPORTANT : cette version enregistre les données dans le navigateur (localStorage).
   Pour un usage multi-appareils (parents sur leur téléphone), remplacez les fonctions
   de stockage ci-dessous (rd / wr) par Firebase : le reste de l'application ne change pas. */
(function () {
  'use strict';
  const C = window.SG_CONFIG;
  const K = 'sgv1_';
  const UI = (window.UI = {});
  const SG = (window.SG = {});

  /* ---------- utilitaires ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => (Math.round(+n || 0)).toLocaleString('fr-FR').replace(/[  ]/g, ' ') + ' FCFA';
  const fdate = d => { if (!d) return ''; const x = new Date(d); return isNaN(x) ? '' : x.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const today = () => new Date().toISOString().slice(0, 10);
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const monthLabel = ym => { const [y, m] = ym.split('-'); return MONTHS[+m - 1] + ' ' + y; };
  Object.assign(UI, { esc, money, fdate, uid, today, addDays, MONTHS, monthLabel });
  /* Écran de chargement : logo, nom, barre de progression qui avance en douceur. */
  UI.loading = (root, o = {}) => {
    const logo = b => b.logo ? `<img src="${b.logo}" alt="">` : '<i>G</i>';
    root.innerHTML = `<div class="ld"><div class="ld-in"><div class="ld-logo" id="ldLogo">${logo(o)}</div><div class="ld-name" id="ldName">${esc(o.name || 'School-G')}</div><div class="ld-sub" id="ldSub">${esc(o.sub || '')}</div><div class="ld-bar"><span id="ldFill"></span></div><div class="ld-msg" id="ldMsg"></div></div></div>`;
    const $ = id => root.querySelector('#' + id); let cur = 4, cap = 18, dead = false;
    const draw = () => { const f = $('ldFill'); if (f) f.style.width = cur.toFixed(1) + '%'; };
    const tick = setInterval(() => { if (dead || !$('ldFill')) return clearInterval(tick); cur += (cap - cur) * .08; draw(); }, 120);
    draw();
    const c = {
      set(pct, msg) { cap = Math.min(100, pct); if (msg != null && $('ldMsg')) $('ldMsg').textContent = msg; },
      brand(b) { if (!$('ldName')) return; $('ldName').textContent = b.name || 'School-G'; $('ldLogo').innerHTML = logo(b); },
      async done() { cap = 100; cur = Math.max(cur, 92); draw(); dead = true; clearInterval(tick); const f = $('ldFill'); if (f) f.style.width = '100%'; await new Promise(r => setTimeout(r, 260)); }
    };
    c.set(18, o.msg || 'Chargement…'); return c;
  };


  const rd = (k, d) => { try { const v = localStorage.getItem(K + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(K + k, JSON.stringify(v)); return true; } catch (e) { UI.toast('Espace de stockage plein : exportez vos données ou retirez des images.', 'err'); return false; } };

  async function hash(s) {
    const str = 'sg|' + s;
    if (window.crypto && crypto.subtle) {
      const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
    }
    let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return 'f' + h;
  }
  SG.hash = hash;

  /* ---------- icônes ---------- */
  const circ = (x, y, r) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  const P = {
    home: 'M3 10.5L12 3l9 7.5V21H3z M9 21v-7h6v7',
    users: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-6A3.5 3.5 0 0 0 3 18.5V20 M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7 M21 20v-1.5a3.5 3.5 0 0 0-2.5-3.3 M15.5 4.2a3.5 3.5 0 0 1 0 6.6',
    user: 'M19 20.5v-1.5a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v1.5 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    book: 'M5 3h14v18H5z M9 3v18 M12.5 8h3.5 M12.5 12h3.5',
    card: 'M2 5h20v14H2z M2 10h20 M6 15h4',
    cal: 'M3 5h18v16H3z M3 10h18 M8 2v5 M16 2v5',
    check: 'M4 12.5l5 5L20 6.5',
    clock: circ(12, 12, 9) + 'M12 7v5l3 2',
    file: 'M6 2h8l5 5v15H6z M14 2v5h5 M9 13h7 M9 17h7',
    box: 'M12 2.5l9 4.5v10l-9 4.5-9-4.5V7z M3 7l9 4.5L21 7 M12 11.5v10',
    cup: 'M4 8h13v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z M17 10h2a2.5 2.5 0 0 1 0 5h-2 M8 3v2 M12 3v2',
    down: 'M3 7l7 7 4-4 7 7 M15 17h6v-6',
    bell: 'M18 9a6 6 0 0 0-12 0c0 6-2.5 8-2.5 8h17S18 15 18 9 M10 21a2 2 0 0 0 4 0',
    set: 'M3 6h8 M15 6h6 M3 12h4 M11 12h10 M3 18h10 M17 18h4 ' + circ(13, 6, 2) + circ(9, 12, 2) + circ(15, 18, 2),
    id: 'M2 5h20v14H2z ' + circ(7.5, 11, 2) + 'M4.5 16.5c.5-1.5 1.7-2.2 3-2.2s2.5.7 3 2.2 M13 9.5h6 M13 14.5h4',
    plus: 'M12 5v14 M5 12h14',
    search: circ(11, 11, 7) + 'M21 21l-5-5',
    trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 14h10l1-14 M10 11v6 M14 11v6',
    edit: 'M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4',
    x: 'M6 6l12 12 M18 6L6 18',
    print: 'M7 9V3h10v6 M7 17H4V9h16v8h-3 M7 14h10v7H7z',
    dl: 'M12 3v12 M7 11l5 5 5-5 M4 20h16',
    up: 'M12 16V4 M7 8l5-5 5 5 M4 20h16',
    out: 'M9 4H4v16h5 M16 8l4 4-4 4 M20 12H9',
    menu: 'M3 6h18 M3 12h18 M3 18h18',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4',
    lock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4',
    eyeoff: 'M3 3l18 18 M10.6 6.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 4.2 M6.6 6.7C3.7 8.5 2 12 2 12s4 7 10 7a9.7 9.7 0 0 0 4.3-1 M9.9 9.9a3 3 0 0 0 4.2 4.2',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 ' + circ(12, 12, 3),
    award: circ(12, 9, 6) + 'M8.5 14l-1.5 8 5-3 5 3-1.5-8',
    grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    bars: 'M5 21V11 M12 21V4 M19 21v-7',
    wallet: 'M3 7h16a2 2 0 0 1 2 2v10H5a2 2 0 0 1-2-2z M3 7l14-3v3 M16 14h2',
    alert: 'M12 3l10 18H2z M12 10v5 M12 18v.5',
    ban: circ(12, 12, 9) + 'M5.7 5.7l12.6 12.6',
    layers: 'M12 3l9 5-9 5-9-5z M3 12.5l9 5 9-5 M3 17l9 5 9-5',
    arrow: 'M4 12h16 M14 6l6 6-6 6',
    school: 'M3 10l9-6 9 6 M5 10v10 M19 10v10 M3 20h18 M9 20v-6h6v6',
    phone: 'M6 3h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 12l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2',
    mail: 'M3 5h18v14H3z M3 6l9 7 9-7',
    chev: 'M6 9l6 6 6-6',
    list: 'M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01',
    refresh: 'M20 11a8 8 0 0 0-14-4L4 9 M4 4v5h5 M4 13a8 8 0 0 0 14 4l2-2 M20 20v-5h-5',
    key: circ(8, 15, 4) + 'M11 12l9-9 M16 7l3 3 M14 9l2 2',
    check2: circ(12, 12, 9) + 'M8 12.5l3 3 5-6'
  };
  const ic = (n, s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[n] || P.grid}"/></svg>`;
  UI.ic = ic;
  UI.badge = (t, k) => `<span class="bdg ${k || ''}">${t}</span>`;

  /* ---------- toast / modal ---------- */
  UI.toast = (msg, type) => {
    let box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'toast ' + (type || ''); t.textContent = msg; box.appendChild(t);
    setTimeout(() => t.remove(), 3800);
  };
  UI.modal = ({ title, body, actions = [], size = '' }) => {
    const ov = document.createElement('div'); ov.className = 'ov';
    ov.innerHTML = `<div class="mdl ${size}" role="dialog"><div class="mdl-h"><h3>${title}</h3><button class="x" data-close aria-label="Fermer">${ic('x', 20)}</button></div><div class="mdl-b">${body}</div><div class="mdl-f"></div></div>`;
    document.body.appendChild(ov); document.body.classList.add('noscroll');
    const close = () => { ov.remove(); if (!document.querySelector('.ov')) document.body.classList.remove('noscroll'); };
    ov.addEventListener('mousedown', e => { ov._down = e.target === ov; });
    ov.addEventListener('click', e => { if ((e.target === ov && ov._down) || e.target.closest('[data-close]')) close(); });
    const f = ov.querySelector('.mdl-f');
    actions.forEach(a => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + (a.cls || 'btn-ghost'); b.innerHTML = a.label;
      b.onclick = () => { const r = a.onClick ? a.onClick(ov, close) : undefined; if (r !== false) close(); };
      f.appendChild(b);
    });
    return { el: ov, close };
  };
  UI.confirm = (msg, onYes, o = {}) => UI.modal({
    title: o.title || 'Confirmation', size: 'sm', body: `<p>${msg}</p>`,
    actions: [{ label: 'Annuler' }, { label: o.yes || 'Confirmer', cls: o.danger ? 'btn-primary' : 'btn-navy', onClick: () => { onYes(); } }]
  });

  /* ---------- formulaires ---------- */
  function fieldHtml(f, v) {
    const val = v[f.name] != null ? v[f.name] : (f.def != null ? f.def : '');
    let inp;
    switch (f.type) {
      case 'select':
        inp = `<select name="${f.name}">${f.options.map(o => { const [a, b] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(a)}" ${String(a) === String(val) ? 'selected' : ''}>${esc(b)}</option>`; }).join('')}</select>`; break;
      case 'textarea': inp = `<textarea name="${f.name}" rows="${f.rows || 3}" ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''}>${esc(val)}</textarea>`; break;
      case 'checkbox': return `<div class="fld ${f.cls || ''}"><label class="chk"><input type="checkbox" name="${f.name}" ${val ? 'checked' : ''}><span>${f.label}</span></label>${f.hint ? `<small>${f.hint}</small>` : ''}</div>`;
      case 'multi': {
        const arr = Array.isArray(val) ? val : [];
        inp = `<div class="multi" data-multi="${f.name}">${f.options.map(o => { const [a, b] = Array.isArray(o) ? o : [o, o]; return `<label class="chk"><input type="checkbox" value="${esc(a)}" ${arr.includes(a) ? 'checked' : ''}><span>${esc(b)}</span></label>`; }).join('') || '<span class="muted small">Aucune option disponible</span>'}</div>`; break;
      }
      case 'img':
        inp = `<div class="imgf"><div class="imgp" data-prev="${f.name}">${val ? `<img src="${val}" alt="">` : ic('user', 26)}</div><div><input type="hidden" name="${f.name}" value="${val ? esc(val) : ''}"><label class="btn btn-ghost btn-sm">Choisir une image<input type="file" accept="image/*" hidden data-img="${f.name}" data-max="${f.max || 360}"></label> <button type="button" class="btn btn-ghost btn-sm" data-imgclear="${f.name}">Retirer</button></div></div>`; break;
      default:
        inp = `<input type="${f.type || 'text'}" name="${f.name}" value="${esc(val)}" ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''} ${f.min != null ? `min="${f.min}"` : ''} ${f.step ? `step="${f.step}"` : ''} ${f.list ? `list="${f.list}"` : ''} ${f.req ? 'required' : ''} ${f.auto ? `autocomplete="${f.auto}"` : ''}>`;
    }
    return `<div class="fld ${f.cls || ''}"><label>${f.label}${f.req ? ' *' : ''}</label>${inp}${f.hint ? `<small>${f.hint}</small>` : ''}</div>`;
  }
  UI.fields = (fields, vals = {}) => fields.map(f => f.html ? f.html : fieldHtml(f, vals)).join('');
  UI.read = root => {
    const o = {};
    root.querySelectorAll('[name]').forEach(el => {
      if (el.type === 'checkbox') o[el.name] = el.checked;
      else if (el.type === 'number') o[el.name] = el.value === '' ? '' : +el.value;
      else o[el.name] = el.value;
    });
    root.querySelectorAll('[data-multi]').forEach(m => { o[m.dataset.multi] = [...m.querySelectorAll('input:checked')].map(i => i.value); });
    return o;
  };
  UI.formModal = ({ title, fields, values = {}, submit = 'Enregistrer', onSubmit, size = '', extra = '', after }) => {
    const m = UI.modal({
      title, size, body: `<form class="frm" novalidate>${UI.fields(fields, values)}${extra}</form>`,
      actions: [{ label: 'Annuler' }, {
        label: submit, cls: 'btn-primary', onClick: (ov) => {
          const form = ov.querySelector('form'); const v = UI.read(form);
          for (const f of fields) { if (f.req && (v[f.name] === '' || v[f.name] == null)) { UI.toast('Champ obligatoire : ' + f.label.replace(/<[^>]+>/g, ''), 'err'); const el = form.querySelector(`[name="${f.name}"]`); el && el.focus(); return false; } }
          return onSubmit(v, ov);
        }
      }]
    });
    m.el.querySelector('form').addEventListener('submit', e => e.preventDefault());
    if (after) after(m.el);
    return m;
  };
  function resizeImg(file, max, cb) {
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, max / Math.max(im.width, im.height)); const cv = document.createElement('canvas');
        cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
        const cx = cv.getContext('2d'); const png = /png|svg|gif/.test(file.type);
        if (!png) { cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); }
        cx.drawImage(im, 0, 0, cv.width, cv.height);
        cb(cv.toDataURL(png ? 'image/png' : 'image/jpeg', .82));
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  }
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.matches && t.matches('input[data-img]') && t.files[0]) {
      const name = t.dataset.img; const root = t.closest('.fld');
      resizeImg(t.files[0], +t.dataset.max || 360, url => {
        root.querySelector(`input[type=hidden][name="${name}"]`).value = url;
        root.querySelector('.imgp').innerHTML = `<img src="${url}" alt="">`;
        root.dispatchEvent(new CustomEvent('imgchange', { bubbles: true, detail: { name, url } }));
      });
    }
  });
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-imgclear]');
    if (b) {
      const root = b.closest('.fld'); root.querySelector('input[type=hidden]').value = ''; root.querySelector('.imgp').innerHTML = ic('user', 26);
      root.dispatchEvent(new CustomEvent('imgchange', { bubbles: true, detail: { name: b.dataset.imgclear, url: '' } }));
    }
  });

  /* ---------- sorties ---------- */
  UI.print = (html, css = '') => {
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    const d = f.contentWindow.document; d.open();
    d.write(`<!doctype html><html><head><meta charset="utf-8"><title>School-G</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Public+Sans:wght@400;500;600;700&display=swap"><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Public Sans',system-ui,sans-serif;color:#14213D;-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{size:A4;margin:10mm}${css}</style></head><body>${html}</body></html>`);
    d.close();
    setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { } setTimeout(() => f.remove(), 60000); }, 600);
  };
  UI.csv = (name, rows) => {
    const t = rows.map(r => r.map(c => { c = c == null ? '' : String(c); return /[";\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(';')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + t], { type: 'text/csv;charset=utf-8' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  };
  UI.download = (name, text, type = 'application/json') => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  };
  UI.bars = (data, o = {}) => {
    const cols = o.colors || ['var(--orange)', 'var(--navy)']; const h = o.h || 170; const f = o.fmt || (v => v);
    const max = Math.max(1, ...data.flatMap(d => d.v));
    return `<div class="bars" style="height:${h}px">${data.map(d => `<div class="bar"><div class="grp">${d.v.map((v, i) => `<i title="${esc(f(v))}" style="height:${Math.round(v / max * 100)}%;background:${cols[i % cols.length]}"></i>`).join('')}</div><em>${esc(d.label)}</em></div>`).join('')}</div>`;
  };

  /* ---------- statut d'un abonnement (calcul partagé) ---------- */
  SG.status = s => {
    const now = Date.now();
    if (s.banned) return 'banned';
    if (s.blocked) return 'blocked';
    if (s.paidUntil && new Date(s.paidUntil) > now) return 'active';
    if (s.trialEnd && !s.trialCancelled && new Date(s.trialEnd) > now) return 'trial';
    return 'expired';
  };
  SG.STATUS = { banned: ['Banni', 'bad'], blocked: ['Bloqué', 'bad'], active: ['Abonné', 'ok'], trial: ['Essai', 'info'], expired: ['Expiré', 'warn'] };
  SG.daysLeft = s => { const st = SG.status(s); const end = st === 'active' ? s.paidUntil : s.trialEnd; return end ? Math.ceil((new Date(end) - Date.now()) / 864e5) : 0; };

  const schoolYear = () => { const n = new Date(); return n.getMonth() >= 7 ? n.getFullYear() : n.getFullYear() - 1; };
  SG.defaultData = s => {
    const y = schoolYear();
    return {
      v: 1,
      settings: {
        name: s.name || '', address: '', phone: s.phone || '', email: s.email || '', city: s.city || '', logo: '', year: y + '-' + (y + 1), motto: '', accent: '#E4572E',
        tranches: [{ label: '1re tranche', pct: 40, due: y + '-10-31' }, { label: '2e tranche', pct: 35, due: (y + 1) + '-01-31' }, { label: '3e tranche', pct: 25, due: (y + 1) + '-03-31' }],
        cantinePrice: 5000, compWeight: 1, periods: ['Trimestre 1', 'Trimestre 2', 'Trimestre 3'],
        days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
        slots: ['08:00-09:00', '09:00-10:00', '10:00-10:15', '10:15-11:15', '11:15-12:15', '15:00-16:00', '16:00-17:00'],
        ministry: "MINISTÈRE DE L'ÉDUCATION NATIONALE", academy: ''
      },
      classes: [], students: [], teachers: [], payments: [], salaries: [], expenses: [], stock: [], moves: [],
      attendance: {}, subjects: {}, notes: {}, timetable: {}, notices: [], customTheme: null, counters: { receipt: 0, student: 0 }
    };
  };
  SG.waLink = (num, text) => 'https://wa.me/' + String(num || '').replace(/\D/g, '') + (text ? '?text=' + encodeURIComponent(text) : '');
  SG.rd = rd; SG.wr = wr;

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
})();
