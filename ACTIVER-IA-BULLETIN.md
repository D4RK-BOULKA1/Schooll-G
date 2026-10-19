# Activer la copie automatique de bulletin par IA

Sans cette étape, le bouton « Importer un design (photo) » fonctionne déjà, mais il ne reprend que les couleurs de la photo.
Avec cette étape, l'IA lit la photo et règle aussi la police, l'en-tête, le cadre, les colonnes et les rubriques.

## Ce qu'il faut
1. Un compte API Anthropic avec un peu de crédit : https://console.anthropic.com (créer une clé API).
2. Le forfait Firebase **Blaze** (paiement à l'usage, il inclut un quota gratuit) : console Firebase, projet school-g1, Mise à niveau.
3. Node.js 20 installé sur votre ordinateur.

## Installation (une seule fois, dans un terminal)
```
npm install -g firebase-tools
firebase login
cd Schooll-G
firebase functions:secrets:set ANTHROPIC_API_KEY
firebase deploy --only functions
```
Collez la clé API quand elle est demandée. Ne la mettez jamais dans le site ni sur GitHub.

## Limites et sécurité
- Seules les écoles connectées avec un essai ou un abonnement actif peuvent l'utiliser.
- 8 analyses par école et par jour (modifiable : constante `DAILY_LIMIT` dans `functions/index.js`).
- La clé reste sur le serveur Firebase, jamais dans le navigateur.
