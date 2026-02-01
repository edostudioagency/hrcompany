
# Plan: Systeme de Configuration des Commissions par Employe

## Resume

Mettre en place un systeme complet de gestion des commissions permettant de:
- Configurer le mode de calcul des commissions dans le profil de chaque employe
- Afficher dynamiquement les champs de saisie adaptes lors de l'ajout d'une commission
- Calculer automatiquement le montant de la commission

---

## Fonctionnalites

### 1. Configuration dans le profil employe
Dans l'onglet "Contrat" du dialogue d'edition d'un employe, ajouter une section "Configuration des commissions" qui apparait quand le type de remuneration est "Avec commission":

- **Type de base de calcul**: 
  - Chiffre d'affaires (CA)
  - Marge brute
  - Marge nette
  - Montant fixe par vente
  - Autre (personnalise)

- **Pourcentage de commission**: ex: 5%, 10%, etc.

- **Description/Rappel**: texte libre pour decrire les modalites (ex: "5% du CA HT realise sur les ventes directes")

### 2. Dialogue d'ajout de commission ameliore
Quand un employe est selectionne dans le formulaire d'ajout de commission:

- Afficher un encart recapitulatif de sa configuration (type + %)
- Afficher dynamiquement le champ de saisie correspondant:
  - Si "CA": champ "Chiffre d'affaires realise"
  - Si "Marge brute": champ "Marge brute realisee"
  - Si "Marge nette": champ "Marge nette realisee"
  - Si "Montant fixe": champ "Nombre de ventes"
  - Si "Autre": champ generique "Montant de reference"

- Calcul automatique du montant de commission
- Possibilite de modifier manuellement le montant calcule

---

## Modifications techniques

### Base de donnees

Creer une nouvelle table `employee_commission_configs`:

```text
+---------------------------+-------------+----------------------------------+
| Colonne                   | Type        | Description                      |
+---------------------------+-------------+----------------------------------+
| id                        | uuid        | Cle primaire                     |
| employee_id               | uuid        | Reference employe (unique)       |
| commission_type           | text        | 'ca', 'margin_gross',            |
|                           |             | 'margin_net', 'fixed', 'other'   |
| commission_rate           | numeric     | Pourcentage (ex: 5.00 pour 5%)   |
| fixed_amount_per_unit     | numeric     | Montant fixe par unite           |
| description               | text        | Description des modalites        |
| created_at                | timestamp   |                                  |
| updated_at                | timestamp   |                                  |
+---------------------------+-------------+----------------------------------+
```

Ajouter les colonnes dans la table `commissions`:
- `base_amount`: montant de reference saisi (CA, marge, etc.)
- `commission_rate_used`: taux applique au moment du calcul

### Composants a modifier

1. **EmployeeEditDialog.tsx**
   - Ajouter une section "Configuration commission" dans l'onglet Contrat
   - Afficher les champs quand salary_type = 'commission'
   - Sauvegarder la configuration dans employee_commission_configs

2. **Commissions.tsx (page)**
   - Modifier le dialogue d'ajout pour charger la config de l'employe selectionne
   - Ajouter un encart recapitulatif des modalites
   - Afficher dynamiquement le champ de saisie selon le type
   - Implementer le calcul automatique
   - Permettre la modification manuelle du montant

### Securite RLS

Ajouter les policies sur `employee_commission_configs`:
- Admins: acces complet
- Managers: lecture/ecriture pour les employes de leur entreprise
- Employes: lecture de leur propre configuration

---

## Interface utilisateur

### Profil employe (onglet Contrat)

Quand "Avec commission" est selectionne:

```text
+-----------------------------------------------+
| Configuration des commissions                 |
+-----------------------------------------------+
| Type de base          [  Chiffre d'affaires ] |
| Taux de commission    [  5.00  ] %            |
|                                               |
| Description des modalites                     |
| [  5% du CA HT sur ventes directes...      ] |
+-----------------------------------------------+
```

### Dialogue d'ajout de commission

Apres selection d'un employe:

```text
+-----------------------------------------------+
| Configuration de Jean Dupont                  |
| Base: Chiffre d'affaires | Taux: 5%           |
| "5% du CA HT sur ventes directes"             |
+-----------------------------------------------+

| Chiffre d'affaires realise *   [ 50000.00 ]   |
|                                               |
| Commission calculee                           |
| [ 2500.00 ] EUR   (= 5% de 50000.00 EUR)      |
|                                               |
| Description (optionnel)                       |
| [ CA Janvier 2026...                        ] |
+-----------------------------------------------+
```

---

## Avantages

- Configuration centralisee dans le profil employe
- Rappel visuel des modalites lors de la saisie
- Calcul automatique pour eviter les erreurs
- Tracabilite du montant de base et du taux utilise
- Flexibilite avec possibilite de modifier manuellement
