/* School-G : configuration. Modifiez ce fichier pour changer l'administrateur, le contact et les tarifs par défaut. */
window.SG_CONFIG = {
  brand: 'School-G',
  trialDays: 7,
  admin: { email: 'admin@school-g.com', password: 'Admin-SchoolG-2026' },
  contact: { whatsapp: '22384322866', email: 'boulkassoum11@gmail.com' },
  plans: [
    { id: 'mensuel', name: 'Mensuel', price: 25000, months: 1, desc: 'Sans engagement, résiliable à tout moment' },
    { id: 'trimestriel', name: 'Trimestriel', price: 70000, months: 3, desc: 'Un trimestre scolaire complet' },
    { id: 'annuel', name: 'Annuel', price: 250000, months: 12, desc: 'Toute l\'année scolaire, deux mois offerts' }
  ]
};
