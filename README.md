# 🂡 Bésigue

Jeu de cartes Bésigue — implémentation web jouable contre une IA.

## 🌐 Tester en ligne

**Aucune installation requise.** Accès direct depuis un navigateur :
> URL fournie par le déployeur (ex: `https://besigue.vercel.app`)

Compatible PC, tablette et mobile (Chrome, Firefox, Safari, Edge).

---

## 🚀 Déployer sur Vercel

### Prérequis
- Compte [GitHub](https://github.com) (gratuit)
- Compte [Vercel](https://vercel.com) (gratuit, connecté à GitHub)

### Étape 1 — Pousser sur GitHub

```bash
# Depuis le dossier besigue/
git init
git add .
git commit -m "Bésigue IT-7"
```

Sur [github.com](https://github.com/new) → créer un repo `besigue` → puis :

```bash
git remote add origin https://github.com/TON_COMPTE/besigue.git
git push -u origin main
```

### Étape 2 — Déployer sur Vercel

1. Va sur [vercel.com](https://vercel.com) → **Sign up** avec GitHub
2. **Add New… → Project** → sélectionne le repo `besigue`
3. Vercel détecte Vite automatiquement. Vérifie :
   - Build Command : `npm run build`
   - Output Directory : `dist`
4. Clique **Deploy**

⏱ ~2 minutes. Tu obtiens une URL publique :
`https://besigue-xxx.vercel.app`

### Étape 3 — Partager

Envoie l'URL à tes testeurs — aucune installation requise de leur côté.

---

## 💻 Développement local

```bash
npm install       # Installer les dépendances
npm run dev       # http://localhost:5173
npm test          # 519 tests
npm run build     # Build production
```

---

## 📋 Fonctionnalités

- 🃏 Bésigue complet — 132 cartes (4 jeux de 32 + 4 Jokers)
- 🤖 IA 3 niveaux : Facile / Intermédiaire / Difficile
- 🎴 14 combinaisons détectées automatiquement
- ⚡ Phase finale avec obligations de couleur
- 📊 Brisques, bonus dernier pli, victoire à 1 000 pts
- ⭐ Charles Bézigue (victoire en bas de table)
- 💾 Sauvegarde automatique + historique 20 parties
- 🎓 Tutoriel interactif 8 étapes

---

## 🏗 Stack

React 18 · TypeScript · Tailwind CSS 4 · Vite 6 · Vitest 2
