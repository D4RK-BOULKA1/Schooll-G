/* School-G : configuration. */
window.SG_CONFIG = {
  brand: 'School-G',
  trialDays: 7,
  /* Le compte administrateur est celui dont l'email est ci-dessous (connexion Google, ou email + mot de passe
     avec email vérifié). Le même email doit figurer dans firestore.rules (fonction isAdmin). */
  adminEmail: 'boulkassoum11@gmail.com',
  /* Empreinte (SHA-256) du code d'accès au panel admin : le code lui-même n'est pas écrit ici. */
  adminCodeHash: '814339de922565623174317409a61c8bfc30921e2fc5e0a447e1804fd61ad1e6',
  /* Empreinte (SHA-256) du code à 4 chiffres qui verrouille « Modifier le site en live » (différent du code du panel). */
  siteCodeHash: 'b3d5863dd1744a2f767c5f46b6b7b159ace2c9f7cc968b89c342144e3adf0f93',
  contact: { whatsapp: '22384322866', email: 'boulkassoum11@gmail.com' },
  plans: [
    { id: 'mensuel', name: 'Mensuel', price: 25000, months: 1, desc: 'Sans engagement, résiliable à tout moment' },
    { id: 'trimestriel', name: 'Trimestriel', price: 70000, months: 3, desc: 'Un trimestre scolaire complet' },
    { id: 'annuel', name: 'Annuel', price: 250000, months: 12, desc: 'Toute l\'année scolaire, cinq mois offerts' },
    { id: 'unique', name: 'Paiement unique', price: null, months: 1200, desc: 'Vous payez une seule fois, sans renouvellement' }
  ],
  /* Configuration web Firebase (publique par conception : la sécurité vient des règles Firestore). */
  firebase: {
    apiKey: 'AIzaSyBRAVpapnJBsaVz6I7r0yjFbG-iR1d6cIk',
    authDomain: 'school-g1.firebaseapp.com',
    projectId: 'school-g1',
    storageBucket: 'school-g1.firebasestorage.app',
    messagingSenderId: '694311588584',
    appId: '1:694311588584:web:43be575e5ae7456ba0af5d',
    measurementId: 'G-7K6SYN056P'
  }
};
