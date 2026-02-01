
# Plan: Deplacer les parametres comptable vers les parametres entreprise

## Resume

Retirer les boutons "Parametres comptable" et "Envoyer au comptable" de la page Commissions et integrer cette fonctionnalite dans l'onglet Comptabilite des parametres entreprise.

---

## Modifications

### 1. Page Commissions (`src/pages/Commissions.tsx`)

Supprimer les elements suivants :
- Le state `settings`, `settingsDialogOpen`, `settingsForm`
- La fonction `handleSaveSettings`
- La fonction `handleSendToAccountant`
- Le fetch de `accountant_settings`
- Le bouton "Parametres comptable"
- Le bouton "Envoyer au comptable"
- Le dialogue de parametres comptable

La page ne conservera que :
- Les filtres mois/annee
- Le bouton "Ajouter une commission"
- Les statistiques et le tableau des commissions

### 2. Parametres Comptabilite (`src/components/settings/AccountingSettings.tsx`)

Ajouter une nouvelle section "Envoi des commissions" qui permettra de :
- Voir un recapitulatif des commissions du mois en cours
- Envoyer les commissions non envoyees au comptable
- Voir l'historique des envois (statut des commissions)

Cette section utilisera l'email du comptable deja configure dans `company_settings.accountant_email`.

---

## Interface apres modification

### Page Commissions (simplifiee)

```text
+--------------------------------------------------+
| Commissions                                       |
| Gerez les commissions des employes               |
+--------------------------------------------------+
| [Stats cards]                                     |
+--------------------------------------------------+
| [Fevrier v] [2026 v]     [+ Ajouter commission]  |
+--------------------------------------------------+
| Tableau des commissions                           |
+--------------------------------------------------+
```

### Parametres > Comptabilite (enrichi)

```text
+--------------------------------------------------+
| Email du comptable                               |
| [comptable@cabinet.fr]                           |
+--------------------------------------------------+
| Jours d'envoi automatique                        |
| [1] [15] [28] ...                                |
+--------------------------------------------------+
| Envoi des commissions                            |
| +----------------------------------------------+ |
| | Mois: [Fevrier v] [2026 v]                   | |
| | 3 commissions en attente (1250.00 EUR)        | |
| | [Envoyer au comptable]                       | |
| +----------------------------------------------+ |
+--------------------------------------------------+
```

---

## Avantages

- Centralisation des parametres comptables au meme endroit
- Page Commissions plus simple et focalisee sur la gestion des commissions
- L'email du comptable est gere une seule fois dans `company_settings`
- Coherence avec l'architecture existante (tout lie a l'entreprise)

---

## Fichiers a modifier

1. `src/pages/Commissions.tsx` - Supprimer les elements lies au comptable
2. `src/components/settings/AccountingSettings.tsx` - Ajouter section envoi commissions
