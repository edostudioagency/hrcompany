
# Plan: Mode d'envoi des commissions (Manuel ou Automatique)

## Resume

Ajouter une option dans les parametres comptables permettant de choisir le mode d'envoi des commissions au comptable : soit manuellement via un bouton, soit automatiquement en meme temps que les autres informations RH (conges, arrets maladie, etc.) aux jours programmes.

---

## Modifications

### 1. Base de donnees

Ajouter une colonne dans `company_settings` :

```text
+---------------------------+-------------+----------------------------------+
| Colonne                   | Type        | Description                      |
+---------------------------+-------------+----------------------------------+
| commissions_send_mode     | text        | 'manual' ou 'automatic'          |
|                           |             | Defaut: 'manual'                 |
+---------------------------+-------------+----------------------------------+
```

### 2. Interface Parametres Comptabilite

Ajouter un selecteur de mode avant la section d'envoi des commissions :

```text
+--------------------------------------------------+
| Mode d'envoi des commissions                     |
+--------------------------------------------------+
| (o) Envoi manuel                                 |
|     Envoyez les commissions quand vous le        |
|     souhaitez via le bouton ci-dessous           |
|                                                  |
| ( ) Envoi automatique                            |
|     Les commissions seront incluses dans         |
|     l'envoi automatique programme avec les       |
|     conges et absences                           |
+--------------------------------------------------+
```

**Comportement selon le mode :**

- **Mode Manuel** : La section "Envoi des commissions" reste visible avec le bouton d'envoi
- **Mode Automatique** : 
  - Le bouton d'envoi manuel est cache
  - Un message indique que les commissions seront envoyees automatiquement aux jours selectionnes
  - Les commissions sont incluses dans le rapport envoye aux jours programmes

### 3. Fichiers a modifier

1. **Migration SQL** - Ajouter `commissions_send_mode` a `company_settings`

2. **AccountingSettings.tsx** - Ajouter le selecteur de mode et gerer l'etat

3. **CommissionsSendSection.tsx** - Recevoir le mode et adapter l'affichage :
   - Mode manuel : afficher le bouton d'envoi comme actuellement
   - Mode automatique : afficher un message informatif sans bouton

4. **send-email/index.ts** - Ajouter le type "commissions" pour l'envoi automatique

---

## Comportement fonctionnel

### Mode Manuel (par defaut)
- L'administrateur clique sur "Envoyer au comptable" quand il le souhaite
- Seules les commissions sont envoyees a ce moment

### Mode Automatique
- Aux jours programmes (ex: le 1er et le 15 du mois), le systeme envoie automatiquement :
  - Les conges valides du mois
  - Les arrets maladie
  - Les autres absences
  - **ET les commissions non envoyees**
- Tout est regroupe dans un seul email au comptable

---

## Interface finale

```text
+--------------------------------------------------+
| Email du comptable                               |
| [comptable@cabinet.fr]                           |
+--------------------------------------------------+
| Jours d'envoi automatique                        |
| [1] [15] ...                                     |
+--------------------------------------------------+
| Mode d'envoi des commissions                     |
| (o) Manuel  ( ) Automatique avec les absences    |
+--------------------------------------------------+
| Envoi des commissions           [Si mode manuel] |
| Mois: [Fevrier] [2026]                           |
| 3 commissions en attente (1250.00 EUR)           |
| [Envoyer au comptable]                           |
+--------------------------------------------------+
|           OU           [Si mode automatique]     |
| Les commissions seront envoyees automatiquement  |
| avec les conges et absences aux jours programmes |
| (1, 15 du mois)                                  |
+--------------------------------------------------+
```

---

## Avantages

- Flexibilite pour l'administrateur selon son workflow
- Les commissions peuvent etre envoyees en meme temps que les autres donnees RH
- Reduction du nombre d'emails envoyes au comptable (tout regroupe)
- Possibilite de garder un controle manuel si souhaite
