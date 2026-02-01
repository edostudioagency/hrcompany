
# Plan: Amélioration des cartes du tableau de bord

## Résumé

Masquer la carte "Échanges en attente" si les échanges sont désactivés, et améliorer la clarté de la carte "Shifts cette semaine".

---

## Modifications

### Fichier: `src/pages/Dashboard.tsx`

#### 1. Récupérer les paramètres de l'entreprise

Ajouter `companySettings` depuis le contexte :

```typescript
const { currentCompany, companySettings } = useCompany();
```

#### 2. Masquer la carte "Échanges en attente" si désactivés

Actuellement (ligne 249-255) :
```typescript
{isManagerOrAdmin && (
  <>
    <StatCard title="Demandes en attente" ... />
    <StatCard title="Échanges en attente" ... />
  </>
)}
```

Après modification :
```typescript
{isManagerOrAdmin && (
  <>
    <StatCard title="Demandes en attente" ... />
    {companySettings?.allow_shift_swaps && (
      <StatCard title="Échanges en attente" ... />
    )}
  </>
)}
```

#### 3. Améliorer la clarté de la carte "Shifts"

Modifier le libellé de la carte pour être plus explicite :

| Avant | Après |
|-------|-------|
| Titre: "Shifts cette semaine" | Titre: "Créneaux planifiés" |
| Sous-titre: "Planifiés" | Sous-titre: "Cette semaine" |

Cela rend plus clair que la carte affiche le nombre de créneaux de travail (shifts) personnalisés créés dans le planning pour la semaine en cours.

---

## Résultat attendu

- La carte "Échanges en attente" sera masquée si `allow_shift_swaps` est désactivé dans les paramètres de l'entreprise
- La carte des shifts aura un libellé plus explicite pour les utilisateurs
- Le comportement sera cohérent avec la sidebar qui cache déjà l'onglet "Échanges" quand la fonctionnalité est désactivée

---

## Note explicative

La carte "Shifts cette semaine" (renommée "Créneaux planifiés") compte le nombre de créneaux de travail personnalisés que vous avez créés dans la page Planning pour la semaine en cours. Si vous n'utilisez pas cette fonctionnalité (vous gérez les présences uniquement via les horaires par défaut des employés), cette carte affichera toujours 0.
