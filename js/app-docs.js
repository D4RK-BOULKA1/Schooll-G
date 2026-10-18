/* School-G : reçus et factures (aperçu, impression, PDF, partage WhatsApp) */
(function () {
  'use strict';
  const A = window.APP; if (!A) return;
  const { D, U } = A; const { esc, money, fdate } = U;

  /* ---------- modèle commun (aperçu HTML et PDF) ---------- */
  function model(p, kind) {
    const s = A.stu(p.studentId) || {}, S = D.settings, c = A.cls(s.classId) || {};
    const inv = kind === 'facture';
    const motif = p.type + (p.month ? ' · ' + U.monthLabel(p.month) : '');
    const rows = inv
      ? [['Date', fdate(p.date)], ['Facturé à', s.parent || ('Parent de ' + A.name(s))], ['Élève', A.name(s) + (s.matricule ? ' (' + s.matricule + ')' : '')], ['Classe', c.name || ''], ['Règlement', p.method + ' · reçu ' + p.ref]]
      : [['Date', fdate(p.date)], ['Élève', A.name(s) + (s.matricule ? ' (' + s.matricule + ')' : '')], ['Classe', c.name || ''], ['Motif', motif], ['Mode', p.method]];
    const reste = p.type === 'Scolarité' && s.id ? A.balance(s) : null;
    return {
      kind, title: inv ? 'FACTURE' : 'REÇU', ref: inv ? 'F' + String(p.ref).slice(1) : p.ref,
      school: { name: S.name || '', info: [S.address, S.city, S.phone].filter(Boolean).join(' · '), logo: S.logo || '' },
      rows, item: inv ? motif : null, amountLabel: inv ? 'Total facturé (aucune taxe)' : 'Montant reçu', amount: p.amount,
      status: inv ? (p.status === 'validé' ? 'Payée' : p.status === 'annulé' ? 'Annulée' : 'En attente') : null,
      reste, parentPhone: s.parentPhone || '', studentName: A.name(s), cancelled: p.status === 'annulé'
    };
  }

  function html(m) {
    const row = ([a, b]) => `<tr><td style="padding:6px 0;opacity:.7;width:32%">${esc(a)}</td><td><b>${esc(b)}</b></td></tr>`;
    return `<div style="max-width:150mm;margin:0 auto;padding:10mm;border:2px solid #14213D;font-size:13px;background:#fff;color:#14213D"><div style="display:flex;gap:12px;align-items:center;border-bottom:2px solid #E4572E;padding-bottom:10px;margin-bottom:12px">${m.school.logo ? `<img src="${m.school.logo}" style="width:54px;height:54px;object-fit:contain">` : ''}<div><div style="font-family:Fraunces,serif;font-size:19px;font-weight:700">${esc(m.school.name)}</div><div style="font-size:11px;opacity:.7">${esc(m.school.info)}</div></div><div style="margin-left:auto;text-align:right"><div style="font-family:Fraunces,serif;font-size:18px;font-weight:700;color:#E4572E">${m.title}</div><div>${esc(m.ref)}</div></div></div>
      <table style="width:100%;border-collapse:collapse">${m.rows.map(row).join('')}</table>
      ${m.item ? `<table style="width:100%;border-collapse:collapse;margin-top:12px"><tr style="background:#14213D;color:#fff"><td style="padding:7px 10px">Désignation</td><td style="padding:7px 10px;text-align:right">Montant</td></tr><tr><td style="padding:8px 10px;border-bottom:1px solid #ddd">${esc(m.item)}</td><td style="padding:8px 10px;text-align:right;border-bottom:1px solid #ddd">${money(m.amount)}</td></tr></table>` : ''}
      <div style="margin:14px 0;padding:12px;background:#FCEDE6;display:flex;justify-content:space-between;font-size:16px"><span>${m.amountLabel}</span><b>${money(m.amount)}</b></div>
      ${m.status ? `<div style="font-size:13px;margin-bottom:6px">Statut : <b>${m.status}</b></div>` : ''}
      ${m.reste !== null ? `<div style="font-size:12px;opacity:.8">Reste à payer sur la scolarité : <b>${money(m.reste)}</b></div>` : ''}
      ${m.cancelled ? '<div style="margin-top:8px;color:#B3261E;font-weight:700">PAIEMENT ANNULÉ</div>' : ''}
      <div style="display:flex;justify-content:space-between;margin-top:36px;font-size:12px"><span>${m.kind === 'facture' ? 'Le client' : 'Le payeur'}</span><span>Le caissier</span></div></div>`;
  }

  /* ---------- PDF (pdf-lib, texte vectoriel) ---------- */
  let libP = null;
  const loadLib = () => window.PDFLib ? Promise.resolve() : (libP = libP || new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'js/vendor/pdf-lib.min.js'; s.onload = ok; s.onerror = () => { libP = null; ko(new Error('Bibliothèque PDF introuvable.')); }; document.head.appendChild(s); }));

  async function pdfBytes(m) {
    await loadLib();
    const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
    const doc = await PDFDocument.create();
    const W = 420, H = 595, page = doc.addPage([W, H]);
    const reg = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const cs = new Set(reg.getCharacterSet());
    const t = x => String(x == null ? '' : x).replace(/[  ]/g, ' ').replace(/[‘’]/g, "'").split('').map(ch => cs.has(ch.codePointAt(0)) ? ch : '?').join('');
    const navy = rgb(.078, .129, .239), orange = rgb(.894, .341, .180), soft = rgb(.988, .929, .902), grey = rgb(.45, .47, .53);
    const M = 32; let y = H - M;
    page.drawRectangle({ x: 14, y: 14, width: W - 28, height: H - 28, borderColor: navy, borderWidth: 1.5 });
    let tx = M;
    if (m.school.logo) {
      try {
        const b64 = m.school.logo.split(',')[1], bin = atob(b64), arr = Uint8Array.from(bin, c => c.charCodeAt(0));
        const img = /^data:image\/png/.test(m.school.logo) ? await doc.embedPng(arr) : await doc.embedJpg(arr);
        const sc = Math.min(48 / img.width, 48 / img.height); page.drawImage(img, { x: M, y: y - 48 + (48 - img.height * sc) / 2, width: img.width * sc, height: img.height * sc }); tx = M + 58;
      } catch (e) { }
    }
    const nameLines = []; { let line = ''; t(m.school.name).split(' ').forEach(w => { const tryL = line ? line + ' ' + w : w; if (bold.widthOfTextAtSize(tryL, 15) > 190) { nameLines.push(line); line = w; } else line = tryL; }); if (line) nameLines.push(line); }
    nameLines.slice(0, 2).forEach((l, i) => page.drawText(l, { x: tx, y: y - 14 - i * 17, size: 15, font: bold, color: navy }));
    const info = t(m.school.info); if (info) page.drawText(info.slice(0, 60), { x: tx, y: y - 14 - Math.min(nameLines.length, 2) * 17, size: 8, font: reg, color: grey });
    page.drawText(m.title, { x: W - M - bold.widthOfTextAtSize(m.title, 18), y: y - 16, size: 18, font: bold, color: orange });
    const ref = t(m.ref); page.drawText(ref, { x: W - M - reg.widthOfTextAtSize(ref, 10), y: y - 32, size: 10, font: reg, color: navy });
    y -= 62; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 2, color: orange }); y -= 24;
    m.rows.forEach(([a, b]) => { page.drawText(t(a), { x: M, y, size: 10, font: reg, color: grey }); let v = t(b); while (bold.widthOfTextAtSize(v, 10.5) > W - M - 130 && v.length > 3) v = v.slice(0, -2); page.drawText(v, { x: 130, y, size: 10.5, font: bold, color: navy }); y -= 20; });
    y -= 4;
    if (m.item) {
      page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 22, color: navy });
      page.drawText('Désignation', { x: M + 8, y: y + 2, size: 10, font: bold, color: rgb(1, 1, 1) }); const mh = 'Montant'; page.drawText(mh, { x: W - M - 8 - bold.widthOfTextAtSize(mh, 10), y: y + 2, size: 10, font: bold, color: rgb(1, 1, 1) });
      y -= 26; let it = t(m.item); while (reg.widthOfTextAtSize(it, 10.5) > 220 && it.length > 3) it = it.slice(0, -2);
      page.drawText(it, { x: M + 8, y, size: 10.5, font: reg, color: navy }); const am = t(money(m.amount)); page.drawText(am, { x: W - M - 8 - reg.widthOfTextAtSize(am, 10.5), y, size: 10.5, font: reg, color: navy });
      y -= 8; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: .5, color: grey }); y -= 38;
    }
    page.drawRectangle({ x: M, y: y - 14, width: W - 2 * M, height: 38, color: soft });
    page.drawText(t(m.amountLabel), { x: M + 10, y: y + 2, size: 11, font: reg, color: navy });
    const tot = t(money(m.amount)); page.drawText(tot, { x: W - M - 10 - bold.widthOfTextAtSize(tot, 14), y: y, size: 14, font: bold, color: navy });
    y -= 40;
    if (m.status) { page.drawText('Statut : ', { x: M, y, size: 11, font: reg, color: navy }); page.drawText(t(m.status), { x: M + reg.widthOfTextAtSize('Statut : ', 11), y, size: 11, font: bold, color: navy }); y -= 18; }
    if (m.reste !== null) { page.drawText(t('Reste à payer sur la scolarité : ' + money(m.reste)), { x: M, y, size: 9.5, font: reg, color: grey }); y -= 16; }
    if (m.cancelled) { page.drawText('PAIEMENT ANNULE', { x: M, y, size: 11, font: bold, color: rgb(.7, .15, .12) }); y -= 16; }
    const by = 70; page.drawLine({ start: { x: M, y: by + 14 }, end: { x: M + 110, y: by + 14 }, thickness: .5, color: grey }); page.drawLine({ start: { x: W - M - 110, y: by + 14 }, end: { x: W - M, y: by + 14 }, thickness: .5, color: grey });
    page.drawText(m.kind === 'facture' ? 'Le client' : 'Le payeur', { x: M, y: by, size: 9, font: reg, color: grey }); const cl = 'Le caissier'; page.drawText(cl, { x: W - M - reg.widthOfTextAtSize(cl, 9), y: by, size: 9, font: reg, color: grey });
    page.drawText('Document généré avec School-G', { x: M, y: 28, size: 7.5, font: reg, color: grey });
    return doc.save();
  }
  A.docPdf = async (p, kind) => { const m = model(p, kind || 'recu'); const bytes = await pdfBytes(m); return { bytes, name: (m.kind === 'facture' ? 'facture-' : 'recu-') + m.ref + '.pdf', m }; };

  const download = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); };
  const waNumber = ph => { let d = String(ph || '').replace(/\D/g, ''); if (d.length === 8) d = '223' + d; return d; };

  async function share(p, kind) {
    const { bytes, name, m } = await A.docPdf(p, kind);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const text = 'Bonjour, voici ' + (m.kind === 'facture' ? 'la facture ' : 'le reçu ') + m.ref + ' de ' + money(m.amount) + ' (' + m.studentName + '), ' + m.school.name + '. Merci.';
    try {
      const file = new File([blob], name, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    download(blob, name);
    const a = document.createElement('a'); a.href = 'https://wa.me/' + waNumber(m.parentPhone) + '?text=' + encodeURIComponent(text); a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
    UI.toast('PDF téléchargé : joignez-le dans la conversation WhatsApp qui vient de s\'ouvrir.', 'ok');
  }

  /* ---------- fenêtre reçu / facture ---------- */
  A.payDoc = (p, kind) => {
    kind = kind || 'recu';
    const ov = UI.modal({ title: 'Reçu et facture : ' + esc(p.ref), size: 'md', body: '<div id="dcBox"></div>', actions: [{ label: 'Fermer' }] }).el;
    const box = ov.querySelector('#dcBox');
    const draw = () => {
      const m = model(p, kind);
      box.innerHTML = `<div class="tabs" style="margin-bottom:14px;display:flex;gap:6px"><button type="button" class="btn ${kind === 'recu' ? 'btn-navy' : 'btn-ghost'} btn-sm" data-k="recu">Reçu</button><button type="button" class="btn ${kind === 'facture' ? 'btn-navy' : 'btn-ghost'} btn-sm" data-k="facture">Facture</button></div>
        <div style="overflow:auto;max-height:46vh;border:1px solid var(--line);border-radius:8px;padding:10px;background:#f6f4ef">${html(m)}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button type="button" class="btn btn-primary" data-do="wa">Partager sur WhatsApp</button><button type="button" class="btn btn-ghost" data-do="pdf">Télécharger le PDF</button><button type="button" class="btn btn-ghost" data-do="print">Imprimer</button></div>
        <p class="small muted" style="margin-top:10px">Sur téléphone, le PDF est envoyé directement via WhatsApp. Sur ordinateur, il est téléchargé puis WhatsApp s'ouvre pour que vous le joigniez.</p>`;
    };
    box.addEventListener('click', async e => {
      const k = e.target.closest('[data-k]'); if (k) { kind = k.dataset.k; draw(); return; }
      const d = e.target.closest('[data-do]'); if (!d) return; d.disabled = true;
      try {
        if (d.dataset.do === 'print') U.print(html(model(p, kind)));
        else if (d.dataset.do === 'pdf') { const r = await A.docPdf(p, kind); download(new Blob([r.bytes], { type: 'application/pdf' }), r.name); }
        else await share(p, kind);
      } catch (x) { UI.toast('Impossible de générer le PDF : ' + (x.message || x), 'err'); }
      d.disabled = false;
    });
    draw();
  };
  A.receipt = p => A.payDoc(p, 'recu');
})();
