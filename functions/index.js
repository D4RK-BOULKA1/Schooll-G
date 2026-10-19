/* School-G : analyse d'une photo de bulletin par l'IA (Claude) et reconstruction du thème.
   La clé API reste côté serveur (secret ANTHROPIC_API_KEY), jamais dans le site. */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
admin.initializeApp();

const KEY = defineSecret('ANTHROPIC_API_KEY');
const MODEL = 'claude-sonnet-5-5';
const DAILY_LIMIT = 8;           // analyses par école et par jour
const MAX_B64 = 5 * 1024 * 1024; // taille maximale de l'image (base64)

const PROMPT = `Tu analyses la photo d'un bulletin scolaire (modèle papier d'une école africaine francophone).
Réponds UNIQUEMENT par un objet JSON, sans texte autour, avec exactement ces clés :
{
 "title": titre imprimé en haut du bulletin (ex "BULLETIN DE NOTES", 60 caractères max),
 "p": couleur principale (titres, fond des en-têtes de tableau) au format #RRGGBB,
 "a": couleur d'accent (filets, mise en valeur) au format #RRGGBB,
 "font": "serif" si les titres ont des empattements, sinon "sans",
 "header": "official" si l'en-tête est administratif (République, ministère, devise), "center" si le nom de l'école est centré, sinon "left",
 "border": "none", "thin", "double" ou "thick" selon le cadre autour de la page,
 "zebra": true si les lignes du tableau alternent les couleurs, sinon false,
 "showLogo": true si un logo figure dans l'en-tête,
 "showCoef": true si le tableau a une colonne coefficient,
 "showDevCompo": true si le tableau a des colonnes séparées pour la note de classe et la composition,
 "showTotal": true si le tableau a une colonne total ou points,
 "showAppr": true si chaque matière a une appréciation,
 "showRank": true si le rang de l'élève est indiqué,
 "showClassAvg": true si la moyenne de la classe est indiquée,
 "showMinMax": true si la plus forte et la plus faible moyenne sont indiquées,
 "showAbs": true si les absences ou retards sont indiqués,
 "showMention": true si une mention ou décision du conseil figure,
 "showObs": true si un cadre d'observations figure,
 "showSign": true si des cases de signature figurent,
 "footer": texte de pied de page imprimé, ou "" (120 caractères max)
}
Si un élément n'est pas visible, choisis la valeur la plus probable. Ne recopie aucun nom d'élève ni aucune note.`;

const HEX = /^#[0-9a-fA-F]{6}$/;
const BOOLS = ['zebra', 'showLogo', 'showCoef', 'showDevCompo', 'showTotal', 'showAppr', 'showRank', 'showClassAvg', 'showMinMax', 'showAbs', 'showMention', 'showObs', 'showSign'];
function clean(o) {
  const t = {};
  if (typeof o.title === 'string' && o.title.trim()) t.title = o.title.trim().slice(0, 60);
  if (HEX.test(o.p)) t.p = o.p; if (HEX.test(o.a)) t.a = o.a;
  if (['sans', 'serif'].includes(o.font)) t.font = o.font;
  if (['left', 'center', 'official'].includes(o.header)) t.header = o.header;
  if (['none', 'thin', 'double', 'thick'].includes(o.border)) t.border = o.border;
  BOOLS.forEach(k => { if (typeof o[k] === 'boolean') t[k] = o[k]; });
  if (typeof o.footer === 'string') t.footer = o.footer.trim().slice(0, 120);
  return t;
}

exports.analyseBulletin = onCall({ secrets: [KEY], region: 'us-central1', timeoutSeconds: 60, memory: '256MiB', maxInstances: 5 }, async req => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Connexion requise.');
  const uid = req.auth.uid, db = admin.firestore();
  const snap = await db.doc('schools/' + uid).get();
  if (!snap.exists) throw new HttpsError('permission-denied', 'École introuvable.');
  const s = snap.data(), now = Date.now();
  const ok = s.banned === false && s.blocked === false && ((s.paidUntilMs && s.paidUntilMs > now) || (s.trialCancelled === false && s.trialEndMs > now));
  if (!ok) throw new HttpsError('permission-denied', 'Abonnement inactif.');

  const img = req.data && req.data.image, mime = req.data && req.data.mime;
  if (typeof img !== 'string' || img.length < 1000 || img.length > MAX_B64) throw new HttpsError('invalid-argument', 'Image invalide ou trop lourde.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) throw new HttpsError('invalid-argument', 'Format d\'image non pris en charge.');

  // limite quotidienne par école
  const day = new Date().toISOString().slice(0, 10), ref = db.doc('aiUsage/' + uid + '_' + day);
  const used = await db.runTransaction(async tx => { const d = await tx.get(ref); const n = (d.exists ? d.data().n : 0) + 1; if (n > DAILY_LIMIT) return -1; tx.set(ref, { n, uid, day }); return n; });
  if (used < 0) throw new HttpsError('resource-exhausted', 'Limite d\'analyses atteinte pour aujourd\'hui. Réessayez demain.');

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': KEY.value(), 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 700, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mime, data: img } }, { type: 'text', text: PROMPT }] }] })
  });
  if (!r.ok) { console.error('Claude API', r.status, (await r.text()).slice(0, 300)); throw new HttpsError('unavailable', 'Le service d\'analyse est indisponible.'); }
  const out = await r.json();
  const txt = ((out.content || []).find(b => b.type === 'text') || {}).text || '';
  const m = txt.match(/\{[\s\S]*\}/);
  let parsed; try { parsed = JSON.parse(m ? m[0] : ''); } catch (e) { throw new HttpsError('internal', 'Réponse illisible, réessayez avec une photo plus nette.'); }
  const theme = clean(parsed);
  if (!theme.p && !theme.a) throw new HttpsError('internal', 'Bulletin non reconnu, réessayez avec une photo plus nette.');
  return { theme };
});
