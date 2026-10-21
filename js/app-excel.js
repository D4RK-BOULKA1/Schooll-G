/* School-G : export / import Excel (.xlsx), liste de classe et fiche d'appel imprimables */
(function () {
  'use strict';
  const A = window.APP; if (!A) return;
  const { D, U, ST } = A; const { esc, money, fdate, ic, uid, today, badge } = U; const V = A.views, ACT = A.acts;

  /* ================= écriture .xlsx ================= */
  const col = i => { let s = '', n = i + 1; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  const xe = v => String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function sheetXml(rows, widths) {
    const cols = (widths || []).map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
    const body = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => {
      if (v == null || v === '') return '';
      const ref = col(ci) + (ri + 1), st = ri === 0 ? ' s="1"' : '';
      return typeof v === 'number' && isFinite(v) ? `<c r="${ref}"${st}><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${xe(v)}</t></is></c>`;
    }).join('')}</row>`).join('');
    const last = col(Math.max(0, (rows[0] || ['A']).length - 1)) + Math.max(1, rows.length);
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>${cols ? `<cols>${cols}</cols>` : ''}<sheetData>${body}</sheetData><autoFilter ref="A1:${last}"/></worksheet>`;
  }
  async function buildXlsx(sheets) { // sheets : [{ name, rows, widths }]
    const z = new JSZip();
    z.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
    z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    z.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${xe(s.name.replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`);
    z.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    z.file('xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F2A44"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
    sheets.forEach((s, i) => z.file(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s.rows, s.widths)));
    return z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', compression: 'DEFLATE' });
  }
  function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }

  /* ================= lecture .xlsx / .csv ================= */
  const xdoc = s => new DOMParser().parseFromString(s, 'application/xml');
  const txt = n => Array.from(n.getElementsByTagName('t')).map(t => t.textContent).join('');
  async function readXlsx(buf) {
    const z = await JSZip.loadAsync(buf);
    let shared = []; const ss = z.file('xl/sharedStrings.xml');
    if (ss) shared = Array.from(xdoc(await ss.async('string')).getElementsByTagName('si')).map(txt);
    let path = 'xl/worksheets/sheet1.xml';
    try {
      const wb = xdoc(await z.file('xl/workbook.xml').async('string')), rel = xdoc(await z.file('xl/_rels/workbook.xml.rels').async('string'));
      const sh = wb.getElementsByTagName('sheet')[0], rid = sh && (sh.getAttribute('r:id') || sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id'));
      const r = Array.from(rel.getElementsByTagName('Relationship')).find(x => x.getAttribute('Id') === rid);
      if (r) { const t = r.getAttribute('Target'); path = t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, ''); }
    } catch (e) { }
    const f = z.file(path); if (!f) throw new Error('Feuille introuvable dans le fichier.');
    const rows = [];
    Array.from(xdoc(await f.async('string')).getElementsByTagName('row')).forEach(row => {
      const out = []; let pos = 0;
      Array.from(row.getElementsByTagName('c')).forEach(c => {
        const ref = c.getAttribute('r') || ''; const m = /^([A-Z]+)/.exec(ref); let ci = pos;
        if (m) { ci = 0; for (const ch of m[1]) ci = ci * 26 + (ch.charCodeAt(0) - 64); ci -= 1; }
        const t = c.getAttribute('t'), v = c.getElementsByTagName('v')[0];
        let val = '';
        if (t === 'inlineStr') val = txt(c); else if (t === 's') val = shared[+(v ? v.textContent : -1)] || ''; else if (v) val = t === 'str' || t === 'b' || t === 'e' ? v.textContent : (isNaN(+v.textContent) ? v.textContent : +v.textContent);
        out[ci] = val; pos = ci + 1;
      });
      rows.push(Array.from(out, x => x == null ? '' : x));
    });
    return rows;
  }
  function readCsv(text) {
    text = text.replace(/^﻿/, ''); const first = text.split(/\r?\n/)[0] || '';
    const d = [';', '\t', ','].map(x => [x, first.split(x).length]).sort((a, b) => b[1] - a[1])[0][0];
    const rows = []; let r = [], c = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
      else if (ch === '"') q = true; else if (ch === d) { r.push(c); c = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; r.push(c); c = ''; rows.push(r); r = []; }
      else c += ch;
    }
    if (c || r.length) { r.push(c); rows.push(r); }
    return rows;
  }

  /* ================= export ================= */
  const classOf = id => (A.cls(id) || {}).name || '';
  const stuRows = () => [['Matricule', 'Nom', 'Prénoms', 'Sexe', 'Date de naissance', 'Lieu de naissance', 'Classe', 'Parent / tuteur', 'Téléphone parent', 'Email parent', 'Adresse', 'Statut', 'Scolarité due', 'Scolarité payée', 'Reste à payer']]
    .concat(D.students.slice().sort((a, b) => A.name(a).localeCompare(A.name(b))).map(s => [s.matricule, s.last, s.first, s.sex, s.birth || '', s.birthplace || '', classOf(s.classId), s.parent || '', s.parentPhone || '', s.parentEmail || '', s.address || '', s.status, A.tuition(s), A.paidScol(s.id), A.balance(s)]));
  const stuWidths = [11, 18, 22, 6, 14, 18, 14, 22, 16, 24, 22, 10, 14, 14, 14];
  const payRows = () => [['Date', 'N° de reçu', 'Élève', 'Classe', 'Type', 'Mois', 'Montant (FCFA)', 'Mode', 'Statut']]
    .concat(D.payments.slice().sort((a, b) => a.date.localeCompare(b.date)).map(p => { const s = A.stu(p.studentId); return [p.date, p.ref || '', s ? A.name(s) : '', s ? classOf(s.classId) : '', p.type, p.month || '', +p.amount || 0, p.method || '', p.status]; }));
  const expRows = () => [['Date', 'Libellé', 'Catégorie', 'Montant (FCFA)', 'Mode', 'Note']].concat((D.expenses || []).slice().sort((a, b) => a.date.localeCompare(b.date)).map(e => [e.date, e.label, e.cat || '', +e.amount || 0, e.method || '', e.note || '']));
  function accRows() {
    const m = {}; D.payments.filter(p => p.status === 'validé').forEach(p => { const k = (p.date || '').slice(0, 7); (m[k] = m[k] || [0, 0])[0] += +p.amount || 0; });
    (D.expenses || []).forEach(e => { const k = (e.date || '').slice(0, 7); (m[k] = m[k] || [0, 0])[1] += +e.amount || 0; });
    return [['Mois', 'Encaissements', 'Dépenses', 'Solde']].concat(Object.keys(m).sort().map(k => [k, m[k][0], m[k][1], m[k][0] - m[k][1]]));
  }
  const clsRows = () => [['Classe', 'Cycle', 'Effectif', 'Scolarité annuelle', 'Frais d\'inscription', 'Capacité']].concat(D.classes.map(c => [c.name, c.cycle || '', D.students.filter(s => s.classId === c.id && s.status !== 'radié').length, +c.tuition || 0, +c.inscription || 0, +c.capacity || 0]));
  const fname = base => base + '-' + String(D.settings.name || 'ecole').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + today() + '.xlsx';
  ACT['xl-all'] = async () => {
    try { download(await buildXlsx([{ name: 'Élèves', rows: stuRows(), widths: stuWidths }, { name: 'Paiements', rows: payRows(), widths: [12, 16, 26, 14, 14, 10, 16, 14, 10] }, { name: 'Dépenses', rows: expRows(), widths: [12, 30, 18, 16, 14, 30] }, { name: 'Comptabilité', rows: accRows(), widths: [12, 16, 16, 16] }, { name: 'Classes', rows: clsRows(), widths: [16, 12, 10, 18, 18, 10] }]), fname('ecole')); UI.toast('Fichier Excel téléchargé.', 'ok'); } catch (e) { UI.toast('Export impossible : ' + e.message, 'err'); }
  };
  ACT['xl-stu'] = async () => { try { download(await buildXlsx([{ name: 'Élèves', rows: stuRows(), widths: stuWidths }]), fname('eleves')); UI.toast('Liste des élèves téléchargée.', 'ok'); } catch (e) { UI.toast('Export impossible : ' + e.message, 'err'); } };
  ACT['xl-pay'] = async () => { try { download(await buildXlsx([{ name: 'Paiements', rows: payRows(), widths: [12, 16, 26, 14, 14, 10, 16, 14, 10] }, { name: 'Dépenses', rows: expRows(), widths: [12, 30, 18, 16, 14, 30] }, { name: 'Comptabilité', rows: accRows(), widths: [12, 16, 16, 16] }]), fname('comptabilite')); UI.toast('Comptabilité téléchargée.', 'ok'); } catch (e) { UI.toast('Export impossible : ' + e.message, 'err'); } };
  ACT['xl-tpl'] = async () => {
    const head = ['Nom', 'Prénoms', 'Sexe', 'Date de naissance', 'Lieu de naissance', 'Classe', 'Parent / tuteur', 'Téléphone parent', 'Email parent', 'Adresse'];
    const cn = (D.classes[0] || {}).name || '6ème A';
    try { download(await buildXlsx([{ name: 'Élèves', rows: [head, ['TRAORE', 'Awa', 'F', '2012-03-14', 'Bamako', cn, 'Moussa Traoré', '70000000', '', 'Hamdallaye'], ['DIALLO', 'Ibrahim', 'M', '2011-11-02', 'Kati', cn, 'Fanta Diallo', '66000000', '', '']], widths: [16, 22, 6, 16, 18, 14, 22, 16, 22, 22] }, { name: 'Classes existantes', rows: [['Classe']].concat(D.classes.map(c => [c.name])), widths: [24] }]), 'modele-import-eleves.xlsx'); } catch (e) { UI.toast(e.message, 'err'); }
  };

  /* ================= import ================= */
  const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const KEYS = { last: ['nom', 'nomdefamille', 'lastname', 'last', 'nomeleve'], first: ['prenoms', 'prenom', 'firstname', 'first'], sex: ['sexe', 'genre'], birth: ['datedenaissance', 'naissance', 'datenaissance', 'nele', 'dn'], birthplace: ['lieudenaissance', 'lieunaissance', 'lieu', 'anaissance'], cls: ['classe', 'class', 'niveau'], parent: ['parenttuteur', 'parent', 'tuteur', 'parentoututeur', 'nomduparent', 'pere'], parentPhone: ['telephoneparent', 'telephone', 'tel', 'phone', 'contact', 'telparent', 'telephonedupparent', 'telephonedeparent'], parentEmail: ['emailparent', 'email', 'mail', 'courriel'], address: ['adresse', 'domicile'] };
  const toIso = v => {
    if (v === '' || v == null) return '';
    if (typeof v === 'number' && v > 15000 && v < 80000) return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5).toISOString().slice(0, 10);
    const s = String(v).trim(); let m;
    if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s))) return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
    if ((m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/.exec(s))) { let y = +m[3]; if (y < 100) y += y > 30 ? 1900 : 2000; return y + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0'); }
    return '';
  };
  const toSex = v => { const n = norm(v); return /^(f|fille|feminin|femme)$/.test(n) ? 'F' : 'M'; };
  const phone = v => String(v == null ? '' : v).trim().replace(/\.0$/, '');
  function parse(rows) {
    rows = rows.filter(r => r.some(c => String(c).trim() !== '')); if (rows.length < 2) throw new Error('Le fichier ne contient aucune ligne d\'élève.');
    const head = rows[0].map(norm), idx = {};
    Object.keys(KEYS).forEach(k => { const i = head.findIndex(h => KEYS[k].includes(h)); if (i >= 0) idx[k] = i; });
    if (idx.last == null || idx.first == null) throw new Error('Colonnes « Nom » et « Prénoms » introuvables. Utilisez le modèle proposé.');
    const get = (r, k) => idx[k] == null ? '' : r[idx[k]];
    const key = (l, f, b) => norm(l) + '|' + norm(f) + '|' + (b || '');
    const have = new Set(D.students.map(s => key(s.last, s.first, s.birth || ''))), seen = new Set();
    const out = [], bad = [];
    rows.slice(1).forEach((r, i) => {
      const last = String(get(r, 'last')).trim(), first = String(get(r, 'first')).trim();
      if (!last && !first) return; if (!last || !first) { bad.push('Ligne ' + (i + 2) + ' : nom ou prénoms manquant'); return; }
      const birth = toIso(get(r, 'birth')), k = key(last, first, birth);
      if (have.has(k) || seen.has(k)) { bad.push('Ligne ' + (i + 2) + ' : ' + last + ' ' + first + ' existe déjà (ignoré)'); return; } seen.add(k);
      out.push({ last, first, sex: toSex(get(r, 'sex')), birth, birthplace: String(get(r, 'birthplace')).trim(), clsName: String(get(r, 'cls')).trim(), parent: String(get(r, 'parent')).trim(), parentPhone: phone(get(r, 'parentPhone')), parentEmail: String(get(r, 'parentEmail')).trim(), address: String(get(r, 'address')).trim() });
    });
    return { list: out, bad, hasCls: idx.cls != null };
  }
  function importModal(res) {
    const known = {}; D.classes.forEach(c => { known[norm(c.name)] = c; });
    const missing = [...new Set(res.list.filter(s => s.clsName && !known[norm(s.clsName)]).map(s => s.clsName))];
    const noCls = res.list.filter(s => !s.clsName).length;
    UI.modal({
      title: 'Importer des élèves', size: 'lg',
      body: `<div class="kpis" style="margin-bottom:14px"><div class="kpi g"><small>Élèves à importer</small><b>${res.list.length}</b></div><div class="kpi ${res.bad.length ? 'o' : ''}"><small>Lignes ignorées</small><b>${res.bad.length}</b></div><div class="kpi"><small>Classes à créer</small><b>${missing.length}</b></div></div>
      ${missing.length ? `<label style="display:flex;gap:8px;align-items:flex-start;margin-bottom:12px"><input type="checkbox" id="xl-mk" checked style="margin-top:4px"><span>Créer les classes qui n'existent pas encore : <b>${missing.map(esc).join(', ')}</b><br><small class="muted">Sans cette option, ces élèves sont ignorés.</small></span></label>` : ''}
      ${noCls && !D.classes.length ? '' : noCls ? `<p class="small muted" style="margin-bottom:12px">${noCls} élève(s) sans classe seront rangés dans « ${esc((D.classes[0] || {}).name || 'Non classé')} ».</p>` : ''}
      ${res.bad.length ? `<details style="margin-bottom:12px"><summary class="small" style="cursor:pointer">Voir les lignes ignorées (${res.bad.length})</summary><div class="small muted" style="max-height:140px;overflow:auto;margin-top:6px">${res.bad.slice(0, 80).map(esc).join('<br>')}</div></details>` : ''}
      <div class="tw" style="max-height:240px;overflow:auto"><table class="tbl"><thead><tr><th>Nom</th><th>Prénoms</th><th>Classe</th><th>Parent</th><th>Téléphone</th></tr></thead><tbody>${res.list.slice(0, 30).map(s => `<tr><td>${esc(s.last)}</td><td>${esc(s.first)}</td><td>${esc(s.clsName || '—')}</td><td>${esc(s.parent)}</td><td>${esc(s.parentPhone)}</td></tr>`).join('')}</tbody></table></div>${res.list.length > 30 ? `<p class="small muted" style="margin-top:6px">Et ${res.list.length - 30} autre(s)…</p>` : ''}`,
      actions: [{ label: 'Annuler' }, {
        label: 'Importer ' + res.list.length + ' élève(s)', cls: 'btn-primary', onClick: ov => {
          const mk = ov.querySelector('#xl-mk'), create = mk && mk.checked; let made = 0, skipped = 0, n = 0;
          if (create) missing.forEach(nm => { const c = { id: uid(), name: nm, cycle: 'Primaire', tuition: 0, inscription: 0, capacity: 40, teacherId: '' }; D.classes.push(c); known[norm(nm)] = c; made++; });
          res.list.forEach(s => {
            let c = s.clsName ? known[norm(s.clsName)] : D.classes[0];
            if (!c) { skipped++; return; }
            D.students.push({ id: uid(), matricule: 'ELV-' + String(++D.counters.student).padStart(4, '0'), pin: A.pin(), status: 'inscrit', createdAt: today(), discount: 0, cantine: false, photo: '', last: s.last, first: s.first, sex: s.sex, birth: s.birth, birthplace: s.birthplace, classId: c.id, parent: s.parent, parentPhone: s.parentPhone, parentEmail: s.parentEmail, address: s.address }); n++;
          });
          A.save(); A.rerender(); UI.toast(n + ' élève(s) importé(s)' + (made ? ', ' + made + ' classe(s) créée(s)' : '') + (skipped ? ', ' + skipped + ' ignoré(s) (classe inconnue)' : '') + '.', 'ok');
        }
      }]
    });
  }
  async function importFile(file) {
    try {
      const name = file.name.toLowerCase(); let rows;
      if (/\.xlsx$/.test(name)) rows = await readXlsx(await file.arrayBuffer());
      else if (/\.(csv|txt)$/.test(name)) rows = readCsv(await file.text());
      else throw new Error('Format non pris en charge. Utilisez un fichier .xlsx ou .csv.');
      importModal(parse(rows));
    } catch (e) { UI.toast(e.message || 'Fichier illisible.', 'err'); }
  }
  ACT['xl-imp'] = () => { let i = document.getElementById('xl-file'); if (!i) { i = document.createElement('input'); i.type = 'file'; i.id = 'xl-file'; i.accept = '.xlsx,.csv,.txt'; i.hidden = true; i.onchange = () => { const f = i.files[0]; i.value = ''; if (f) importFile(f); }; document.body.appendChild(i); } i.click(); };
  A._xl = { buildXlsx, readXlsx, readCsv, parse };

  /* ================= liste de classe et fiche d'appel ================= */
  const CSS = `body{font-family:'Public Sans',Arial,sans-serif;color:#1b2236;padding:6mm}h1{font-size:20px;margin-bottom:2px}h2{font-size:14px;font-weight:600;margin:0 0 10px}.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1f2a44;padding-bottom:8px;margin-bottom:12px}.hd small{color:#5a6378}
table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #9aa3b5;padding:5px 6px;text-align:left}th{background:#e9ecf3;font-size:11px}td.c,th.c{text-align:center}.ft{margin-top:12px;font-size:12px;display:flex;justify-content:space-between}
.sg td,.sg th{padding:0;height:22px;font-size:9.5px;text-align:center}.sg td.n{text-align:left;padding:0 5px;font-size:11px;white-space:nowrap}.sg th.d{width:19px}.we{background:#f2f3f7}@page{margin:8mm}`;
  function classStudents(cid) { return D.students.filter(s => s.classId === cid && s.status !== 'radié').sort((a, b) => A.name(a).localeCompare(A.name(b))); }
  const head = (title, c, extra) => { const S = D.settings; return `<div class="hd"><div><h1>${esc(S.name || 'École')}</h1><small>${esc(S.year || '')}${S.city ? ' · ' + esc(S.city) : ''}</small></div><div style="text-align:right"><h2 style="margin:0">${title}</h2><small>Classe : <b>${esc(c.name)}</b>${(A.tch && c.teacherId && A.tch(c.teacherId)) ? ' · Titulaire : ' + esc(A.tch(c.teacherId).name) : ''}${extra || ''}</small></div></div>`; };
  function classListHtml(c) {
    const l = classStudents(c.id), m = l.filter(s => s.sex !== 'F').length;
    return head('Liste de classe', c) + `<table><thead><tr><th class="c" style="width:34px">N°</th><th>Matricule</th><th>Nom et prénoms</th><th class="c">Sexe</th><th>Date de naissance</th><th>Parent / tuteur</th><th>Téléphone</th></tr></thead><tbody>${l.map((s, i) => `<tr><td class="c">${i + 1}</td><td>${esc(s.matricule)}</td><td><b>${esc(s.last.toUpperCase())}</b> ${esc(s.first)}</td><td class="c">${esc(s.sex || '')}</td><td>${s.birth ? fdate(s.birth) : ''}</td><td>${esc(s.parent || '')}</td><td>${esc(s.parentPhone || '')}</td></tr>`).join('')}</tbody></table><div class="ft"><span>Effectif : <b>${l.length}</b> (${m} garçon(s), ${l.length - m} fille(s))</span><span>Édité le ${fdate(today())}</span></div>`;
  }
  function callSheetHtml(c, month) {
    const [y, mo] = month.split('-').map(Number), n = new Date(y, mo, 0).getDate(), days = [];
    for (let d = 1; d <= n; d++) { const w = new Date(y, mo - 1, d).getDay(); if (w !== 0) days.push([d, 'DLMMJVS'[w]]); }
    const l = classStudents(c.id), pad = Math.max(0, 25 - l.length);
    const cells = () => days.map(() => '<td></td>').join('');
    return head('Fiche d\'appel', c, ' · ' + U.monthLabel(month)) + `<table class="sg"><thead><tr><th style="width:24px">N°</th><th style="text-align:left;padding-left:5px">Nom et prénoms</th>${days.map(([d, w]) => `<th class="d">${w}<br>${d}</th>`).join('')}<th style="width:34px">Abs.</th></tr></thead><tbody>${l.map((s, i) => `<tr><td>${i + 1}</td><td class="n"><b>${esc(s.last.toUpperCase())}</b> ${esc(s.first)}</td>${cells()}<td></td></tr>`).join('')}${Array.from({ length: pad }, (_, i) => `<tr><td>${l.length + i + 1}</td><td class="n"></td>${cells()}<td></td></tr>`).join('')}</tbody></table><div class="ft"><span>P = présent, A = absent, R = retard</span><span>Visa du titulaire : ____________________</span></div><style>@page{size:A4 landscape}</style>`;
  }
  ACT['cls-print'] = () => {
    if (!D.classes.length) return UI.toast('Créez d\'abord une classe.', 'err');
    const def = ST.aCls || (D.classes.find(c => classStudents(c.id).length) || D.classes[0]).id;
    UI.formModal({
      title: 'Liste de classe et fiche d\'appel', size: 'sm', submit: 'Imprimer',
      fields: [{ name: 'cid', label: 'Classe', type: 'select', options: A.classOpts() }, { name: 'kind', label: 'Document', type: 'select', options: [['list', 'Liste de classe'], ['call', 'Fiche d\'appel mensuelle']] }, { name: 'month', label: 'Mois (fiche d\'appel)', type: 'month', def: today().slice(0, 7) }],
      values: { cid: def, kind: 'list', month: today().slice(0, 7) },
      onSubmit: v => { const c = A.cls(v.cid); if (!c) return false; if (!classStudents(c.id).length && v.kind === 'list') { UI.toast('Aucun élève dans cette classe.', 'err'); return false; } U.print(v.kind === 'call' ? callSheetHtml(c, v.month || today().slice(0, 7)) : classListHtml(c), CSS); }
    });
  };
  A._xl.classListHtml = classListHtml; A._xl.callSheetHtml = callSheetHtml;

  /* ================= boutons dans les pages existantes ================= */
  const inject = (sel, html) => { const ac = document.querySelector(sel || '.ph .ac'); if (ac) ac.insertAdjacentHTML('afterbegin', html); };
  const b = (act, label, icon) => A.btn(act, label, { icon });
  const wrap = (name, fn) => { const old = V[name]; if (!old) return; V[name] = function () { const r = old.apply(this, arguments); try { fn(); } catch (e) { } return r; }; };
  wrap('students', () => inject('.ph .ac', b('xl-imp', 'Importer Excel', 'up') + b('xl-stu', 'Exporter Excel', 'dl') + b('cls-print', 'Liste et appel', 'list')));
  wrap('classes', () => inject('.ph .ac', b('cls-print', 'Liste et fiche d\'appel', 'list')));
  wrap('attendance', () => inject('.ph .ac', b('cls-print', 'Fiche d\'appel', 'list')));
  wrap('payments', () => inject('.ph .ac', b('xl-pay', 'Exporter Excel', 'dl')));
  wrap('settings', () => { const l = document.getElementById('imp'); const box = l && l.closest('div'); if (box) box.insertAdjacentHTML('afterbegin', b('xl-all', 'Exporter en Excel', 'dl') + b('xl-imp', 'Importer des élèves (Excel)', 'up') + b('xl-tpl', 'Modèle Excel', 'dl')); });
})();
