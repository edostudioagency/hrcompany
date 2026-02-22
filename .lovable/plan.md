

# Plan : Modifier et supprimer des commissions

## Resume

Ajouter des boutons d'action (modifier / supprimer) sur chaque ligne du tableau des commissions, avec une boite de dialogue de confirmation pour la suppression et la reutilisation du dialogue existant en mode edition.

---

## Modifications

### 1. Fichier : `src/components/commissions/AddCommissionDialog.tsx`

Transformer le dialogue pour supporter le mode edition :

- Ajouter une prop optionnelle `editCommission` contenant les donnees de la commission a modifier
- Changer le titre du dialogue dynamiquement ("Ajouter" vs "Modifier")
- Pre-remplir le formulaire avec les donnees existantes en mode edition
- En mode edition, utiliser `update` au lieu de `upsert` (mise a jour par `id`)
- Desactiver le changement d'employe en mode edition

### 2. Fichier : `src/pages/Commissions.tsx`

- Ajouter une colonne "Actions" au tableau avec deux boutons :
  - Bouton crayon (Modifier) : ouvre le dialogue en mode edition avec les donnees de la commission
  - Bouton poubelle (Supprimer) : ouvre une boite de dialogue de confirmation
- Ajouter un `AlertDialog` de confirmation de suppression
- Ajouter la fonction `handleDelete` qui appelle `supabase.from('commissions').delete().eq('id', id)` puis rafraichit les donnees
- Ajouter un state `editingCommission` pour le mode edition
- Ne pas permettre la suppression si le statut est "sent" (deja envoye au comptable)

---

## Details techniques

### Props ajoutees au dialogue

```typescript
interface AddCommissionDialogProps {
  // ...existant
  editCommission?: {
    id: string;
    employee_id: string;
    month: number;
    year: number;
    amount: number;
    description: string | null;
    base_amount?: number;
    commission_rate_used?: number;
  } | null;
}
```

### Logique de suppression

```typescript
const handleDelete = async (id: string) => {
  const { error } = await supabase
    .from('commissions')
    .delete()
    .eq('id', id);
  
  if (error) toast.error('Erreur lors de la suppression');
  else { toast.success('Commission supprimee'); fetchData(); }
};
```

### Boutons d'action dans le tableau

Chaque ligne aura un menu d'actions avec :
- "Modifier" (icone Pencil)
- "Supprimer" (icone Trash2, avec confirmation)

Les commissions deja envoyees ("sent") afficheront les boutons desactives ou masques pour eviter toute modification accidentelle.

---

## Resultat attendu

- Chaque ligne du tableau affiche des boutons d'action
- Cliquer sur "Modifier" ouvre le dialogue pre-rempli
- Cliquer sur "Supprimer" affiche une confirmation avant suppression
- Les commissions envoyees ne peuvent pas etre modifiees ou supprimees

