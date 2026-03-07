import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Upload, Download, FileText, Search, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/contexts/CompanyContext';
import { sortEmployees, formatEmployeeName, getEmployeeInitials } from '@/lib/utils';

type SupabaseError = { message: string; statusCode?: string };

interface Payslip {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  file_name: string;
  file_path: string;
  created_at: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
}

const MONTHS = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Décembre' },
];

export default function PayslipsPage() {
  const { role } = useAuth();
  const { currentCompany, companySettings } = useCompany();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    employee_id: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const isManagerOrAdmin = role === 'admin' || role === 'manager';

  const fetchData = async () => {
    if (!currentCompany?.id) {
      setPayslips([]);
      setEmployees([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch employees for this company
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, status')
        .eq('company_id', currentCompany.id)
        .eq('status', 'active');

      if (employeesError) throw employeesError;
      setEmployees(employeesData || []);

      const employeeIds = employeesData?.map(e => e.id) || [];

      if (employeeIds.length === 0) {
        setPayslips([]);
        setLoading(false);
        return;
      }

      const { data: payslipsData, error: payslipsError } = await supabase
        .from('payslips')
        .select('id, employee_id, month, year, file_name, file_path, created_at')
        .in('employee_id', employeeIds)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (payslipsError) throw payslipsError;

      // Enrich payslips with employee data
      const enrichedPayslips = (payslipsData || []).map(p => ({
        ...p,
        employee: employeesData?.find(e => e.id === p.employee_id)
      }));
      
      setPayslips(enrichedPayslips as Payslip[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [currentCompany?.id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Seuls les fichiers PDF sont acceptés');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Le fichier est trop volumineux (max 10 Mo)');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!formData.employee_id || !selectedFile) {
      toast.error('Veuillez sélectionner un employé et un fichier');
      return;
    }

    setUploading(true);

    try {
      const employee = employees.find((e) => e.id === formData.employee_id);
      const fileName = `${employee?.last_name}_${employee?.first_name}_${formData.year}_${String(formData.month).padStart(2, '0')}.pdf`;
      const filePath = `${formData.employee_id}/${formData.year}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('payslips')
        .upload(filePath, selectedFile, { upsert: true });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        const errMsg = (uploadError as SupabaseError).message || '';
        if (errMsg.includes('Bucket not found')) {
          toast.error("Le bucket de stockage 'payslips' n'existe pas. Contactez l'administrateur.");
        } else if (errMsg.includes('Policy') || errMsg.includes('permission') || errMsg.includes('security')) {
          toast.error("Vous n'avez pas les permissions nécessaires pour importer des fichiers.");
        } else {
          toast.error(`Erreur lors de l'upload du fichier : ${errMsg}`);
        }
        return;
      }

      // Save payslip record
      const { error: dbError } = await supabase.from('payslips').upsert(
        {
          employee_id: formData.employee_id,
          month: formData.month,
          year: formData.year,
          file_name: fileName,
          file_path: filePath,
        },
        {
          onConflict: 'employee_id,month,year',
        }
      );

      if (dbError) {
        console.error('Database error:', dbError);
        // Cleanup: remove uploaded file if DB insert failed
        await supabase.storage.from('payslips').remove([filePath]);
        toast.error(`Erreur lors de l'enregistrement : ${dbError.message}`);
        return;
      }

      toast.success('Fiche de paie importée avec succès');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error uploading payslip:', error);
      toast.error("Erreur inattendue lors de l'importation. Veuillez réessayer.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (payslip: Payslip) => {
    try {
      const { data, error } = await supabase.storage
        .from('payslips')
        .download(payslip.file_path);

      if (error) {
        console.error('Download error:', error);
        toast.error(`Erreur lors du téléchargement : ${error.message}`);
        return;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = payslip.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading payslip:', error);
      toast.error('Erreur inattendue lors du téléchargement');
    }
  };

  const handleDelete = async (payslip: Payslip) => {
    try {
      // Delete record first (if DB delete fails, don't delete the file)
      const { error } = await supabase.from('payslips').delete().eq('id', payslip.id);
      if (error) {
        console.error('DB delete error:', error);
        toast.error(`Erreur lors de la suppression : ${error.message}`);
        return;
      }

      // Then delete from storage
      const { error: storageError } = await supabase.storage.from('payslips').remove([payslip.file_path]);
      if (storageError) {
        console.error('Storage delete error (record already removed):', storageError);
      }

      toast.success('Fiche de paie supprimée');
      fetchData();
    } catch (error) {
      console.error('Error deleting payslip:', error);
      toast.error('Erreur inattendue lors de la suppression');
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    });
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredPayslips = payslips.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      `${p.employee?.first_name} ${p.employee?.last_name}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesMonth = !selectedMonth || p.month === selectedMonth;
    const matchesYear = !selectedYear || p.year === selectedYear;
    return matchesSearch && matchesMonth && matchesYear;
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (!currentCompany) {
    return (
      <MainLayout title="Fiches de paie">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Veuillez sélectionner une entreprise</p>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout title="Fiches de paie">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Fiches de paie" subtitle="Gérez et téléchargez les fiches de paie">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{payslips.length}</p>
                  <p className="text-sm text-muted-foreground">Total fiches</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-accent/10">
                  <Upload className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {payslips.filter((p) => p.year === currentYear).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Cette année</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <Download className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{employees.length}</p>
                  <p className="text-sm text-muted-foreground">Employés actifs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un employé..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={selectedMonth?.toString() || 'all'}
              onValueChange={(v) => setSelectedMonth(v === 'all' ? null : parseInt(v))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Mois" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les mois</SelectItem>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value.toString()}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedYear?.toString() || 'all'}
              onValueChange={(v) => setSelectedYear(v === 'all' ? null : parseInt(v))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Année" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isManagerOrAdmin && (
            <Button onClick={() => setDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importer une fiche
            </Button>
          )}
        </div>

        {/* Payslips Table */}
        <Card>
          <CardHeader>
            <CardTitle>Fiches de paie</CardTitle>
            <CardDescription>
              {filteredPayslips.length} fiche{filteredPayslips.length > 1 ? 's' : ''} trouvée{filteredPayslips.length > 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Fichier</TableHead>
                  <TableHead>Date d'import</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayslips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Aucune fiche de paie trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayslips.map((payslip) => (
                    <TableRow key={payslip.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {payslip.employee ? getEmployeeInitials(payslip.employee.first_name, payslip.employee.last_name, companySettings?.employee_sort_order || 'first_name') : ''}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">
                              {payslip.employee ? formatEmployeeName(payslip.employee.first_name, payslip.employee.last_name, companySettings?.employee_sort_order || 'first_name') : ''}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {payslip.employee?.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {MONTHS.find((m) => m.value === payslip.month)?.label} {payslip.year}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{payslip.file_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(payslip.created_at), 'dd/MM/yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(payslip)}
                            title="Télécharger"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {isManagerOrAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer la fiche de paie ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Cette action est irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(payslip)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importer une fiche de paie</DialogTitle>
            <DialogDescription>
              Sélectionnez l'employé et le fichier PDF à importer
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Employé *</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un employé" />
                </SelectTrigger>
                <SelectContent>
                  {sortEmployees(employees, companySettings?.employee_sort_order || 'first_name')
                    .map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {formatEmployeeName(emp.first_name, emp.last_name, companySettings?.employee_sort_order || 'first_name')}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mois</Label>
                <Select
                  value={formData.month.toString()}
                  onValueChange={(v) => setFormData({ ...formData, month: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value.toString()}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Année</Label>
                <Select
                  value={formData.year.toString()}
                  onValueChange={(v) => setFormData({ ...formData, year: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fichier PDF *</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Fichier sélectionné : {selectedFile.name}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Importer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
