/* School-G : import des élèves depuis Excel / CSV, sans modèle imposé.
   Seuls le nom et le prénom (ou une seule colonne « Nom et prénoms ») sont nécessaires.
   Les colonnes sont reconnues par leur titre (peu importe l'ordre ou l'orthographe), la classe peut venir d'une colonne,
   d'un titre au-dessus du tableau ou du nom de la feuille ; tout le reste est facultatif ou rempli automatiquement. */
(function () {
  'use strict';
  const A = window.APP; if (!A || !A._xl) return;
  const { D, U, ST } = A; const { esc, uid, today } = U; const X = A._xl;

  /* ---------- utilitaires de texte ---------- */
  const words = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const nz = s => words(s).replace(/ /g, '');
  const str = v => v == null ? '' : String(v).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  const letters = s => /[a-zA-ZÀ-ɏ]/.test(s);
  const colName = i => { let s = '', n = i + 1; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };

  /* ---------- reconnaissance des colonnes par leur titre ---------- */
  const FIELDS = [
    ['last', 'Nom'], ['first', 'Prénoms'], ['full', 'Nom et prénoms (une seule colonne)'], ['fullrev', 'Prénoms puis nom (une seule colonne)'],
    ['cls', 'Classe'], ['sex', 'Sexe'], ['birth', 'Date de naissance'], ['birthplace', 'Lieu de naissance'], ['birthcombo', 'Date et lieu de naissance (une colonne)'],
    ['parent', 'Parent / tuteur'], ['parentPhone', 'Téléphone du parent'], ['parentEmail', 'Email du parent'], ['address', 'Adresse'], ['mat', 'Matricule']
  ];
  const FLABEL = {}; FIELDS.forEach(([k, l]) => { FLABEL[k] = l; });
  function fieldOf(h) {
    if (typeof h === 'number' || h == null) return null;
    const raw = str(h); if (!raw || raw.length > 45) return null;
    const w = words(raw); if (!w) return null; const t = re => re.test(w);
    if (t(/\b(e mail|email|mail|courriel)\b/)) return 'parentEmail';
    if (t(/\b(tel|telephone|phone|portable|mobile|whatsapp|gsm|cel|contact|contacts)\b/)) return 'parentPhone';
    if (t(/\b(adresse|domicile|residence|quartier|habitation)\b/)) return 'address';
    if (t(/\b(profession|metier|emploi|fonction|inscription|inscrit|admission|versement|paiement|montant|scolarite|frais|reste|solde|redoublant|redoublement|statut|regime|nationalite|observation|observations|remarque|remarques|moyenne|note|notes|rang|mention|liste|registre|total|effectif|ecole|etablissement|ancien|anciens|ancienne|precedent|precedente|origine|provenance|derniere|signature)\b/)) return null;
    if (t(/\bdate\b/) && t(/\blieu\b/)) return 'birthcombo';
    if (t(/\blieu\b|\b(ne|nee|ne e) (a|au)\b|\b(ville|commune|village) (de )?naissance\b|\bnaissance (lieu|ville)\b/)) return 'birthplace';
    if (t(/naiss|\bddn\b|\bdn\b|\bdate n\b|\bne( e)? le\b/)) return 'birth';
    if (t(/\b(parent|parents|tuteur|tutrice|pere|mere|responsable|papa|maman)\b/)) return 'parent';
    if (t(/\b(matricule|matricules|matr|mat|identifiant|id|code eleve|numero eleve|n matricule|num matricule)\b/)) return 'mat';
    if (t(/\b(complet|complets|full name|fullname|identite)\b/) && t(/\b(nom|noms|name|eleve|identite)\b/)) return 'full';
    const hasNom = t(/\bnoms?\b/), hasPre = t(/\bprenom/);
    if (hasNom && hasPre) return w.search(/\bprenom/) < w.search(/\bnoms?\b/) ? 'fullrev' : 'full';
    if (t(/\b(first name|firstname|given name|given names|forename)\b/) || hasPre) return 'first';
    if (t(/\b(last name|lastname|surname|family name|patronyme)\b/) || hasNom) return 'last';
    if (t(/\b(eleve|eleves|apprenant|apprenants|etudiant|etudiants|candidat|student|students|pupil|identite|nom complet|name|names)\b/)) return 'full';
    if (t(/\b(sexe|sex|genre|gender)\b/) || /^(s|m f|f m|g f|f g)$/.test(w)) return 'sex';
    if (t(/\b(classe|classes|class|niveau|cl)\b/)) return 'cls';
    if (/^(n|no|num|numero|n d ordre|ordre|nr)$/.test(w)) return 'num';
    return null;
  }

  /* ---------- classes : comparaison souple (6ème A = 6e A = 6 A) ---------- */
  const canon = s => {
    let n = String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    n = n.replace(/\b(classe|class|annee|niveau)\b/g, ' ').replace(/\b(terminale|tle)\b/g, 'terminale').replace(/\bseconde\b/g, '2').replace(/\bpremiere\b/g, '1').replace(/\b(1ere|1re)\b/g, '1');
    n = n.replace(/(\d)\s*(eme|ieme|ere|er|nde|nd|e|re)\b/g, '$1');
    return n.replace(/[^a-z0-9]/g, '');
  };
  const CLASS_RE = /^(?:(?:cp|ce|cm|ci|sil)\s*\d?(?:\s*[a-z0-9]{1,2})?|tle|terminale(?:\s*[a-z0-9]{1,3})?|seconde(?:\s*[a-z0-9]{1,2})?|premi[eè]re(?:\s*[a-z0-9]{1,2})?|(?:petite|moyenne|grande)(?:\s+section)?|(?:jardin|maternelle|section)(?:\s*\w{1,8})?|\d{1,2}\s*(?:e|è|ème|eme|ère|ere|er|re|nde|nd)(?:\s*ann[ée]e)?(?:\s*[a-z]?\d?)?|(?:tle|2nde|1[eè]re)\s*[a-z0-9]{1,3})$/i;
  const isClassLike = v => { v = str(v).replace(/^classe\s*[:\-]?\s*/i, ''); return v.length > 0 && v.length <= 24 && CLASS_RE.test(v); };
  const guessCycle = n => {
    const w = words(n);
    if (/jardin|maternelle|creche|petite|moyenne|grande|\bsection\b/.test(w)) return 'Jardin';
    if (/lycee|terminale|\btle\b|seconde|\b2nde\b|premiere|\b1ere\b/.test(w)) return 'Lycée';
    if (/college/.test(w)) return 'Collège';
    if (/\b(cp|ce|cm|ci|sil)\d?\b/.test(w)) return 'Primaire';
    const k = /\b(\d{1,2})\s*(e|eme|ere|er|re|nde)?\b/.exec(w); if (k) { const x = +k[1]; if (/annee/.test(w)) return x >= 10 ? 'Lycée' : x >= 7 ? 'Collège' : 'Primaire'; if (x >= 10) return 'Lycée'; if (x >= 7) return 'Collège'; if (x >= 3 && /\b\d{1,2}\s*(e|eme)\s*[a-z]?\d?$/.test(w)) return 'Collège'; }
    return 'Primaire';
  };
  const GENERIC_SHEET = /^(feuil|sheet|tableau|eleve|liste|classe|donnee|data|export|page|tab|import|base|general|ensemble|effectif|inscrit|inscription|resultat|requete|query)/;

  /* ---------- nom complet en une colonne : séparer le nom de famille et les prénoms ---------- */
  const isUp = t => letters(t) && t === t.toUpperCase() && t !== t.toLowerCase();
  function splitName(s, rev) {
    s = str(s); if (!s) return { last: '', first: '' };
    const cm = s.indexOf(','); if (cm > 0) return { last: str(s.slice(0, cm)), first: str(s.slice(cm + 1)) };
    const tk = s.split(' '); if (tk.length === 1) return { last: tk[0], first: '' };
    const up = tk.map(isUp), take = (a, b) => tk.slice(a, b).join(' ');
    if (up.every(Boolean) || !up.some(Boolean) || (!up[0] && !up[tk.length - 1])) return rev ? { last: tk[tk.length - 1], first: take(0, -1) } : { last: tk[0], first: take(1) };
    if (up[0]) { let i = 0; while (i < tk.length && up[i]) i++; return { last: take(0, i), first: take(i) }; }
    let i = tk.length; while (i > 0 && up[i - 1]) i--; return { last: take(i), first: take(0, i) };
  }
  const titleCase = s => s.toLowerCase().replace(/(^|[\s'’\-])([a-zà-ɏ])/g, (m, a, b) => a + b.toUpperCase());
  const tidyFirst = s => (s && isUp(s.replace(/[^A-Za-zÀ-ɏ]/g, '') || 'a') && s === s.toUpperCase()) ? titleCase(s) : s;

  /* ---------- sexe ---------- */
  const sexOf = v => { const n = nz(v); if (!n) return ''; if (/^(f|fille|filles|feminin|feminine|femme|female|fem)$/.test(n)) return 'F'; if (/^(m|g|h|garcon|garcons|masculin|homme|male|masc)$/.test(n)) return 'M'; return ''; };
  const FEM = new Set(('aminata aminatou minata minatou fatoumata fatouma fatou fatim fatima fatimata awa awaou mariam mariama mariame maryam mariem kadidia kadidiatou kadiatou kadia kadi kady khady khadija khadidja kadija kadijatou rokia rokiatou roukia rokiya fanta assetou assitan assita salimata salimatou oumou oumoul hawa haoua aicha aisha aissata aissatou nana djeneba djenebou jeneba bintou bintu binta bineta safiatou safiata safiya safia koumba coumba kouma maimouna mouna sitan nene dado alima alimatou habibatou habiba ramata ramatoulaye ramatou sanata sira siran tenin korotoumou lalla lala nafi nafissatou nafissa nafisa fadima zeinab zainab zeynab sophie marie mariette marielle marthe christelle christine estelle angele angelique brigitte grace esther ruth sarah sara rachel rebecca lea judith julie laure laurence nadia nathalie noura nour ndeye ami amy adja adjara aja kankou kani maty dienaba dieneba diaba astou rama kine penda rokhaya seynabou sokhna yacine yasmine yasmina ines lina lila laila leila maya anissa amina aminah amal amel asma asmaa asmaou oulimata oumy oumi fily hadja hadjara hadiza hadizatou haby hadidja ouleymatou oulimatou ramla rahma rahmatou marietou nantenin sali tata tina').split(' '));
  const guessSex = first => { const tk = words(first).split(' ').filter(Boolean); if (tk.some(x => FEM.has(x))) return 'F'; const f = tk[0] || ''; return /(atou|ata|ette|elle|iya|ine)$/.test(f) && f.length > 4 ? 'F' : 'M'; };

  /* ---------- dates de naissance : formats français, anglais, numéros de série Excel ---------- */
  const MONTHS = { janvier: 1, janv: 1, jan: 1, fevrier: 2, fevr: 2, fev: 2, mars: 3, mar: 3, avril: 4, avr: 4, mai: 5, juin: 6, juillet: 7, juil: 7, aout: 8, septembre: 9, sept: 9, sep: 9, octobre: 10, oct: 10, novembre: 11, nov: 11, decembre: 12, dec: 12 };
  function parseDate(v) {
    if (v === '' || v == null) return { iso: '', bad: false };
    const nowY = new Date().getFullYear();
    const ok = (y, m, d) => { y = +y; m = +m; d = +d; if (y < 100) y += y > (nowY % 100) + 1 ? 1900 : 2000; if (y < 1950 || y > nowY || m < 1 || m > 12 || d < 1 || d > 31) return null; const dt = new Date(Date.UTC(y, m - 1, d)); if (dt.getUTCMonth() !== m - 1) return null; return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'); };
    const res = r => ({ iso: r || '', bad: !r });
    if (v instanceof Date) { const d = new Date(v.getTime() + 12 * 36e5); return res(ok(d.getFullYear(), d.getMonth() + 1, d.getDate())); }
    if (typeof v === 'number') { if (v > 12000 && v < 80000) { const [y, m, d] = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5).toISOString().slice(0, 10).split('-'); return res(ok(y, m, d)); } v = String(v); }
    const s = str(v); let m;
    if ((m = /^(\d{4})\s*[-\/.]\s*(\d{1,2})\s*[-\/.]\s*(\d{1,2})/.exec(s))) return res(ok(m[1], m[2], m[3]));
    if ((m = /^(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{2,4})\b/.exec(s))) { let d = +m[1], mo = +m[2]; if (mo > 12 && d <= 12) { const x = d; d = mo; mo = x; } return res(ok(m[3], mo, d)); }
    if ((m = /^(\d{1,2})(?:er)?[\s\-\/.]+([^\d\s\-\/.]+?)\.?[\s\-\/.]+(\d{2,4})\b/i.exec(s))) { const mo = MONTHS[nz(m[2])]; if (mo) return res(ok(m[3], mo, m[1])); }
    if (/^\d{8}$/.test(s)) return res(+s.slice(0, 4) >= 1950 && +s.slice(4, 6) <= 12 ? ok(s.slice(0, 4), s.slice(4, 6), s.slice(6)) : ok(s.slice(4), s.slice(2, 4), s.slice(0, 2)));
    return { iso: '', bad: true };
  }
  const phoneOf = v => { let s = typeof v === 'number' ? String(v) : str(v); return s.replace(/\.0$/, ''); };

  function splitBirth(t) {
    t = str(t); if (!t) return { date: '', place: '' };
    const re = /\d{4}\s*[-\/.]\s*\d{1,2}\s*[-\/.]\s*\d{1,2}|\d{1,2}\s*[\/.\-]\s*\d{1,2}\s*[\/.\-]\s*\d{2,4}|\d{1,2}(?:er)?[\s\-\/.]+[A-Za-zéûè]+\.?[\s\-\/.]+\d{4}/;
    const m = re.exec(t); if (!m) return { date: '', place: '' };
    const place = (t.slice(0, m.index) + ' ' + t.slice(m.index + m[0].length)).replace(/(^|\s)(?:n[ée]e?|le|à|a|au|en|de)(?=\s|$)/gi, ' ').replace(/[,;\-\/]+/g, ' ').replace(/\s+/g, ' ').trim();
    return { date: m[0], place };
  }
  /* ---------- analyse d'une feuille : ligne de titres, colonnes, classe ---------- */
  function guessNoHeader(rows) {
    const data = rows.filter(r => r.some(c => str(c) !== '')).slice(0, 60), map = {};
    if (!data.length) return { start: 0, map };
    const n = Math.max(...data.map(r => r.length)), info = [];
    for (let c = 0; c < n; c++) {
      const vals = data.map(r => str(r[c])).filter(Boolean); if (!vals.length) { info.push(null); continue; }
      const k = vals.length, ratio = f => vals.filter(f).length / k;
      info.push({ c, alpha: ratio(v => letters(v)), num: ratio(v => /^\d+$/.test(v) && +v < 5000), date: ratio(v => /[\/.\-]|\d{8}/.test(v) && !parseDate(v).bad), phone: ratio(v => /^\+?[\d\s.()-]{7,}$/.test(v)), sex: ratio(v => !!sexOf(v)), cls: ratio(isClassLike), email: ratio(v => /@/.test(v)), mat: ratio(v => /^[A-Za-z]{1,6}[-_ ]?\d{2,}$/.test(v)), words: vals.reduce((a, v) => a + v.split(' ').length, 0) / k });
    }
    const used = new Set(), set = (k, c) => { if (map[k] == null) { map[k] = c; used.add(c); } };
    info.forEach(i => { if (!i) return; if (i.email >= .6) set('parentEmail', i.c); else if (i.mat >= .8) set('mat', i.c); else if (i.sex >= .8) set('sex', i.c); else if (i.date >= .6 && i.alpha < .5) set('birth', i.c); else if (i.phone >= .6 && i.alpha < .3) set('parentPhone', i.c); else if (i.cls >= .6 && i.alpha >= .5) set('cls', i.c); else if (i.num >= .8) used.add(i.c); });
    const cand = info.filter(i => i && !used.has(i.c) && i.alpha >= .8);
    if (cand.length >= 2 && cand[0].words <= 2.2 && cand[1].words <= 2.2) { map.last = cand[0].c; map.first = cand[1].c; } else if (cand.length) map.full = cand[0].c;
    return { start: rows.findIndex(r => r.some(c => str(c) !== '')), map };
  }
  const cleanCls = x => str(x).replace(/\b(ann[ée]e\s+scolaire|ann[ée]e|a\.s\.?)\b.*$/i, '').replace(/\b(19|20)\d\d\s*[-\/–]\s*(19|20)?\d\d\b.*$/, '').split(/\s[-–—|]\s|[|,;(]/)[0].replace(/[\s:.\-–—]+$/, '').trim();
  const okCls = x => !!x && x.length <= 30 && (letters(x) || !!findClass(x));
  function sectionClass(text) {
    const v = str(text); let m;
    if ((m = /^classe?\s*[:：\-–—]\s*(.{1,30})$/i.exec(v))) { const c = cleanCls(m[1]); return okCls(c) ? c : ''; }
    if ((m = /\bclasse\s+(?:de\s+|d['’]\s*)?(.{1,25})$/i.exec(v)) && v.length <= 70) { const c = cleanCls(m[1]); return okCls(c) ? c : ''; }
    if (v.length <= 24 && (isClassLike(v) || findClass(v))) return v.replace(/^classe\s*[:\-]?\s*/i, '');
    return '';
  }
  function titleClassOf(rows, hr) {
    for (let i = 0; i < Math.max(0, hr); i++) {
      const r = rows[i] || [];
      for (let c = 0; c < r.length; c++) {
        const v = str(r[c]); if (!v) continue;
        const m = /\bclasse?\s*[:：\-–—]\s*(.{1,30})$/i.exec(v) || /\bclasse\s+(?:de\s+|d['’]\s*)?(.{1,25})$/i.exec(v);
        if (m) { const x = cleanCls(m[1]); if (okCls(x)) return x; }
        if (/^classe?\s*[:：]?$/i.test(v)) { for (let d = c + 1; d < r.length; d++) { const nx = str(r[d]); if (nx) return okCls(cleanCls(nx)) ? cleanCls(nx) : ''; } }
      }
    }
    return '';
  }
  function analyze(name, rows, forcedHr) {
    const nonEmpty = i => rows[i] && rows[i].some(c => str(c) !== '');
    let hr = -1;
    if (forcedHr != null) hr = forcedHr;
    else {
      let bestScore = 0;
      for (let i = 0; i < Math.min(rows.length, 40); i++) {
        if (!nonEmpty(i)) continue; const f = new Set(); rows[i].forEach(c => { const k = fieldOf(c); if (k && k !== 'num') f.add(k); });
        if (!(f.has('last') || f.has('full') || f.has('fullrev'))) continue;
        const sc = f.size + ((f.has('last') && f.has('first')) || f.has('full') || f.has('fullrev') ? 2 : 0);
        if (sc > bestScore) { bestScore = sc; hr = i; }
      }
    }
    let map = {}, start;
    if (hr >= 0) { rows[hr].forEach((c, ci) => { const k = fieldOf(c); if (k && k !== 'num' && map[k] == null) map[k] = ci; }); start = hr + 1; }
    else { const g = guessNoHeader(rows); map = g.map; start = Math.max(0, g.start); }
    let autoClass = titleClassOf(rows, hr >= 0 ? hr : start);
    if (!autoClass) { const w = words(name); if (w && !GENERIC_SHEET.test(w) && (findClass(name) || isClassLike(name))) autoClass = str(name); }
    return { name, rows, hr, start, map, autoClass, use: true };
  }

  /* ---------- classes existantes ---------- */
  function findClass(name) {
    const e = nz(name); if (!e) return null;
    const exact = D.classes.find(c => nz(c.name) === e); if (exact) return exact;
    const cn = canon(name); if (!cn) return null;
    const m = D.classes.filter(c => canon(c.name) === cn); return m.length === 1 ? m[0] : null;
  }

  /* ---------- lecture des lignes d'une feuille ---------- */
  const JUNK = /^(total|sous total|effectif|garcons?|filles?|nombre|signature|visa|fait a|le directeur|la directrice|le chef|arrete|certifie|nb)\b/;
  function parseSheet(sh, ctx) {
    const rows = sh.rows, m = sh.map, out = [], bad = []; let badDates = 0;
    const cell = (r, k) => m[k] == null ? '' : r[m[k]];
    let mode = (m.last != null && m.first != null) ? 'sep' : m.full != null ? 'full' : m.fullrev != null ? 'fullrev' : m.last != null ? 'lastonly' : 'none';
    if (mode === 'lastonly') {
      const sample = rows.slice(sh.start, sh.start + 60).map(r => str(r[m.last])).filter(Boolean);
      mode = sample.length && sample.filter(v => v.includes(' ')).length / sample.length >= .4 ? 'full' : 'none';
    }
    if (mode === 'none') return { list: [], bad: [], badDates: 0, noName: true };
    const nameCol = mode === 'full' ? (m.full != null ? m.full : m.last) : mode === 'fullrev' ? m.fullrev : null;
    let sect = '', lastCls = '';
    for (let i = sh.start; i < rows.length; i++) {
      const r = rows[i] || [], cells = r.map(str), filled = cells.filter(Boolean); if (!filled.length) continue;
      if (filled.length === 1) { const sc = sectionClass(filled[0]); if (sc) { sect = sc; continue; } }
      if (sh.hr >= 0 && cells.filter(c => { const k = fieldOf(c); return k && k !== 'num'; }).length >= 2) continue; // titre répété (saut de page)
      let last, first;
      if (nameCol != null) { const nm = splitName(cells[nameCol], mode === 'fullrev'); last = nm.last; first = nm.first; }
      else { last = cells[m.last] || ''; first = cells[m.first] || ''; }
      const probe = words(last + ' ' + first); if (!probe) continue;
      if (JUNK.test(probe)) continue;
      const rowNo = i + 1, where = (ctx.multi ? sh.name + ', ' : '') + 'ligne ' + rowNo;
      if (!letters(last) && !letters(first)) { if (filled.length > 1) bad.push(where + ' : nom introuvable'); continue; }
      if (!last || !first) { bad.push(where + ' : ' + (last || first) + ' (' + (last ? 'prénoms' : 'nom') + ' manquant)'); continue; }
      first = tidyFirst(first);
      let cn = cells[m.cls] || ''; if (cn) lastCls = cn; else cn = sect || (m.cls != null ? lastCls : '') || sh.autoClass || '';
      let bplace = cells[m.birthplace] || '', pd;
      if (m.birth == null && m.birthcombo != null) { const bc = splitBirth(cells[m.birthcombo]); pd = parseDate(bc.date); bplace = bplace || bc.place; if (!bc.date && cells[m.birthcombo]) pd = { iso: '', bad: true }; }
      else pd = parseDate(m.birth == null ? '' : r[m.birth]);
      if (pd.bad) badDates++;
      const finalCls = cn || ctx.defName || '', key = nz(last) + '|' + nz(first) + '|' + (pd.iso || canon(finalCls));
      if (ctx.have.has(key) || ctx.seen.has(key)) { bad.push(where + ' : ' + last + ' ' + first + ' existe déjà (ignoré)'); continue; } ctx.seen.add(key);
      out.push({ last, first, sex: sexOf(cell(r, 'sex')), birth: pd.iso, birthplace: bplace, clsName: cn, parent: cells[m.parent] || '', parentPhone: phoneOf(cell(r, 'parentPhone')), parentEmail: /@/.test(cells[m.parentEmail] || '') ? cells[m.parentEmail] : '', address: cells[m.address] || '', mat: cells[m.mat] || '', rowNo, sheet: sh.name });
    }
    return { list: out, bad, badDates };
  }

  /* ---------- lecture du fichier (xlsx, xls, ods, csv) ---------- */
  const loadSheetJS = () => window.XLSX ? Promise.resolve(window.XLSX) : new Promise((ok, ko) => {
    const urls = ['https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'];
    const next = () => { const u = urls.shift(); if (!u) return ko(new Error('Ce format demande une connexion internet. Ouvrez le fichier dans Excel et enregistrez-le en .xlsx, puis réessayez.')); const s = document.createElement('script'); s.src = u; s.onload = () => window.XLSX ? ok(window.XLSX) : next(); s.onerror = () => { s.remove(); next(); }; document.head.appendChild(s); };
    next();
  });
  async function readBook(file) {
    const name = file.name.toLowerCase();
    if (/\.xlsx$/.test(name) || /\.xlsm$/.test(name)) { try { return await X.readXlsxAll(await file.arrayBuffer()); } catch (e) { if (!/\.xlsm$/.test(name)) throw e; } }
    if (/\.(csv|txt|tsv)$/.test(name)) {
      const buf = await file.arrayBuffer(); let t = new TextDecoder('utf-8').decode(buf); if (t.includes('�')) t = new TextDecoder('windows-1252').decode(buf);
      return [{ name: file.name.replace(/\.[^.]+$/, ''), rows: X.readCsv(t) }];
    }
    if (/\.(xls|ods|xlsb|xlsm)$/.test(name)) {
      const Xl = await loadSheetJS(), wb = Xl.read(await file.arrayBuffer(), { type: 'array' });
      return wb.SheetNames.map(n => {
        const ws = wb.Sheets[n], rg = Xl.utils.decode_range(ws['!ref'] || 'A1');
        let rows = Xl.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: true });
        if (rg.s.r || rg.s.c) rows = Array.from({ length: rg.s.r }, () => []).concat(rows.map(r => Array(rg.s.c).fill('').concat(r)));
        return { name: n, rows };
      });
    }
    throw new Error('Format non pris en charge. Utilisez un fichier Excel (.xlsx, .xls), OpenDocument (.ods) ou .csv.');
  }

  /* ---------- fenêtre d'import ---------- */
  function openWizard(book) {
    const multi = book.length > 1;
    const sheets = book.filter(b => b.rows.some(r => r.some(c => str(c) !== ''))).map(b => analyze(b.name, b.rows));
    if (!sheets.length) throw new Error('Le fichier est vide.');
    sheets.forEach(sh => { const m = sh.map; sh.use = (m.last != null || m.full != null || m.fullrev != null) && sh.rows.length - sh.start > 0; });
    if (!sheets.some(s => s.use)) sheets[0].use = true;
    const st = { sheets, cur: Math.max(0, sheets.findIndex(s => s.use)), defCls: (D.classes[0] || {}).id || '__new', newCls: D.classes.length ? '' : 'Classe 1', sexMode: 'guess', keepMat: null, create: true, mapOpen: false, multi, res: null };
    const defName = () => st.defCls === '__new' ? (str(st.newCls) || 'Classe 1') : ((D.classes.find(c => c.id === st.defCls) || {}).name || '');
    const compute = () => {
      const have = new Set(D.students.map(s => nz(s.last) + '|' + nz(s.first) + '|' + (s.birth || canon((A.cls(s.classId) || {}).name || ''))));
      const ctx = { have, seen: new Set(), defName: defName(), multi }, list = [], bad = []; let badDates = 0; const per = [];
      sheets.forEach(sh => { if (!sh.use) { per.push(null); return; } const r = parseSheet(sh, ctx); per.push(r); list.push(...r.list); bad.push(...r.bad); badDates += r.badDates || 0; });
      const needCls = list.filter(e => !e.clsName).length, noSex = list.filter(e => !e.sex).length, hasMat = list.filter(e => e.mat).length;
      if (st.keepMat == null) { const ms = list.map(e => nz(e.mat)).filter(Boolean); st.keepMat = ms.length >= list.length * .9 && ms.length > 0 && new Set(ms).size === ms.length; }
      const names = [], seenC = new Set(); list.forEach(e => { const nm = e.clsName || defName(); if (!findClass(nm) && !seenC.has(canon(nm))) { seenC.add(canon(nm)); names.push(nm); } });
      st.res = { list, bad, badDates, per, needCls, noSex, hasMat, names };
    };
    const sexFinal = e => e.sex || (st.sexMode === 'guess' ? guessSex(e.first) : st.sexMode);
    const optHtml = (cur) => `<option value="">— Ignorer —</option>` + FIELDS.map(([k, l]) => `<option value="${k}" ${cur === k ? 'selected' : ''}>${esc(l)}</option>`).join('');
    const mapHtml = sh => {
      const nc = Math.max(0, ...sh.rows.slice(0, 60).map(r => r.length)), rev = {}; Object.keys(sh.map).forEach(k => { rev[sh.map[k]] = k; });
      let h = '';
      for (let c = 0; c < nc; c++) {
        const head = sh.hr >= 0 ? str((sh.rows[sh.hr] || [])[c]) : '', sample = (sh.rows.slice(sh.start, sh.start + 40).map(r => str(r[c])).find(Boolean)) || '';
        if (!head && !sample) continue;
        h += `<tr><td style="white-space:nowrap"><b>${esc(head || 'Colonne ' + colName(c))}</b></td><td class="small muted" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(sample)}</td><td><select data-xmap="${c}" style="min-width:210px">${optHtml(rev[c] || '')}</select></td></tr>`;
      }
      return `<table class="tbl" style="margin-top:8px"><thead><tr><th>Colonne du fichier</th><th>Exemple</th><th>Contenu</th></tr></thead><tbody>${h}</tbody></table>
        <div style="margin-top:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><label class="small" for="xl-hr">Les titres des colonnes sont à la ligne</label><input type="number" id="xl-hr" min="0" value="${sh.hr >= 0 ? sh.hr + 1 : 0}" style="width:74px"><span class="small muted">(0 si le fichier n'a pas de titres)</span></div>`;
    };
    const chips = sh => { const ks = ['last', 'first', 'full', 'fullrev', 'cls', 'sex', 'birth', 'birthplace', 'parent', 'parentPhone', 'parentEmail', 'address', 'mat'].filter(k => sh.map[k] != null); return ks.length ? ks.map(k => `<span class="bdg">${esc(FLABEL[k])}</span>`).join(' ') : '<span class="muted">aucune</span>'; };
    const draw = () => {
      compute(); const r = st.res, sh = st.sheets[st.cur], body = m.el.querySelector('.mdl-b'), sc0 = body.scrollTop;
      const noName = st.sheets.every(s => !s.use || (s.map.last == null && s.map.full == null && s.map.fullrev == null));
      const classOpts = D.classes.map(c => `<option value="${c.id}" ${st.defCls === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('') + `<option value="__new" ${st.defCls === '__new' ? 'selected' : ''}>Nouvelle classe…</option>`;
      body.innerHTML = `<p class="small muted" style="margin-bottom:12px">Pas besoin de suivre le modèle : le logiciel reconnaît les colonnes par leur titre, dans n'importe quel ordre. Seuls le <b>nom</b> et le <b>prénom</b> sont nécessaires ; le matricule, le code parent et le reste sont ajoutés automatiquement.</p>
      ${noName ? `<div style="background:var(--red-s);color:var(--red);padding:10px 12px;border-radius:8px;margin-bottom:12px;font-size:13.5px">Aucune colonne de nom reconnue. Ouvrez « Colonnes reconnues » ci-dessous et indiquez la colonne du nom (et celle des prénoms).</div>` : ''}
      <div class="kpis" style="margin-bottom:14px;grid-template-columns:repeat(3,1fr)"><div class="kpi g"><small>Élèves à importer</small><b>${r.list.length}</b></div><div class="kpi ${r.bad.length ? 'o' : ''}"><small>Lignes ignorées</small><b>${r.bad.length}</b></div><div class="kpi"><small>Classes à créer</small><b>${r.names.length}</b></div></div>
      ${multi ? `<div class="fld" style="margin-bottom:12px"><label>Feuilles du fichier</label><div>${st.sheets.map((s, i) => `<label class="chk" style="display:flex;gap:8px;margin-bottom:5px"><input type="checkbox" data-xuse="${i}" ${s.use ? 'checked' : ''}><span>${esc(s.name)} <small class="muted">${s.use && r.per[i] ? r.per[i].list.length + ' élève(s)' : ''}${s.autoClass ? ' · classe : ' + esc(s.autoClass) : ''}</small></span></label>`).join('')}</div></div>` : ''}
      <details id="xl-map" ${st.mapOpen || noName ? 'open' : ''} style="margin-bottom:12px"><summary class="small" style="cursor:pointer">Colonnes reconnues : ${chips(sh)} <span class="muted">(modifier)</span></summary>
        ${multi ? `<div style="margin-top:8px"><select id="xl-sheet">${st.sheets.map((s, i) => `<option value="${i}" ${i === st.cur ? 'selected' : ''}>Feuille : ${esc(s.name)}</option>`).join('')}</select></div>` : ''}${mapHtml(sh)}</details>
      ${r.needCls ? `<div class="fld" style="margin-bottom:12px"><label>${r.needCls} élève(s) sans classe dans le fichier : les ranger dans</label><div style="display:flex;gap:8px;flex-wrap:wrap"><select id="xl-defcls" style="flex:1;min-width:200px">${classOpts}</select>${st.defCls === '__new' ? `<input type="text" id="xl-newcls" value="${esc(st.newCls)}" placeholder="Nom de la classe" style="flex:1;min-width:200px">` : ''}</div></div>` : ''}
      ${r.noSex ? `<div class="fld" style="margin-bottom:12px"><label>Sexe non précisé pour ${r.noSex} élève(s)</label><select id="xl-sex"><option value="guess" ${st.sexMode === 'guess' ? 'selected' : ''}>Deviner d'après le prénom (à vérifier ensuite)</option><option value="M" ${st.sexMode === 'M' ? 'selected' : ''}>Masculin pour tous</option><option value="F" ${st.sexMode === 'F' ? 'selected' : ''}>Féminin pour tous</option></select></div>` : ''}
      ${r.hasMat ? `<label class="chk" style="display:flex;gap:8px;align-items:flex-start;margin-bottom:12px"><input type="checkbox" id="xl-mat" ${st.keepMat ? 'checked' : ''} style="margin-top:4px"><span>Conserver les matricules de votre fichier<br><small class="muted">Sinon, de nouveaux matricules (ELV-0001…) sont créés automatiquement.</small></span></label>` : ''}
      ${r.names.length ? `<label class="chk" style="display:flex;gap:8px;align-items:flex-start;margin-bottom:12px"><input type="checkbox" id="xl-mk" ${st.create ? 'checked' : ''} style="margin-top:4px"><span>Créer les classes qui n'existent pas encore : <b>${r.names.map(esc).join(', ')}</b><br><small class="muted">Sans cette option, ces élèves sont ignorés.</small></span></label>` : ''}
      ${r.badDates ? `<p class="small muted" style="margin-bottom:12px">${r.badDates} date(s) de naissance non reconnue(s) : elles seront laissées vides.</p>` : ''}
      ${r.bad.length ? `<details style="margin-bottom:12px"><summary class="small" style="cursor:pointer">Voir les lignes ignorées (${r.bad.length})</summary><div class="small muted" style="max-height:140px;overflow:auto;margin-top:6px">${r.bad.slice(0, 100).map(esc).join('<br>')}</div></details>` : ''}
      <div class="tw" style="max-height:260px;overflow:auto"><table class="tbl"><thead><tr><th>Nom</th><th>Prénoms</th><th>Sexe</th><th>Classe</th><th>Naissance</th><th>Parent</th><th>Téléphone</th></tr></thead><tbody>${r.list.slice(0, 30).map(e => `<tr><td>${esc(e.last)}</td><td>${esc(e.first)}</td><td>${sexFinal(e) === 'F' ? 'F' : 'M'}</td><td>${esc(e.clsName || defName())}</td><td>${e.birth ? esc(U.fdate(e.birth)) : '—'}</td><td>${esc(e.parent)}</td><td>${esc(e.parentPhone)}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">Aucun élève reconnu.</td></tr>'}</tbody></table></div>${r.list.length > 30 ? `<p class="small muted" style="margin-top:6px">Et ${r.list.length - 30} autre(s)…</p>` : ''}`;
      const btn = m.el.querySelector('.mdl-f .btn-primary'); if (btn) btn.innerHTML = 'Importer ' + r.list.length + ' élève(s)';
      body.scrollTop = sc0;
      const dt = body.querySelector('#xl-map'); if (dt) dt.addEventListener('toggle', () => { st.mapOpen = dt.open; });
    };
    const onChange = ev => {
      const t = ev.target, sh = st.sheets[st.cur];
      if (t.dataset.xmap != null) {
        const c = +t.dataset.xmap, k = t.value; Object.keys(sh.map).forEach(x => { if (sh.map[x] === c) delete sh.map[x]; });
        if (k) { delete sh.map[k]; if (k === 'last' || k === 'first') { delete sh.map.full; delete sh.map.fullrev; } if (k === 'full' || k === 'fullrev') { delete sh.map.last; delete sh.map.first; delete sh.map[k === 'full' ? 'fullrev' : 'full']; } sh.map[k] = c; }
        st.mapOpen = true;
      } else if (t.id === 'xl-hr') { const v = Math.max(0, Math.floor(+t.value || 0)); const a = analyze(sh.name, sh.rows, v === 0 ? -1 : v - 1); if (v === 0) { const g = guessNoHeader(sh.rows); a.map = g.map; a.start = Math.max(0, g.start); } Object.assign(sh, { hr: a.hr, start: a.start, map: a.map, autoClass: a.autoClass || sh.autoClass }); st.mapOpen = true; }
      else if (t.dataset.xuse != null) st.sheets[+t.dataset.xuse].use = t.checked;
      else if (t.id === 'xl-sheet') { st.cur = +t.value; st.mapOpen = true; }
      else if (t.id === 'xl-defcls') st.defCls = t.value;
      else if (t.id === 'xl-newcls') st.newCls = t.value;
      else if (t.id === 'xl-sex') st.sexMode = t.value;
      else if (t.id === 'xl-mat') st.keepMat = t.checked;
      else if (t.id === 'xl-mk') st.create = t.checked;
      else return;
      draw();
    };
    const m = UI.modal({
      title: 'Importer des élèves', size: 'lg', body: '',
      actions: [{ label: 'Annuler' }, {
        label: 'Importer', cls: 'btn-primary', onClick: () => {
          const r = st.res; if (!r.list.length) { UI.toast('Aucun élève à importer : vérifiez les colonnes reconnues.', 'err'); return false; }
          let made = 0, skipped = 0, n = 0, kept = 0; const sexGuess = r.list.filter(e => !e.sex).length;
          const used = new Set(D.students.map(s => nz(s.matricule))), mine = {};
          const fileMat = {}; if (st.keepMat) r.list.forEach(e => { const k = nz(e.mat); if (k) fileMat[k] = (fileMat[k] || 0) + 1; });
          const okMat = e => st.keepMat && e.mat && fileMat[nz(e.mat)] === 1 && !used.has(nz(e.mat));
          const reserved = new Set(); r.list.forEach(e => { if (okMat(e)) reserved.add(nz(e.mat)); }); reserved.forEach(k => used.add(k));
          const nextMat = () => { let x; do { x = 'ELV-' + String(++D.counters.student).padStart(4, '0'); } while (used.has(nz(x))); used.add(nz(x)); return x; };
          const classFor = nm => {
            let c = findClass(nm) || mine[canon(nm)]; if (c) return c;
            if (!st.create) return null;
            const cy = guessCycle(nm); c = { id: uid(), name: nm, cycle: cy, tuition: 0, inscription: 0, capacity: 40, teacherId: '' }; D.classes.push(c); D.subjects[c.id] = ((A.PRESET || {})[cy] || []).map(([name, coef]) => ({ id: uid(), name, coef })); mine[canon(nm)] = c; made++; return c;
          };
          r.list.forEach(e => {
            const c = classFor(e.clsName || defName()); if (!c) { skipped++; return; }
            let mat = ''; if (st.keepMat && e.mat && reserved.has(nz(e.mat))) { mat = str(e.mat); kept++; } else mat = nextMat();
            const ns = { id: uid(), matricule: mat, pin: '', status: 'inscrit', createdAt: today(), discount: 0, cantine: false, photo: '', last: e.last, first: e.first, sex: sexFinal(e), birth: e.birth, birthplace: e.birthplace, classId: c.id, parent: e.parent, parentPhone: e.parentPhone, parentEmail: e.parentEmail, address: e.address };
            ns.pin = A.parentPin(ns, D.students); D.students.push(ns); n++;
          });
          A.save(); A.rerender();
          UI.toast(n + ' élève(s) importé(s)' + (made ? ', ' + made + ' classe(s) créée(s)' : '') + (skipped ? ', ' + skipped + ' ignoré(s) (classe absente)' : '') + (r.bad.length ? ', ' + r.bad.length + ' ligne(s) ignorée(s)' : '') + '.', 'ok');
          if (sexGuess && st.sexMode === 'guess') setTimeout(() => UI.toast('Le sexe de ' + sexGuess + ' élève(s) a été deviné d\'après le prénom : pensez à le vérifier.', 'ok'), 1500);
        }
      }]
    });
    m.el.querySelector('.mdl-b').addEventListener('change', onChange);
    m.el.querySelector('.mdl-b').addEventListener('input', ev => { if (ev.target.id === 'xl-newcls') { st.newCls = ev.target.value; } });
    draw();
  }

  async function importFile(file) {
    try { openWizard(await readBook(file)); } catch (e) { UI.toast(e.message || 'Fichier illisible.', 'err'); }
  }
  X.importFile = importFile;
  X.imp = { fieldOf, analyze, parseSheet, splitName, parseDate, guessSex, canon, findClass, sexOf, readBook };
})();
