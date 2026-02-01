
# Plan: Tri par statut puis alphabetique

## Resume

Modifier la fonction de tri des employes pour afficher d'abord les employes actifs, puis ceux en attente, tout en conservant le tri alphabetique au sein de chaque groupe de statut.

---

## Ordre de tri souhaite

```text
1. Employes ACTIFS (status = 'active' avec user_id)
   → Tries alphabetiquement selon le parametre (prenom ou nom)

2. Employes EN ATTENTE (status = 'pending' ou 'active' sans user_id)
   → Tries alphabetiquement selon le parametre (prenom ou nom)

3. Employes INACTIFS (status = 'inactive')
   → Tries alphabetiquement selon le parametre (prenom ou nom)
```

---

## Modification de la fonction utilitaire

Fichier: `src/lib/utils.ts`

La fonction `sortEmployees` sera mise a jour pour accepter un parametre optionnel de statut et appliquer le tri en deux etapes :

```typescript
export function sortEmployees<T extends { 
  first_name: string; 
  last_name: string;
  status?: string;
  user_id?: string | null;
}>(
  employees: T[],
  sortBy: EmployeeSortOrder = 'first_name'
): T[] {
  return [...employees].sort((a, b) => {
    // 1. D'abord trier par statut (actif > en attente > inactif)
    const getStatusPriority = (emp: T) => {
      const isActive = emp.status === 'active' && emp.user_id;
      const isPending = emp.status === 'pending' || 
                       (emp.status === 'active' && !emp.user_id);
      if (isActive) return 0;
      if (isPending) return 1;
      return 2; // inactive
    };
    
    const priorityA = getStatusPriority(a);
    const priorityB = getStatusPriority(b);
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // 2. Ensuite trier alphabetiquement
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

## Fichiers a modifier

| Fichier | Modification |
|---------|--------------|
| `src/lib/utils.ts` | Ajouter le tri par statut dans `sortEmployees` |

Les autres fichiers utilisant deja `sortEmployees` beneficieront automatiquement de ce changement, a condition que les objets employes passent les champs `status` et `user_id`.

---

## Fichiers a verifier/adapter

Certains fichiers passent des objets employes avec des noms de champs differents. Il faudra s'assurer que `status` et `user_id` sont bien transmis :

| Fichier | Verification |
|---------|--------------|
| `src/pages/Employees.tsx` | Les employes ont deja `status` et `user_id` |
| `src/pages/TimeOff.tsx` | Verifier si `status` est present |
| `src/pages/Shifts.tsx` | Verifier si `status` est present |
| `src/pages/Swaps.tsx` | Verifier si `status` est present |
| `src/pages/Payslips.tsx` | Verifier si `status` est present |
| `src/components/commissions/AddCommissionDialog.tsx` | Verifier si `status` est present |
| `src/components/time-off/TeamLeaveOverview.tsx` | Les employes ont `status`, verifier `user_id` |
| `src/components/shifts/EmployeesListDialog.tsx` | Verifier les champs |
| `src/components/employees/EmployeeTable.tsx` | Adapter le mapping des champs |

---

## Resultat attendu

Avant :
```text
Alice Dupont (En attente)
Benoit Martin (Actif)
Claire Bernard (Actif)
```

Apres :
```text
Benoit Martin (Actif)
Claire Bernard (Actif)
Alice Dupont (En attente)
```

Les employes actifs apparaissent en premier, tries alphabetiquement, suivis des employes en attente, egalement tries alphabetiquement.
