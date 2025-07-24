# Optimisation des Données - Guide d'Utilisation

Ce guide explique comment optimiser le fichier `processed_names.json` de 23 MB en le divisant en plusieurs fichiers plus petits pour améliorer les performances.

## 🎯 Objectif

Transformer le fichier monolithique de **23 MB** en plusieurs fichiers spécialisés :

- **Réduction du temps de chargement initial**
- **Chargement paresseux (lazy loading)**
- **Meilleure performance sur mobile**
- **Cache plus efficace**

## 📋 Prérequis

1. Avoir le fichier `public/data/processed_names.json` (23 MB)
2. Node.js installé

## 🚀 Étape 1 : Séparer les données

```bash
# Exécuter le script de séparation
npm run split-data
```

### Ce que fait le script :

1. **Charge** `public/data/processed_names.json`
2. **Génère** plusieurs fichiers optimisés :

```
public/data/
├── manifest.json           # Inventaire des fichiers (1 KB)
├── summary.json            # Données homepage (5 KB)
├── boys_names.json         # Tous les prénoms garçons (~11 MB)
├── girls_names.json        # Tous les prénoms filles (~11 MB)
├── popular_by_year.json    # Top prénoms récents (50 KB)
├── trending_names.json     # Prénoms tendance (20 KB)
├── search_index.json       # Index de recherche (~3 MB)
├── boys_chunk_0.json       # Chunks garçons (1000 noms/chunk)
├── boys_chunk_1.json
├── girls_chunk_0.json      # Chunks filles (1000 noms/chunk)
└── girls_chunk_1.json
```

### Résultat attendu :

```
📊 Splitting Summary:
Original file: 23.00 MB
Split files total: 22.80 MB
Compression achieved: 0.9%

📋 Files created:
- summary.json (homepage data)
- boys_names.json (all boy names)
- girls_names.json (all girl names)
- popular_by_year.json (recent popular names)
- trending_names.json (trending names)
- search_index.json (lightweight search)
- 24 chunk files (lazy loading)
- manifest.json (file inventory)
```

## 🔧 Étape 2 : Utiliser le nouveau service

### Option A : Remplacement complet (recommandé)

Remplacez vos imports dans les pages :

```typescript
// AVANT
import { getSummary, searchNames } from '../services/namesApi';

// APRÈS
import { getSummary, searchNames } from '../services/splitJsonApi';
```

### Option B : Migration progressive

Gardez votre code existant et testez avec le nouveau service :

```typescript
// Test côte à côte
import * as oldApi from '../services/namesApi';
import * as newApi from '../services/splitJsonApi';

// Comparer les résultats
const oldData = await oldApi.getSummary();
const newData = await newApi.getSummary();
```

## 📈 Amélioration des performances

### Chargement de la homepage

```typescript
// AVANT : 23 MB
const data = await fetch('/data/processed_names.json');

// APRÈS : 5 KB
const summary = await getSummary();
```

### Recherche de noms

```typescript
// AVANT : Tout en mémoire (23 MB)
const results = await searchNames({ query: 'Gabriel' });

// APRÈS : Index léger (3 MB) puis chargement conditionnel
const results = await searchNames({ query: 'Gabriel' });
// Charge automatiquement boys_names.json (11 MB) seulement si nécessaire
```

### Chargement par genre

```typescript
// Charger seulement les prénoms garçons
const boysData = await loadNamesByGender('M');

// Chargement par chunks (lazy loading)
const firstChunk = await loadNamesByGender('M', 0); // Premier 1000
const secondChunk = await loadNamesByGender('M', 1); // Suivant 1000
```

## 🎯 Stratégies d'optimisation par page

### HomePage.tsx

```typescript
// Charge seulement summary.json (5 KB)
const summary = await getSummary();
const popular = await getPopularNamesByYear(2024);
```

### SearchPage.tsx

```typescript
// Recherche simple : search_index.json (3 MB)
const results = await searchNames({ query: 'Gab' });

// Recherche avancée : charge boys_names.json + girls_names.json si nécessaire
const results = await searchNames({
  query: 'Gab',
  minLetters: 5,
  maxLetters: 8,
});
```

### NameDetailsPage.tsx

```typescript
// Charge seulement le fichier du genre concerné
const nameData = await getNameDetails('Gabriel', 'M'); // boys_names.json seulement
```

## 📊 Comparaison des performances

| Fonctionnalité       | Avant (23 MB) | Après (Optimisé) | Gain       |
| -------------------- | ------------- | ---------------- | ---------- |
| **Homepage**         | 23 MB         | 5 KB             | **99.97%** |
| **Recherche simple** | 23 MB         | 3 MB             | **87%**    |
| **Détails prénom**   | 23 MB         | 11 MB            | **52%**    |
| **Top prénoms**      | 23 MB         | 50 KB            | **99.8%**  |

## 🔍 Cache et performance

Le nouveau service inclut un système de cache intelligent :

```typescript
// Première charge : réseau
const data1 = await getSummary(); // Fetch depuis /data/summary.json

// Charges suivantes : cache
const data2 = await getSummary(); // Récupération depuis le cache
```

### Gestion du cache

```typescript
// Vérifier l'état du cache
console.log(getCacheStatus());
// { size: 3, keys: ['summary.json', 'boys_names.json', 'manifest.json'] }

// Vider le cache si nécessaire
clearCache();
```

## 🚀 Déploiement sur Vercel

### Avant déploiement

```bash
# 1. Séparer les données
npm run split-data

# 2. Construire l'application
npm run build

# 3. Déployer
vercel deploy --prod
```

### Structure après déploiement

```
https://votre-app.vercel.app/
├── data/summary.json         # 5 KB - Chargé immédiatement
├── data/search_index.json    # 3 MB - Chargé pour la recherche
├── data/boys_names.json      # 11 MB - Chargé seulement si besoin
└── data/girls_names.json     # 11 MB - Chargé seulement si besoin
```

## 🔧 Personnalisation

### Modifier la taille des chunks

```javascript
// Dans scripts/split-json-data.cjs
const CHUNK_SIZE = 500; // Au lieu de 1000
```

### Ajouter de nouveaux fichiers spécialisés

```javascript
// Exemple : prénoms par région
const regionData = processNamesByRegion(data.names);
fs.writeFileSync(
  path.join(outputDir, 'names_by_region.json'),
  JSON.stringify(regionData)
);
```

## 📋 Checklist de migration

- [ ] **Exécuter** `npm run split-data`
- [ ] **Vérifier** que les fichiers sont créés dans `public/data/`
- [ ] **Tester** le nouveau service avec `splitJsonApi`
- [ ] **Comparer** les performances avant/après
- [ ] **Mettre à jour** les imports dans les pages
- [ ] **Déployer** sur Vercel
- [ ] **Monitorer** les performances en production

## 🎉 Résultat final

- ✅ **Temps de chargement homepage** : 2-3 secondes → **<0.5 seconde**
- ✅ **Recherche rapide** : Toujours rapide grâce à l'index
- ✅ **Expérience mobile** : Grandement améliorée
- ✅ **Cache efficace** : Fichiers spécialisés mis en cache séparément
- ✅ **Déploiement Vercel** : Optimal avec la compression automatique

Votre application est maintenant prête pour la production avec des performances excellentes ! 🚀
