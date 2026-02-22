

# Plan : Demandes de conges a la demi-journee

## Resume

Ajouter la possibilite de choisir "Matin" ou "Apres-midi" (demi-journee) lors d'une demande de conge. Actuellement, le champ `part_of_day` n'existe pas dans la base de donnees et le formulaire de demande ne propose pas cette option.

---

## Modifications

### 1. Base de donnees : ajouter la colonne `part_of_day`

Ajouter une colonne `part_of_day` a la table `time_off_requests` avec une valeur par defaut `'full_day'` pour ne pas casser les demandes existantes.

```sql
ALTER TABLE public.time_off_requests
ADD COLUMN part_of_day text NOT NULL DEFAULT 'full_day';
```

### 2. Fichier : `src/pages/TimeOff.tsx`

- Ajouter un champ `partOfDay` au state `formData` (valeur par defaut : `'full_day'`)
- Ajouter un selecteur "Duree" dans le formulaire de creation avec les options :
  - Journee complete
  - Matin
  - Apres-midi
- Envoyer `part_of_day` dans l'insertion Supabase
- Utiliser la vraie valeur de `part_of_day` (au lieu du `'full_day'` en dur) dans :
  - `LeaveEstimation` (ligne 475)
  - `handleApprove` pour le calcul `calculateWorkingDays` (ligne 236-240)
- Afficher la duree dans le tableau des demandes (ex: afficher "½ journee (matin)" a cote des dates)

### 3. Fichier : `src/components/time-off/TimeOffEditDialog.tsx`

- Ajouter le champ `part_of_day` dans le formulaire d'edition
- Charger la valeur existante depuis la demande
- Envoyer la mise a jour vers Supabase

### 4. Affichage dans le tableau

Dans les colonnes du tableau des demandes, afficher l'indication de demi-journee quand applicable :
- "01/02 - 01/02 (Matin)" pour une demi-journee matin
- "01/02 - 03/02" pour une journee complete sur plusieurs jours

---

## Details techniques

### Logique de demi-journee

La logique existe deja dans `calculateWorkingDays` (fichier `src/lib/leave-calculator.ts`) :
- Si `partOfDay` est `'morning'` ou `'afternoon'` et une seule journee : compte 0.5 jour
- Si plusieurs jours : soustrait 0.5 du total

Le selecteur sera conditionne : quand les dates de debut et fin sont identiques, les 3 options sont proposees. Quand les dates sont differentes, seule "Journee complete" est disponible (la demi-journee n'a de sens que sur un seul jour).

### Impact sur l'approbation

Quand un manager approuve une demande, le calcul des jours debites du solde utilisera la vraie valeur `part_of_day` au lieu du `'full_day'` actuellement en dur.

