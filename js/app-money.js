/* School-G : paiements, cantine, stock, dépenses, comptabilité */
(function () {
  'use strict';
  const A = window.APP; if (!A) return;
  const { D, U, ST } = A; const { esc, money, fdate, ic, uid, today, badge } = U; const V = A.views, ACT = A.acts; const sum = A.sum;
  const PTYPES = ['Scolarité', 'Inscription', 'Cantine', 'Tenue', 'Transport', 'Fournitures', 'Autre'];
  const METHODS = ['Espèces', 'Orange Money', 'Moov Money', 'Virement', 'Chèque'];
  const ECATS = ['Loyer', 'Électricité et eau', 'Fournitures', 'Entretien', 'Transport', 'Cantine (achats)', 'Communication', 'Matériel', 'Autre'];

  /* ================= PAIEMENTS ================= */
  function payModal(sid, pre = {}) {
    const stu = sid ? A.stu(sid) : null;
    const m = UI.formModal({
      title: 'Nouveau paiement', size: 'md', submit: 'Enregistrer et imprimer le reçu',
      fields: [A.studentPicker('stu', sid, 'Élève'), { name: 'type', label: 'Motif', type: 'select', options: PTYPES, def: pre.type || 'Scolarité', cls: 'half' }, { name: 'amount', label: 'Montant (FCFA)', type: 'number', min: 1, req: true, cls: 'half', def: pre.amount || '' }, { name: 'method', label: 'Mode', type: 'select', options: METHODS, cls: 'half' }, { name: 'date', label: 'Date', type: 'date', def: today(), cls: 'half' }, { name: 'month', label: 'Mois concerné (cantine)', type: 'month', def: pre.month || today().slice(0, 7), cls: 'half' }, { name: 'status', label: 'État', type: 'select', options: [['validé', 'Validé'], ['en attente', 'En attente']], cls: 'half' }, { name: 'note', label: 'Note', cls: '' }],
      onSubmit: v => {
        const s = A.resolveStudent(v.stu_txt); if (!s) { UI.toast('Sélectionnez un élève dans la liste.', 'err'); return false; }
        if (!(+v.amount > 0)) { UI.toast('Saisissez un montant valide.', 'err'); return false; }
        const p = A.addPayment({ studentId: s.id, type: v.type, amount: +v.amount, method: v.method, date: v.date, status: v.status, month: v.type === 'Cantine' ? v.month : '', note: v.note });
        UI.toast('Paiement enregistré : ' + p.ref, 'ok'); A.rerender(); setTimeout(() => A.receipt(p), 200);
      }
    });
    const hint = document.createElement('div'); hint.className = 'fld'; hint.innerHTML = '<small id="payhint"></small>'; m.el.querySelector('form').insertBefore(hint, m.el.querySelector('form').children[1]);
    const upd = () => { const f = m.el.querySelector('form'); const s = A.resolveStudent(f.querySelector('[name=stu_txt]').value); const t = f.querySelector('[name=type]').value; const h = f.querySelector('#payhint'); h.textContent = s && t === 'Scolarité' ? 'Reste à payer sur la scolarité : ' + money(A.balance(s)) : ''; };
    m.el.addEventListener('input', upd); m.el.addEventListener('change', upd); upd();
  }
  ACT['pay-new'] = el => payModal(el && el.dataset ? el.dataset.id : null);
  ACT['pay-rcp'] = el => { const p = D.payments.find(x => x.id === el.dataset.id); if (p) A.receipt(p); };
  ACT['pay-val'] = el => { const p = D.payments.find(x => x.id === el.dataset.id); p.status = 'validé'; A.save(); A.rerender(); };
  ACT['pay-cancel'] = el => UI.confirm('Annuler ce paiement ? Il ne sera plus compté dans la scolarité ni dans la comptabilité.', () => { D.payments.find(x => x.id === el.dataset.id).status = 'annulé'; A.save(); A.rerender(); }, { danger: true, yes: 'Annuler le paiement' });
  ACT['pay-tab'] = el => { ST.pTab = el.dataset.id; A.rerender(); };
  ACT['relance'] = el => { const s = A.stu(el.dataset.id); const msg = `Bonjour ${s.parent || ''}, l'école ${D.settings.name} vous informe qu'un solde de ${money(A.late(s))} reste à régler pour la scolarité de ${s.first} ${s.last}. Merci de passer à l'administration. Cordialement.`; window.open(A.waParent(s, msg), '_blank', 'noopener'); };

  V.payments = () => {
    ST.pTab = ST.pTab || 'list'; ST.pq = ST.pq || ''; ST.pt = ST.pt || ''; ST.ps = ST.ps || ''; ST.pm = ST.pm || '';
    const tabs = `<div class="pills" style="margin-bottom:16px"><button class="${ST.pTab === 'list' ? 'on' : ''}" data-act="pay-tab" data-id="list">Paiements</button><button class="${ST.pTab === 'late' ? 'on' : ''}" data-act="pay-tab" data-id="late">Retards et relances</button><button class="${ST.pTab === 'class' ? 'on' : ''}" data-act="pay-tab" data-id="class">Situation par classe</button></div>`;
    const act = D.students.filter(s => s.status !== 'radié');
    const dueTot = sum(act, s => A.balance(s)), lateTot = sum(act, s => A.late(s)), payTot = sum(D.payments.filter(p => p.status === 'validé' && p.type === 'Scolarité'), p => p.amount);
    A.view(`${A.head('Paiements et scolarité', 'Encaissements, tranches et relances', A.btn('pay-new', 'Nouveau paiement', { cls: 'btn-primary', icon: 'plus' }))}
    <div class="kpis"><div class="kpi g"><small>Scolarité encaissée</small><b>${money(payTot)}</b></div><div class="kpi"><small>Reste à encaisser</small><b>${money(dueTot)}</b></div><div class="kpi r"><small>Dont en retard</small><b>${money(lateTot)}</b></div><div class="kpi o"><small>Paiements en attente</small><b>${D.payments.filter(p => p.status === 'en attente').length}</b></div></div>${tabs}
    ${ST.pTab === 'list' ? `<div class="tools">${A.search('pq', 'Élève ou numéro de reçu')}${A.sel('pt', [['', 'Tous les motifs'], ...PTYPES.map(t => [t, t])], ST.pt)}${A.sel('ps', [['', 'Tous les états'], ['validé', 'Validés'], ['en attente', 'En attente'], ['annulé', 'Annulés']], ST.ps)}<input type="month" data-f="pm" value="${ST.pm}"></div>` : ''}<div class="card flat"><div class="tw" id="list"></div></div>`);
    const draw = () => {
      const box = document.getElementById('list');
      if (ST.pTab === 'list') {
        const q = ST.pq.toLowerCase().trim();
        const l = D.payments.filter(p => (!ST.pt || p.type === ST.pt) && (!ST.ps || p.status === ST.ps) && (!ST.pm || p.date.startsWith(ST.pm)) && (!q || (A.name(A.stu(p.studentId)) + ' ' + p.ref).toLowerCase().includes(q))).sort((a, b) => b.date.localeCompare(a.date) || b.ref.localeCompare(a.ref));
        box.innerHTML = l.length ? `<table class="tbl"><thead><tr><th>Reçu</th><th>Date</th><th>Élève</th><th>Motif</th><th>Mode</th><th class="r">Montant</th><th>État</th><th></th></tr></thead><tbody>${l.map(p => { const s = A.stu(p.studentId); return `<tr><td><span class="code">${esc(p.ref)}</span></td><td>${fdate(p.date)}</td><td>${s ? `<a href="#/student/${s.id}"><b>${esc(A.name(s))}</b></a>` : '—'}</td><td>${esc(p.type)}${p.month ? ' <small class="muted">' + U.monthLabel(p.month) + '</small>' : ''}</td><td>${esc(p.method)}</td><td class="r"><b>${money(p.amount)}</b></td><td>${badge(p.status, { 'validé': 'ok', 'en attente': 'warn', 'annulé': 'bad' }[p.status])}</td><td class="r"><div class="acts">${p.status === 'en attente' ? A.btn('pay-val', 'Valider', { sm: true, id: p.id }) : ''}${A.iconBtn('pay-rcp', 'print', p.id, 'Reçu')}${p.status !== 'annulé' ? A.iconBtn('pay-cancel', 'x', p.id, 'Annuler', true) : ''}</div></td></tr>`; }).join('')}</tbody></table>` : A.empty('Aucun paiement', 'Enregistrez un premier paiement.');
      } else if (ST.pTab === 'late') {
        const l = act.map(s => ({ s, late: A.late(s), tr: A.tranches(s) })).filter(x => x.late > 0).sort((a, b) => b.late - a.late);
        box.innerHTML = l.length ? `<table class="tbl"><thead><tr><th>Élève</th><th>Classe</th><th>Tranches en retard</th><th class="r">Montant en retard</th><th class="r">Reste total</th><th></th></tr></thead><tbody>${l.map(x => `<tr><td><a href="#/student/${x.s.id}" class="who">${A.avatar(x.s)}<span><b>${esc(A.name(x.s))}</b><small>${esc(x.s.parentPhone || 'Pas de téléphone')}</small></span></a></td><td>${esc((A.cls(x.s.classId) || {}).name || '')}</td><td>${x.tr.filter(t => t.status === 'en retard').map(t => badge(esc(t.label), 'bad')).join(' ')}</td><td class="r"><b style="color:var(--red)">${money(x.late)}</b></td><td class="r">${money(A.balance(x.s))}</td><td class="r"><div class="acts">${x.s.parentPhone ? A.btn('relance', 'Relancer', { sm: true, id: x.s.id }) : ''}${A.btn('pay-new', 'Encaisser', { sm: true, cls: 'btn-primary', id: x.s.id })}</div></td></tr>`).join('')}</tbody></table>` : A.empty('Aucun retard de paiement', 'Toutes les échéances passées sont réglées.');
      } else {
        box.innerHTML = D.classes.length ? `<table class="tbl"><thead><tr><th>Classe</th><th class="c">Élèves</th><th class="r">Attendu</th><th class="r">Encaissé</th><th class="r">Reste</th><th style="min-width:130px">Recouvrement</th></tr></thead><tbody>${D.classes.map(c => { const ss = act.filter(s => s.classId === c.id); const att = sum(ss, s => A.tuition(s)), pd = sum(ss, s => A.paidScol(s.id)); return `<tr><td><b>${esc(c.name)}</b></td><td class="c">${ss.length}</td><td class="r">${money(att)}</td><td class="r">${money(pd)}</td><td class="r">${money(Math.max(0, att - pd))}</td><td>${A.bar(pd, att)}<small class="muted">${att ? Math.round(pd / att * 100) : 0} %</small></td></tr>`; }).join('')}</tbody></table>` : A.empty('Aucune classe', '');
      }
    };
    ST._r = draw; draw();
  };

  /* ================= CANTINE ================= */
  ACT['cant-pay'] = el => { const s = A.stu(el.dataset.id); A.addPayment({ studentId: s.id, type: 'Cantine', amount: +D.settings.cantinePrice || 0, month: ST.cMonth }); UI.toast('Cantine encaissée.', 'ok'); A.rerender(); };
  ACT['cant-add'] = () => {
    const opts = A.active().filter(s => !s.cantine).sort((a, b) => A.name(a).localeCompare(A.name(b))).map(s => [s.id, A.name(s) + ' (' + ((A.cls(s.classId) || {}).name || '') + ')']);
    UI.formModal({ title: 'Inscrire des élèves à la cantine', fields: [{ name: 'ids', label: 'Élèves', type: 'multi', options: opts }], onSubmit: v => { v.ids.forEach(id => { A.stu(id).cantine = true; }); A.save(); A.rerender(); } });
  };
  ACT['cant-rm'] = el => { A.stu(el.dataset.id).cantine = false; A.save(); A.rerender(); };
  V.cantine = () => {
    ST.cMonth = ST.cMonth || today().slice(0, 7); const price = +D.settings.cantinePrice || 0;
    const l = A.active().filter(s => s.cantine).sort((a, b) => A.name(a).localeCompare(A.name(b)));
    const paid = id => D.payments.find(p => p.studentId === id && p.type === 'Cantine' && p.status === 'validé' && p.month === ST.cMonth);
    const nPaid = l.filter(s => paid(s.id)).length;
    A.view(`${A.head('Cantine', 'Abonnements et paiements mensuels · tarif : ' + money(price) + ' / mois', A.btn('cant-add', 'Inscrire des élèves', { cls: 'btn-primary', icon: 'plus' }))}
    <div class="tools"><input type="month" data-f="cMonth" data-re="1" value="${ST.cMonth}"></div>
    <div class="kpis"><div class="kpi"><small>Élèves inscrits</small><b>${l.length}</b></div><div class="kpi g"><small>Ont payé</small><b>${nPaid}</b><span>${money(nPaid * price)}</span></div><div class="kpi r"><small>N'ont pas payé</small><b>${l.length - nPaid}</b><span>${money((l.length - nPaid) * price)}</span></div></div>
    <div class="card flat"><div class="tw">${l.length ? `<table class="tbl"><thead><tr><th>Élève</th><th>Classe</th><th>${esc(U.monthLabel(ST.cMonth))}</th><th></th></tr></thead><tbody>${l.map(s => { const p = paid(s.id); return `<tr><td><a class="who" href="#/student/${s.id}">${A.avatar(s)}<b>${esc(A.name(s))}</b></a></td><td>${esc((A.cls(s.classId) || {}).name || '')}</td><td>${p ? badge('Payé le ' + fdate(p.date), 'ok') : badge('Non payé', 'bad')}</td><td class="r"><div class="acts">${p ? A.iconBtn('pay-rcp', 'print', p.id, 'Reçu') : A.btn('cant-pay', 'Encaisser', { sm: true, cls: 'btn-primary', id: s.id })}${A.iconBtn('cant-rm', 'x', s.id, 'Retirer de la cantine', true)}</div></td></tr>`; }).join('')}</tbody></table>` : A.empty('Aucun élève à la cantine', 'Inscrivez des élèves pour suivre leurs paiements mensuels.', A.btn('cant-add', 'Inscrire des élèves', { cls: 'btn-primary' }))}</div></div>`);
  };

  /* ================= STOCK ================= */
  const itemFields = () => [{ name: 'name', label: 'Article', req: true }, { name: 'cat', label: 'Catégorie', type: 'select', options: ['Tenues', 'Fournitures', 'Livres', 'Cantine', 'Matériel', 'Autre'], cls: 'half' }, { name: 'qty', label: 'Quantité en stock', type: 'number', min: 0, cls: 'half', def: 0 }, { name: 'min', label: 'Seuil d\'alerte', type: 'number', min: 0, cls: 'half', def: 5 }, { name: 'price', label: 'Prix de vente (FCFA)', type: 'number', min: 0, cls: 'half', def: 0 }];
  ACT['stk-new'] = () => UI.formModal({ title: 'Nouvel article', fields: itemFields(), onSubmit: v => { D.stock.push(Object.assign(v, { id: uid() })); A.save(); A.rerender(); } });
  ACT['stk-edit'] = el => { const i = D.stock.find(x => x.id === el.dataset.id); UI.formModal({ title: 'Modifier l\'article', fields: itemFields(), values: i, onSubmit: v => { Object.assign(i, v); A.save(); A.rerender(); } }); };
  ACT['stk-del'] = el => UI.confirm('Supprimer cet article et son historique ?', () => { D.stock = D.stock.filter(x => x.id !== el.dataset.id); D.moves = D.moves.filter(m => m.itemId !== el.dataset.id); A.save(); A.rerender(); }, { danger: true, yes: 'Supprimer' });
  ACT['stk-move'] = el => {
    const i = D.stock.find(x => x.id === el.dataset.id);
    UI.formModal({
      title: 'Mouvement : ' + esc(i.name), submit: 'Enregistrer', fields: [{ name: 'type', label: 'Type', type: 'select', options: [['in', 'Entrée (réapprovisionnement)'], ['out', 'Sortie (remise ou vente)']], cls: 'half' }, { name: 'qty', label: 'Quantité', type: 'number', min: 1, def: 1, req: true, cls: 'half' }, { name: 'stu_txt', label: 'Élève concerné (optionnel)', list: 'dl_mv', hint: 'Pour une tenue remise à un élève.' }, { html: `<datalist id="dl_mv">${A.active().map(s => `<option value="${esc(A.name(s) + ' (' + s.matricule + ')')}">`).join('')}</datalist>` }, { name: 'bill', label: 'Encaisser le prix de vente auprès de l\'élève', type: 'checkbox' }],
      onSubmit: v => {
        const q = +v.qty; if (!(q > 0)) return false; if (v.type === 'out' && q > i.qty) { UI.toast('Stock insuffisant (' + i.qty + ' disponible).', 'err'); return false; }
        const s = A.resolveStudent(v.stu_txt); i.qty = +i.qty + (v.type === 'in' ? q : -q);
        D.moves.push({ id: uid(), itemId: i.id, type: v.type, qty: q, date: today(), studentId: s ? s.id : '' });
        if (v.type === 'out' && v.bill && s && +i.price > 0) A.addPayment({ studentId: s.id, type: i.cat === 'Tenues' ? 'Tenue' : 'Fournitures', amount: q * i.price, note: i.name + ' × ' + q });
        A.save(); A.rerender();
      }
    });
  };
  V.stock = () => {
    const val = sum(D.stock, i => i.qty * i.price);
    A.view(`${A.head('Stock et tenues', 'Entrées, sorties et alertes de seuil', A.btn('stk-new', 'Nouvel article', { cls: 'btn-primary', icon: 'plus' }))}
    <div class="kpis"><div class="kpi"><small>Articles</small><b>${D.stock.length}</b></div><div class="kpi r"><small>Sous le seuil</small><b>${D.stock.filter(i => +i.qty <= +i.min).length}</b></div><div class="kpi o"><small>Valeur du stock</small><b>${money(val)}</b></div></div>
    <div class="card flat"><div class="tw">${D.stock.length ? `<table class="tbl"><thead><tr><th>Article</th><th>Catégorie</th><th class="c">Quantité</th><th class="r">Prix</th><th>État</th><th></th></tr></thead><tbody>${D.stock.map(i => `<tr><td><b>${esc(i.name)}</b></td><td>${esc(i.cat)}</td><td class="c"><b>${i.qty}</b></td><td class="r">${money(i.price)}</td><td>${+i.qty <= 0 ? badge('Rupture', 'bad') : +i.qty <= +i.min ? badge('Stock faible', 'warn') : badge('Suffisant', 'ok')}</td><td class="r"><div class="acts">${A.btn('stk-move', 'Mouvement', { sm: true, id: i.id })}${A.iconBtn('stk-edit', 'edit', i.id, 'Modifier')}${A.iconBtn('stk-del', 'trash', i.id, 'Supprimer', true)}</div></td></tr>`).join('')}</tbody></table>` : A.empty('Stock vide', 'Ajoutez vos tenues, fournitures et livres.', A.btn('stk-new', 'Nouvel article', { cls: 'btn-primary' }))}</div></div>
    ${D.moves.length ? `<div class="card" style="margin-top:20px"><div class="ch"><h3>Derniers mouvements</h3></div><div class="cb" style="padding-top:6px;padding-bottom:6px">${D.moves.slice(-8).reverse().map(m => { const it = D.stock.find(i => i.id === m.itemId); const s = A.stu(m.studentId); return `<div class="row"><span>${badge(m.type === 'in' ? 'Entrée' : 'Sortie', m.type === 'in' ? 'ok' : 'warn')} ${esc(it ? it.name : 'Article supprimé')} × ${m.qty}${s ? ' · ' + esc(A.name(s)) : ''}</span><small class="muted">${fdate(m.date)}</small></div>`; }).join('')}</div></div>` : ''}`);
  };

  /* ================= DÉPENSES ================= */
  const eFields = () => [{ name: 'label', label: 'Libellé', req: true }, { name: 'cat', label: 'Catégorie', type: 'select', options: ECATS, cls: 'half' }, { name: 'amount', label: 'Montant (FCFA)', type: 'number', min: 1, req: true, cls: 'half' }, { name: 'date', label: 'Date', type: 'date', def: today(), cls: 'half' }, { name: 'method', label: 'Mode', type: 'select', options: METHODS, cls: 'half' }, { name: 'note', label: 'Note', type: 'textarea', rows: 2 }];
  ACT['exp-new'] = () => UI.formModal({ title: 'Nouvelle dépense', fields: eFields(), onSubmit: v => { D.expenses.push(Object.assign(v, { id: uid() })); A.save(); A.rerender(); } });
  ACT['exp-edit'] = el => { const e = D.expenses.find(x => x.id === el.dataset.id); UI.formModal({ title: 'Modifier la dépense', fields: eFields(), values: e, onSubmit: v => { Object.assign(e, v); A.save(); A.rerender(); } }); };
  ACT['exp-del'] = el => UI.confirm('Supprimer cette dépense ?', () => { D.expenses = D.expenses.filter(x => x.id !== el.dataset.id); A.save(); A.rerender(); }, { danger: true, yes: 'Supprimer' });
  V.expenses = () => {
    ST.eMonth = ST.eMonth || today().slice(0, 7); ST.eq = ST.eq || '';
    A.view(`${A.head('Dépenses', 'Toutes les sorties d\'argent de l\'école', A.btn('exp-new', 'Nouvelle dépense', { cls: 'btn-primary', icon: 'plus' }))}<div class="tools">${A.search('eq', 'Rechercher une dépense')}<input type="month" data-f="eMonth" data-re="1" value="${ST.eMonth}"></div><div id="sumbox"></div><div class="card flat"><div class="tw" id="list"></div></div>`);
    const draw = () => {
      const q = ST.eq.toLowerCase(); const l = D.expenses.filter(e => (!ST.eMonth || e.date.startsWith(ST.eMonth)) && (!q || (e.label + e.cat).toLowerCase().includes(q))).sort((a, b) => b.date.localeCompare(a.date));
      const by = {}; l.forEach(e => by[e.cat] = (by[e.cat] || 0) + (+e.amount)); const data = Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k.slice(0, 11), v: [v] }));
      document.getElementById('sumbox').innerHTML = `<div class="g21" style="margin-bottom:20px"><div class="kpi o"><small>Total sur la période</small><b>${money(sum(l, e => e.amount))}</b><span>${l.length} dépense(s)</span></div><div class="card"><div class="cb">${data.length ? U.bars(data, { h: 120, fmt: money, colors: ['var(--navy)'] }) : '<p class="muted small">Aucune dépense sur cette période.</p>'}</div></div></div>`;
      document.getElementById('list').innerHTML = l.length ? `<table class="tbl"><thead><tr><th>Date</th><th>Libellé</th><th>Catégorie</th><th>Mode</th><th class="r">Montant</th><th></th></tr></thead><tbody>${l.map(e => `<tr><td>${fdate(e.date)}</td><td><b>${esc(e.label)}</b>${e.note ? '<br><small class="muted">' + esc(e.note) + '</small>' : ''}</td><td>${badge(esc(e.cat), 'info')}</td><td>${esc(e.method)}</td><td class="r"><b>${money(e.amount)}</b></td><td class="r"><div class="acts">${A.iconBtn('exp-edit', 'edit', e.id, 'Modifier')}${A.iconBtn('exp-del', 'trash', e.id, 'Supprimer', true)}</div></td></tr>`).join('')}</tbody></table>` : A.empty('Aucune dépense', 'Enregistrez le loyer, l\'électricité, les fournitures...');
    };
    ST._r = draw; draw();
  };

  /* ================= COMPTABILITÉ ================= */
  A.journal = () => {
    const e = [];
    D.payments.filter(p => p.status === 'validé').forEach(p => e.push({ d: p.date, type: 'Recette', lib: p.type + ' · ' + A.name(A.stu(p.studentId)) + ' (' + p.ref + ')', cat: p.type, in: +p.amount, out: 0 }));
    D.expenses.forEach(x => e.push({ d: x.date, type: 'Dépense', lib: x.label, cat: x.cat, in: 0, out: +x.amount }));
    D.salaries.filter(s => s.status === 'payé').forEach(s => e.push({ d: s.date, type: 'Dépense', lib: 'Salaire ' + ((A.tch(s.teacherId) || {}).name || '') + ' (' + U.monthLabel(s.month) + ')', cat: 'Salaires', in: 0, out: +s.amount }));
    return e.sort((a, b) => b.d.localeCompare(a.d));
  };
  V.accounting = () => {
    ST.acPer = ST.acPer || 'month'; ST.acMonth = ST.acMonth || today().slice(0, 7);
    const all = A.journal(); const y = D.settings.year.split('-')[0];
    const inP = d => ST.acPer === 'all' ? true : ST.acPer === 'month' ? d.startsWith(ST.acMonth) : (d >= y + '-08-01' && d <= (+y + 1) + '-07-31');
    const l = all.filter(x => inP(x.d)); const rec = sum(l, x => x.in), dep = sum(l, x => x.out);
    const byR = {}, byD = {}; l.forEach(x => { if (x.in) byR[x.cat] = (byR[x.cat] || 0) + x.in; if (x.out) byD[x.cat] = (byD[x.cat] || 0) + x.out; });
    const months = []; for (let i = 0; i < 12; i++) { const d = new Date(+y, 8 + i, 1); months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')); }
    const chart = months.map(m => ({ label: U.MONTHS[+m.slice(5) - 1].slice(0, 3), v: [sum(all.filter(x => x.d.startsWith(m)), x => x.in), sum(all.filter(x => x.d.startsWith(m)), x => x.out)] }));
    const tbl = (o, tot) => Object.keys(o).length ? Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="row"><span>${esc(k)}</span><b>${money(v)}</b></div>`).join('') + `<div class="row"><b>Total</b><b>${money(tot)}</b></div>` : '<p class="muted small">Aucune écriture.</p>';
    A.view(`${A.head('Comptabilité', 'Recettes, dépenses et solde. Les salaires payés sont inclus automatiquement.', A.btn('ac-csv', 'Exporter le journal (Excel)', { icon: 'dl' }))}
    <div class="tools"><div class="pills"><button class="${ST.acPer === 'month' ? 'on' : ''}" data-act="acper" data-id="month">Mois</button><button class="${ST.acPer === 'year' ? 'on' : ''}" data-act="acper" data-id="year">Année scolaire</button><button class="${ST.acPer === 'all' ? 'on' : ''}" data-act="acper" data-id="all">Tout</button></div>${ST.acPer === 'month' ? `<input type="month" data-f="acMonth" data-re="1" value="${ST.acMonth}">` : ''}</div>
    <div class="kpis"><div class="kpi g"><small>Recettes</small><b>${money(rec)}</b></div><div class="kpi r"><small>Dépenses</small><b>${money(dep)}</b></div><div class="kpi ${rec - dep >= 0 ? '' : 'r'}"><small>Solde</small><b>${money(rec - dep)}</b></div><div class="kpi o"><small>Écritures</small><b>${l.length}</b></div></div>
    <div class="card" style="margin-bottom:20px"><div class="ch"><h3>Année scolaire ${esc(D.settings.year)}</h3><div class="legend"><span><b style="background:var(--orange)"></b>Recettes</span><span><b style="background:var(--navy)"></b>Dépenses</span></div></div><div class="cb">${U.bars(chart, { fmt: money })}</div></div>
    <div class="g2" style="margin-bottom:20px"><div class="card"><div class="ch"><h3>Recettes par motif</h3></div><div class="cb">${tbl(byR, rec)}</div></div><div class="card"><div class="ch"><h3>Dépenses par catégorie</h3></div><div class="cb">${tbl(byD, dep)}</div></div></div>
    <div class="card flat"><div class="ch" style="border-bottom:1px solid var(--line)"><h3>Journal de caisse</h3></div><div class="tw">${l.length ? `<table class="tbl"><thead><tr><th>Date</th><th>Libellé</th><th>Catégorie</th><th class="r">Entrée</th><th class="r">Sortie</th></tr></thead><tbody>${l.slice(0, 200).map(x => `<tr><td>${fdate(x.d)}</td><td>${esc(x.lib)}</td><td>${esc(x.cat)}</td><td class="r" style="color:var(--green)">${x.in ? money(x.in) : ''}</td><td class="r" style="color:var(--red)">${x.out ? money(x.out) : ''}</td></tr>`).join('')}</tbody></table>${l.length > 200 ? '<p class="small muted" style="padding:12px 16px">Affichage limité aux 200 dernières écritures ; l\'export contient tout.</p>' : ''}` : A.empty('Aucune écriture', 'Les paiements et dépenses apparaîtront ici.')}</div></div>`);
  };
  ACT.acper = el => { ST.acPer = el.dataset.id; A.rerender(); };
  ACT['ac-csv'] = () => U.csv('journal-de-caisse.csv', [['Date', 'Type', 'Libellé', 'Catégorie', 'Entrée', 'Sortie'], ...A.journal().map(x => [x.d, x.type, x.lib, x.cat, x.in || '', x.out || ''])]);
})();
