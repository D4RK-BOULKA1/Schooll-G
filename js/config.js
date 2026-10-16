/* School-G : configuration. */
window.SG_CONFIG = {
  brand: 'School-G',
  trialDays: 7,
  /* Le compte administrateur est celui dont l'email est ci-dessous (connexion Google, ou email + mot de passe
     avec email vérifié). Le même email doit figurer dans firestore.rules (fonction isAdmin). */
  adminEmail: 'boulkassoum11@gmail.com',
  contact: { whatsapp: '22384322866', email: 'boulkassoum11@gmail.com' },
  plans: [
    { id: 'mensuel', name: 'Mensuel', price: 25000, months: 1, desc: 'Sans engagement, résiliable à tout moment' },
    { id: 'trimestriel', name: 'Trimestriel', price: 70000, months: 3, desc: 'Un trimestre scolaire complet' },
    { id: 'annuel', name: 'Annuel', price: 250000, months: 12, desc: 'Toute l\'année scolaire, deux mois offerts' }
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
