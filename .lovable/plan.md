
# Plan: Tri alphabetique configurable des employes

## Resume

Corriger le tri qui ne fonctionne pas sur la page Employes et ajouter une option dans les parametres pour choisir l'ordre de tri (par prenom ou par nom).

---

## 1. Migration base de donnees

Ajouter une colonne `employee_sort_order` dans la table `company_settings` :

```text
+------------------------+--------+-----------------------------------+
| Colonne                | Type   | Description                       |
+------------------------+--------+-----------------------------------+
| employee_sort_order    | text   | 'first_name' ou 'last_name'       |
|                        |        | Defaut: 'first_name'              |
+------------------------+--------+-----------------------------------+
```

---

## 2. Mise a jour du CompanyContext

Ajouter le parametre `employee_sort_order` dans l'interface `CompanySettings` et le recuperer lors du fetch :

```typescript
interface CompanySettings {
  allow_shift_swaps: boolean;
  employee_sort_order: 'first_name' | 'last_name';
}
```

Cela permettra d'acceder au parametre partout dans l'application via `useCompany()`.

---

## 3. Interface des parametres (RulesSettings.tsx)

Ajouter une nouvelle section "Affichage" avec un selecteur pour l'ordre de tri :

```text
+--------------------------------------------------+
| Affichage des employes                           |
+--------------------------------------------------+
| Trier les listes d'employes par :                |
|                                                  |
| (o) Prenom                                       |
|     Ex: Alice Martin, Benoit Dupont              |
|                                                  |
| ( ) Nom                                          |
|     Ex: Benoit Dupont, Alice Martin              |
+--------------------------------------------------+
```

---

## 4. Fonction utilitaire de tri

Creer une fonction utilitaire reutilisable dans `src/lib/utils.ts` :

```typescript
export function sortEmployees<T extends { first_name: string; last_name: string }>(
  employees: T[],
  sortBy: 'first_name' | 'last_name' = 'first_name'
): T[] {
  return [...employees].sort((a, b) => {
    const valueA = sortBy === 'first_name' 
      ? `${a.first_name} ${a.last_name}` 
      : `${a.last_name} ${a.first_name}`;
    const valueB = sortBy === 'first_name' 
      ? `${b.first_name} ${b.last_name}` 
      : `${b.last_name} ${b.first_name}`;
    return valueA.toLowerCase().localeCompare(valueB.toLowerCase(), 'fr');
  });
}
```

---

## 5. Application du tri dans les composants

Appliquer le tri en utilisant le parametre du contexte dans tous les fichiers concernes :

| Fichier | Localisation |
|---------|--------------|
| `src/pages/Employees.tsx` | Tableau principal des employes |
| `src/pages/TimeOff.tsx` | Menu deroulant selection employe |
| `src/pages/Shifts.tsx` | Menu deroulant assignation shift |
| `src/pages/Swaps.tsx` | Menu deroulant echange collegue |
| `src/pages/Payslips.tsx` | Menu deroulant import fiche paie |
| `src/components/commissions/AddCommissionDialog.tsx` | Selection employe commission |
| `src/components/time-off/TeamLeaveOverview.tsx` | Grille des cartes employes |
| `src/components/shifts/EmployeesListDialog.tsx` | Liste employes actifs |
| `src/components/employees/EmployeeTable.tsx` | Si utilise separement |

Exemple d'utilisation :

```typescript
import { useCompany } from '@/contexts/CompanyContext';
import { sortEmployees } from '@/lib/utils';

// Dans le composant
const { companySettings } = useCompany();
const sortedEmployees = sortEmployees(
  filteredEmployees, 
  companySettings?.employee_sort_order || 'first_name'
);
```

---

## Fichiers a modifier

1. **Migration SQL** - Ajouter `employee_sort_order` a `company_settings`
2. **src/contexts/CompanyContext.tsx** - Ajouter le parametre au contexte
3. **src/lib/utils.ts** - Ajouter la fonction `sortEmployees`
4. **src/components/settings/RulesSettings.tsx** - Ajouter le selecteur de tri
5. **src/pages/Employees.tsx** - Appliquer le tri sur `filteredEmployees`
6. **src/pages/TimeOff.tsx** - Utiliser `sortEmployees` 
7. **src/pages/Shifts.tsx** - Utiliser `sortEmployees`
8. **src/pages/Swaps.tsx** - Utiliser `sortEmployees`
9. **src/pages/Payslips.tsx** - Utiliser `sortEmployees`
10. **src/components/commissions/AddCommissionDialog.tsx** - Utiliser `sortEmployees`
11. **src/components/time-off/TeamLeaveOverview.tsx** - Utiliser `sortEmployees`
12. **src/components/shifts/EmployeesListDialog.tsx** - Utiliser `sortEmployees`

---

## Resultat attendu

- Toutes les listes d'employes seront triees selon le parametre choisi
- L'administrateur peut changer l'ordre de tri dans Parametres > Regles
- Le tri fonctionne correctement avec les accents francais (locale 'fr')
- Le parametre est centralise et accessible partout via le contexte
