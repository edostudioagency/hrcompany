
# Plan: Tri alphabetique de toutes les listes d'employes

## Resume

Appliquer un tri alphabetique (par prenom puis nom) a toutes les listes et menus deroulants affichant des employes dans l'application.

---

## Fichiers a modifier

### 1. `src/pages/TimeOff.tsx` (Conges)
**Localisation** : Ligne ~381 - Menu deroulant "Employe" dans le formulaire de demande de conge

**Modification** : Trier le tableau `employees` avant le `.map()` :
```typescript
{[...employees]
  .sort((a, b) => `${a.first_name} ${a.last_name}`.toLowerCase().localeCompare(`${b.first_name} ${b.last_name}`.toLowerCase(), 'fr'))
  .map((emp) => (
    <SelectItem key={emp.id} value={emp.id}>
      {emp.first_name} {emp.last_name}
    </SelectItem>
  ))}
```

---

### 2. `src/components/commissions/AddCommissionDialog.tsx` (Commissions)
**Localisation** : Ligne ~235 - Menu deroulant "Employe" dans le formulaire d'ajout de commission

**Modification** : Meme logique de tri avant le `.map()` :
```typescript
{[...employees]
  .sort((a, b) => `${a.first_name} ${a.last_name}`.toLowerCase().localeCompare(`${b.first_name} ${b.last_name}`.toLowerCase(), 'fr'))
  .map((emp) => (
    ...
  ))}
```

---

### 3. `src/pages/Payslips.tsx` (Fiches de paie)
**Localisation** : Ligne ~546 - Menu deroulant "Employe" dans le formulaire d'import de fiche de paie

**Modification** : Appliquer le tri alphabetique.

---

### 4. `src/pages/Shifts.tsx` (Planning)
**Localisation** : Ligne ~1013 - Menu deroulant "Employe" dans le formulaire d'ajout de shift

**Modification** : Appliquer le tri alphabetique.

---

### 5. `src/pages/Swaps.tsx` (Echanges)
**Localisation** : Ligne ~327 - Menu deroulant "Echanger avec" pour selectionner un collegue

**Modification** : Appliquer le tri alphabetique sur `otherEmployees`.

---

### 6. `src/components/time-off/TeamLeaveOverview.tsx` (Vue equipe)
**Localisation** : Ligne ~264 - Grille des cartes employes

**Modification** : Trier le tableau `employees` avant l'affichage des cartes.

---

## Resultat attendu

Apres ces modifications :
- Tous les menus deroulants de selection d'employe seront tries de A a Z
- Toutes les listes affichant des employes (cartes, tableaux) seront triees alphabetiquement
- Le tri utilise la locale francaise (`'fr'`) pour gerer correctement les accents

---

## Fichiers deja traites (lors de modifications precedentes)

- `src/components/employees/EmployeeTable.tsx` - Deja trie
- `src/components/shifts/EmployeesListDialog.tsx` - Deja trie
