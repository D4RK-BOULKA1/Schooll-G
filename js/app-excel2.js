/* School-G : import / export Excel des professeurs et des notes (bulletins) */
(function () {
  'use strict';
  const A = window.APP; if (!A || !A._xl) return;
  const { D, U, ST } = A; const { esc, money, ic, uid, today } = U; const V = A.views, ACT = A.acts;
  const X = A._xl, norm = X.norm;
  const cell = v => String(v == null ? '' : v).trim();
  const classOf = id => (A.cls(id) || {}).name || '';

  /* ---------- sélecteur de fichier commun ---------- */
  function pick(cb) {
    let i = document.getElementById('xl2-file'); if (i) i.remove();
    i = document.createElement('input'); i.type = 'file'; i.id = 'xl2-file'; i.accept = '.xlsx,.csv,.txt'; i.hidden = true;
    i.onchange = async () => {
      const f = i.files[0]; i.value = ''; if (!f) return;
      try {
        const n = f.name.toLowerCase(); let rows;
        if (/\.xlsx$/.test(n)) rows = await X.readXlsx(await f.arrayBuffer());
        else if (/\.(csv|txt)$/.test(n)) rows = X.readCsv(await f.text());
        else throw new Error('Format non pris en charge. Utilisez un fichier .xlsx ou .csv.');
        cb(rows.filter(r => r.some(c => cell(c) !== '')));
      } catch (e) { UI.toast(e.message || 'Fichier illisible.', 'err'); }
    };
    document.body.appendChild(i); i.click();
  }
  const dl = async (sheets, base) => { try { X.download(await X.buildXlsx(sheets), X.fname(base)); UI.toast('Fichier téléchargé.', 'ok'); } catch (e) { UI.toast('Export impossible : ' + e.message, 'err'); } };
  const findCols = (head, KEYS) => { const idx = {}; Object.keys(KEYS).forEach(k => { const i = head.findIndex(h => KEYS[k].includes(h)); if (i >= 0) idx[k] = i; }); return idx; };

  /* ================= PROFESSEURS ================= */
  const TCH_HEAD = ['Nom complet', 'Téléphone', 'Email', 'Matières enseignées', 'Contrat', 'Salaire mensuel (FCFA)', 'Date d\'embauche', 'Classes assignées'];
  const TCH_W = [26, 16, 24, 28, 14, 20, 16, 30];
  const tchRows = () => [TCH_HEAD].concat((D.teachers || []).map(t => [t.name, t.phone || '', t.email || '', t.subjects || '', t.contract || 'Permanent', +t.salary || 0, t.hired || '', (t.classes || []).map(classOf).filter(Boolean).join(', ')]));
  ACT['xl-tch'] = () => dl([{ name: 'Professeurs', rows: tchRows(), widths: TCH_W }], 'professeurs');
  ACT['xl-tch-tpl'] = () => {
    const c = D.classes.slice(0, 2).map(x => x.name).join(', ') || '6ème A, 7ème A';
    dl([{ name: 'Professeurs', rows: [TCH_HEAD, ['Moussa Konaté', '70000000', '', 'Mathématiques, Physique', 'Permanent', 120000, '2024-10-01', c], ['Aminata Diarra', '66000000', 'aminata@mail.com', 'Français', 'Vacataire', 60000, '2025-01-15', c.split(',')[0]]], widths: TCH_W },
      { name: 'Classes existantes', rows: [['Classe']].concat(D.classes.map(x => [x.name])), widths: [20] }], 'modele-professeurs');
  };
  const TK = { name: ['nomcomplet', 'nom', 'nomprenoms', 'nomprenom', 'professeur', 'enseignant', 'name'], phone: ['telephone', 'tel', 'phone', 'contact', 'numero'], email: ['email', 'mail', 'courriel'], subjects: ['matieresenseignees', 'matieres', 'matiere', 'discipline', 'disciplines'], contract: ['contrat', 'typedecontrat'], salary: ['salairemensuel', 'salairemensuelfcfa', 'salaire', 'salairefcfa'], hired: ['datedembauche', 'embauche', 'dateembauche', 'dateentree'], classes: ['classesassignees', 'classes', 'classe'] };
  function parseTch(rows) {
    if (rows.length < 2) throw new Error('Le fichier ne contient aucune ligne de professeur.');
    const head = rows[0].map(norm), idx = findCols(head, TK);
    if (idx.name == null) throw new Error('Colonne « Nom complet » introuvable. Utilisez le modèle proposé.');
    const g = (r, k) => idx[k] == null ? '' : r[idx[k]];
    const cmap = {}; D.classes.forEach(c => { cmap[norm(c.name)] = c.id; });
    const key = t => norm(t.name || t);
    const have = new Map((D.teachers || []).map(t => [key(t), t])), seen = new Set(), out = [], bad = [];
    rows.slice(1).forEach((r, i) => {
      const name = cell(g(r, 'name')); if (!name) { if (r.some(c => cell(c))) bad.push('Ligne ' + (i + 2) + ' : nom manquant'); return; }
      const k = norm(name); if (seen.has(k)) { bad.push('Ligne ' + (i + 2) + ' : ' + name + ' apparaît deux fois (ignoré)'); return; } seen.add(k);
      const cl = cell(g(r, 'classes')).split(/[,;\/|]+/).map(x => cell(x)).filter(Boolean), ids = [], unknown = [];
      cl.forEach(n => { const id = cmap[norm(n)]; if (id) { if (!ids.includes(id)) ids.push(id); } else unknown.push(n); });
      if (unknown.length) bad.push('Ligne ' + (i + 2) + ' : classe inconnue (' + unknown.join(', ') + '), non assignée');
      const ct = norm(g(r, 'contract')); const contract = /vacat/.test(ct) ? 'Vacataire' : /stag/.test(ct) ? 'Stagiaire' : 'Permanent';
      const sal = parseFloat(String(g(r, 'salary')).replace(/\s/g, '').replace(',', '.')) || 0;
      out.push({ name, phone: X.phone(g(r, 'phone')), email: cell(g(r, 'email')), subjects: cell(g(r, 'subjects')), contract, salary: Math.max(0, Math.round(sal)), hired: X.toIso(g(r, 'hired')) || today(), classes: ids, exists: have.get(k) || null, hasCls: idx.classes != null });
    });
    return { list: out, bad };
  }
  function tchModal(res) {
    const news = res.list.filter(x => !x.exists), olds = res.list.filter(x => x.exists);
    UI.modal({
      title: 'Importer des professeurs', size: 'lg',
      body: `<div class="kpis" style="margin-bottom:14px"><div class="kpi g"><small>Nouveaux professeurs</small><b>${news.length}</b></div><div class="kpi"><small>Déjà dans la liste</small><b>${olds.length}</b></div><div class="kpi ${res.bad.length ? 'o' : ''}"><small>Avertissements</small><b>${res.bad.length}</b></div></div>
      ${olds.length ? `<label style="display:flex;gap:8px;align-items:flex-start;margin-bottom:12px"><input type="checkbox" id="xl-up" checked style="margin-top:4px"><span>Mettre à jour les <b>${olds.length}</b> professeur(s) déjà existant(s) avec les données du fichier<br><small class="muted">Leur code enseignant, leurs salaires et leurs avances ne changent pas.</small></span></label>` : ''}
      ${res.bad.length ? `<details style="margin-bottom:12px"><summary class="small" style="cursor:pointer">Voir les avertissements (${res.bad.length})</summary><div class="small muted" style="max-height:140px;overflow:auto;margin-top:6px">${res.bad.slice(0, 80).map(esc).join('<br>')}</div></details>` : ''}
      <div class="tw" style="max-height:240px;overflow:auto"><table class="tbl"><thead><tr><th>Nom</th><th>Matières</th><th>Contrat</th><th class="r">Salaire</th><th>État</th></tr></thead><tbody>${res.list.slice(0, 40).map(t => `<tr><td>${esc(t.name)}</td><td>${esc(t.subjects || '—')}</td><td>${esc(t.contract)}</td><td class="r">${money(t.salary)}</td><td>${t.exists ? '<small class="muted">Existe</small>' : '<b>Nouveau</b>'}</td></tr>`).join('')}</tbody></table></div>`,
      actions: [{ label: 'Annuler' }, {
        label: 'Importer', cls: 'btn-primary', onClick: ov => {
          const up = ov.querySelector('#xl-up'), upd = up && up.checked; let n = 0, u = 0;
          res.list.forEach(x => {
            const data = { name: x.name, phone: x.phone, email: x.email, subjects: x.subjects, contract: x.contract, salary: x.salary, hired: x.hired };
            if (x.exists) { if (!upd) return; const t = x.exists; Object.keys(data).forEach(k => { if (data[k] !== '' && data[k] != null && !(k === 'salary' && !data[k])) t[k] = data[k]; }); if (x.hasCls) t.classes = x.classes; u++; }
            else { D.teachers.push(Object.assign(data, { id: uid(), classes: x.classes })); n++; }
          });
          A.fixTeachers(); A.save(); A.rerender();
          UI.toast(n + ' professeur(s) ajouté(s)' + (u ? ', ' + u + ' mis à jour' : '') + '.', 'ok');
        }
      }]
    });
  }
  ACT['xl-tch-imp'] = () => pick(rows => { try { tchModal(parseTch(rows)); } catch (e) { UI.toast(e.message, 'err'); } });

  /* ================= NOTES / BULLETINS ================= */
  const num = v => { if (v === '' || v == null) return ''; const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? NaN : n; };
  const subsOf = cid => D.subjects[cid] || [];
  const noteHead = subs => ['Matricule', 'Nom', 'Prénoms', 'Classe', 'Période'].concat(...subs.map(s => [s.name + ' (classe)', s.name + ' (compo)']));
  function notesSheet(cid, per) {
    const subs = subsOf(cid), studs = D.students.filter(s => s.classId === cid && s.status !== 'radié').sort((a, b) => A.name(a).localeCompare(A.name(b)));
    const rows = [noteHead(subs)].concat(studs.map(s => [s.matricule, s.last, s.first, classOf(cid), per].concat(...subs.map(sb => { const n = D.notes[s.id + '|' + per + '|' + sb.id] || {}; return [n.dev == null ? '' : n.dev, n.comp == null ? '' : n.comp]; }))));
    return { name: ('Notes ' + classOf(cid)).slice(0, 31), rows, widths: [12, 18, 22, 14, 14].concat(...subs.map(() => [16, 16])) };
  }
  ACT['xl-notes-tpl'] = () => {
    const cid = ST.gCls || ST.bCls || (D.classes[0] || {}).id, per = ST.gPer || ST.bPer || D.settings.periods[0];
    if (!cid) return UI.toast('Créez d\'abord une classe.', 'err');
    if (!subsOf(cid).length) return UI.toast('Cette classe n\'a pas encore de matières. Ajoutez-les dans Classes, ou importez le fichier en cochant la création des matières.', 'err');
    dl([notesSheet(cid, per)], 'notes-' + norm(classOf(cid)) + '-' + norm(per));
  };
  ACT['xl-notes-all'] = () => {
    const per = ST.gPer || ST.bPer || D.settings.periods[0];
    const sh = D.classes.filter(c => subsOf(c.id).length).map(c => notesSheet(c.id, per));
    if (!sh.length) return UI.toast('Aucune classe avec des matières.', 'err');
    dl(sh, 'notes-toutes-les-classes-' + norm(per));
  };
  const NK = { mat: ['matricule', 'mat', 'numero', 'identifiant', 'id'], last: ['nom', 'nomdefamille', 'nomeleve', 'lastname'], first: ['prenoms', 'prenom', 'firstname'], full: ['eleve', 'nomprenoms', 'nomcomplet', 'nometprenoms'], cls: ['classe', 'class', 'niveau'], per: ['periode', 'trimestre', 'semestre', 'period'] };
  function subjectCol(h) { // "Maths (compo)" -> {name:'Maths', k:'comp'} ; "Maths" -> dev
    let m = /^(.*?)\s*[\(\[\-–:]?\s*(compositions?|compo|examen|exam)\s*[\)\]]?\s*$/i.exec(h); if (m && m[1].trim()) return { name: m[1].replace(/[\(\[\-–:\s]+$/, '').trim(), k: 'comp' };
    m = /^(.*?)\s*[\(\[\-–:]?\s*(note de classe|notes de classe|classe|devoirs?|dev|controle|cc)\s*[\)\]]?\s*$/i.exec(h); if (m && m[1].trim()) return { name: m[1].replace(/[\(\[\-–:\s]+$/, '').trim(), k: 'dev' };
    return { name: h.trim(), k: 'dev' };
  }
  function parseNotes(rows) {
    if (rows.length < 2) throw new Error('Le fichier ne contient aucune ligne de notes.');
    const rawHead = rows[0].map(cell), head = rawHead.map(norm), idx = findCols(head, NK);
    if (idx.mat == null && idx.last == null && idx.full == null) throw new Error('Colonnes « Matricule » ou « Nom » introuvables. Exportez d\'abord le modèle de notes, puis remplissez-le.');
    const used = new Set(Object.values(idx)), cols = [];
    rawHead.forEach((h, i) => { if (!h || used.has(i)) return; const c = subjectCol(h); if (c.name) cols.push({ i, name: c.name, key: norm(c.name), k: c.k }); });
    if (!cols.length) throw new Error('Aucune colonne de matière trouvée (ex. « Mathématiques (classe) », « Mathématiques (compo) »).');
    const byMat = {}, byName = {}; D.students.forEach(s => { byMat[norm(s.matricule)] = s; (byName[norm(s.last) + '|' + norm(s.first)] = byName[norm(s.last) + '|' + norm(s.first)] || []).push(s); byName[norm(s.last + s.first)] = byName[norm(s.last) + '|' + norm(s.first)]; });
    const cmap = {}; D.classes.forEach(c => { cmap[norm(c.name)] = c; });
    const pmap = {}; D.settings.periods.forEach(p => { pmap[norm(p)] = p; });
    const g = (r, k) => idx[k] == null ? '' : cell(r[idx[k]]);
    const items = [], bad = []; let noPer = 0;
    rows.slice(1).forEach((r, ri) => {
      if (!r.some(c => cell(c))) return; const L = 'Ligne ' + (ri + 2);
      let st = null; const mat = g(r, 'mat');
      if (mat && byMat[norm(mat)]) st = byMat[norm(mat)];
      else {
        let last = g(r, 'last'), first = g(r, 'first');
        if (!last && g(r, 'full')) { const p = g(r, 'full').split(/\s+/); last = p[0]; first = p.slice(1).join(' '); }
        const list = byName[norm(last) + '|' + norm(first)] || byName[norm(last + first)] || [];
        const cn = g(r, 'cls'), f = cn ? list.filter(s => norm(classOf(s.classId)) === norm(cn)) : list;
        if (f.length === 1) st = f[0]; else if (f.length > 1) { bad.push(L + ' : plusieurs élèves « ' + last + ' ' + first + ' », précisez le matricule'); return; }
      }
      if (!st) { bad.push(L + ' : élève introuvable (' + (mat || (g(r, 'last') + ' ' + g(r, 'first')).trim() || '?') + ')'); return; }
      let per = ''; const pv = g(r, 'per'); if (pv) { per = pmap[norm(pv)] || ''; if (!per) { bad.push(L + ' : période « ' + pv + ' » inconnue (' + D.settings.periods.join(', ') + ')'); return; } } else noPer++;
      const vals = [];
      cols.forEach(c => { const raw = r[c.i]; if (cell(raw) === '') return; const n = num(raw); if (isNaN(n) || n < 0 || n > 20) { bad.push(L + ' : note invalide « ' + cell(raw) + ' » (' + c.name + ')'); return; } vals.push({ col: c, v: Math.round(n * 100) / 100 }); });
      if (vals.length) items.push({ st, per, vals });
    });
    return { items, bad, cols, hasPer: idx.per != null, noPer };
  }
  function notesModal(res) {
    const missing = {}; // matière absente d'une classe
    res.items.forEach(it => res.cols.forEach(c => { if (!subsOf(it.st.classId).some(s => norm(s.name) === c.key) && it.vals.some(v => v.col === c)) (missing[it.st.classId] = missing[it.st.classId] || new Set()).add(c.name); }));
    const mk = Object.keys(missing), nMiss = mk.reduce((a, k) => a + missing[k].size, 0);
    const defPer = ST.gPer || ST.bPer || D.settings.periods[0];
    const nv = res.items.reduce((a, it) => a + it.vals.length, 0), nst = new Set(res.items.map(it => it.st.id)).size;
    UI.modal({
      title: 'Importer des notes et bulletins', size: 'lg',
      body: `<div class="kpis" style="margin-bottom:14px"><div class="kpi g"><small>Élèves concernés</small><b>${nst}</b></div><div class="kpi"><small>Notes à enregistrer</small><b>${nv}</b></div><div class="kpi ${res.bad.length ? 'o' : ''}"><small>Lignes ignorées</small><b>${res.bad.length}</b></div></div>
      ${res.hasPer && !res.noPer ? '' : `<div class="fld" style="margin-bottom:12px"><label>Période pour les lignes sans « Période »</label><select id="xl-per">${D.settings.periods.map(p => `<option ${p === defPer ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></div>`}
      ${nMiss ? `<label style="display:flex;gap:8px;align-items:flex-start;margin-bottom:12px"><input type="checkbox" id="xl-mksub" checked style="margin-top:4px"><span>Créer les matières absentes (coefficient 1) : <b>${mk.map(k => esc(classOf(k)) + ' : ' + [...missing[k]].map(esc).join(', ')).join(' · ')}</b><br><small class="muted">Sans cette option, ces notes sont ignorées. Vous pourrez changer les coefficients dans Classes.</small></span></label>` : ''}
      <p class="small muted" style="margin-bottom:12px">Les notes importées remplacent celles déjà saisies pour le même élève, la même matière et la même période. Les cases vides du fichier ne changent rien. Les bulletins se mettent à jour automatiquement.</p>
      ${res.bad.length ? `<details style="margin-bottom:12px"><summary class="small" style="cursor:pointer">Voir les lignes ignorées (${res.bad.length})</summary><div class="small muted" style="max-height:140px;overflow:auto;margin-top:6px">${res.bad.slice(0, 100).map(esc).join('<br>')}</div></details>` : ''}
      <div class="tw" style="max-height:240px;overflow:auto"><table class="tbl"><thead><tr><th>Élève</th><th>Classe</th><th>Notes lues</th></tr></thead><tbody>${res.items.slice(0, 30).map(it => `<tr><td>${esc(A.name(it.st))}</td><td>${esc(classOf(it.st.classId))}</td><td class="small">${it.vals.slice(0, 6).map(v => esc(v.col.name) + (v.col.k === 'comp' ? ' (compo)' : '') + ' : ' + v.v).join(' · ')}${it.vals.length > 6 ? ' …' : ''}</td></tr>`).join('')}</tbody></table></div>`,
      actions: [{ label: 'Annuler' }, {
        label: 'Importer ' + nv + ' note(s)', cls: 'btn-primary', onClick: ov => {
          const sel = ov.querySelector('#xl-per'), fallback = sel ? sel.value : defPer, mkS = ov.querySelector('#xl-mksub'), create = mkS && mkS.checked; let n = 0, made = 0, skip = 0;
          res.items.forEach(it => {
            const per = it.per || fallback;
            it.vals.forEach(v => {
              let sb = subsOf(it.st.classId).find(s => norm(s.name) === v.col.key);
              if (!sb) { if (!create) { skip++; return; } sb = { id: uid(), name: v.col.name, coef: 1 }; (D.subjects[it.st.classId] = D.subjects[it.st.classId] || []).push(sb); made++; }
              const key = it.st.id + '|' + per + '|' + sb.id; const cur = D.notes[key] = D.notes[key] || { dev: '', comp: '' }; cur[v.col.k] = v.v; n++;
            });
          });
          A.save(); A.rerender();
          UI.toast(n + ' note(s) importée(s)' + (made ? ', ' + made + ' matière(s) créée(s)' : '') + (skip ? ', ' + skip + ' ignorée(s) (matière absente)' : '') + '.', 'ok');
        }
      }]
    });
  }
  ACT['xl-notes-imp'] = () => pick(rows => { try { notesModal(parseNotes(rows)); } catch (e) { UI.toast(e.message, 'err'); } });
  A._xl.parseNotes = parseNotes; A._xl.parseTch = parseTch;

  /* ================= boutons ================= */
  const inject = html => { const ac = document.querySelector('.ph .ac'); if (ac) ac.insertAdjacentHTML('afterbegin', html); };
  const b = (act, label, icon) => A.btn(act, label, { icon });
  const wrap = (name, fn) => { const old = V[name]; if (!old) return; V[name] = function () { const r = old.apply(this, arguments); try { fn(); } catch (e) { } return r; }; };
  wrap('teachers', () => inject(b('xl-tch-imp', 'Importer Excel', 'up') + b('xl-tch', 'Exporter Excel', 'dl') + b('xl-tch-tpl', 'Modèle', 'dl')));
  const notesBtns = () => inject(b('xl-notes-imp', 'Importer les notes (Excel)', 'up') + b('xl-notes-tpl', 'Modèle / export de cette classe', 'dl') + b('xl-notes-all', 'Export toutes les classes', 'dl'));
  wrap('grades', notesBtns); wrap('bulletins', notesBtns);
})();
