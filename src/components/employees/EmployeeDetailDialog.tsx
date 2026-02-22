import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/contexts/CompanyContext';
import { formatEmployeeName, getEmployeeInitials } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileText,
  Trash2,
  Download,
  Loader2,
  Briefcase,
  Eye,
  X,
  Calendar,
} from 'lucide-react';
import { DateInput } from '@/components/ui/date-input';
import { EmployeeLeaveHistory } from '@/components/time-off/EmployeeLeaveHistory';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  position: string | null;
  hourly_rate: number | null;
  status: string;
  contract_type: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  contract_hours: number | null;
  gross_salary: number | null;
}

interface EmployeeDocument {
  id: string;
  employee_id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  file_size: number | null;
  created_at: string;
}

interface EmployeeDetailDialogProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const CONTRACT_TYPES = [
  { value: 'cdi', label: 'CDI' },
  { value: 'cdd', label: 'CDD' },
  { value: 'alternance', label: 'Alternance' },
  { value: 'stage', label: 'Stage' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'interim', label: 'Intérim' },
  { value: 'other', label: 'Autre' },
];

const DOCUMENT_TYPES = [
  { value: 'contract', label: 'Contrat de travail' },
  { value: 'id_card', label: "Carte d'identité" },
  { value: 'cv', label: 'CV' },
  { value: 'diploma', label: 'Diplôme' },
  { value: 'rib', label: 'RIB' },
  { value: 'other', label: 'Autre document' },
];

export function EmployeeDetailDialog({
  employee,
  open,
  onOpenChange,
  onUpdate,
}: EmployeeDetailDialogProps) {
  const { role } = useAuth();
  const { companySettings } = useCompany();
  const sortOrder = companySettings?.employee_sort_order || 'first_name';
  const isAdmin = role === 'admin';
  const isManagerOrAdmin = role === 'manager' || role === 'admin';
  
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('contract');
  const [previewDoc, setPreviewDoc] = useState<EmployeeDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  // Contract form state
  const [contractType, setContractType] = useState(employee?.contract_type || '');
  const [startDate, setStartDate] = useState<Date | undefined>(
    employee?.contract_start_date ? new Date(employee.contract_start_date) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    employee?.contract_end_date ? new Date(employee.contract_end_date) : undefined
  );
  const [contractHours, setContractHours] = useState<string>(
    employee?.contract_hours?.toString() || ''
  );
  const [grossSalary, setGrossSalary] = useState<string>(
    employee?.gross_salary?.toString() || ''
  );

  useEffect(() => {
    if (employee) {
      setContractType(employee.contract_type || '');
      setStartDate(employee.contract_start_date ? new Date(employee.contract_start_date) : undefined);
      setEndDate(employee.contract_end_date ? new Date(employee.contract_end_date) : undefined);
      setContractHours(employee.contract_hours?.toString() || '');
      setGrossSalary(employee.gross_salary?.toString() || '');
      fetchDocuments();
    }
  }, [employee]);

  const fetchDocuments = async () => {
    if (!employee) return;
    
    try {
      const { data, error } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleSaveContract = async () => {
    if (!employee) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          contract_type: contractType || null,
          contract_start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
          contract_end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
          contract_hours: contractHours ? parseFloat(contractHours) : null,
          gross_salary: grossSalary ? parseFloat(grossSalary) : null,
        })
        .eq('id', employee.id);

      if (error) throw error;
      toast.success('Informations du contrat mises à jour');
      onUpdate();
    } catch (error) {
      console.error('Error updating contract:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employee) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      // Sanitize filename: remove accents, special characters, and spaces
      const sanitizedName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
        .replace(/_+/g, '_'); // Remove multiple consecutive underscores
      const fileName = `${Date.now()}_${sanitizedName}`;
      const filePath = `${employee.id}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save document reference
      const { error: dbError } = await supabase
        .from('employee_documents')
        .insert({
          employee_id: employee.id,
          document_type: selectedDocType,
          document_name: file.name,
          file_path: filePath,
          file_size: file.size,
        });

      if (dbError) throw dbError;

      toast.success('Document uploadé avec succès');
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error("Erreur lors de l'upload du document");
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handlePreview = async (doc: EmployeeDocument) => {
    const ext = doc.document_name.split('.').pop()?.toLowerCase();
    
    // For PDFs, open in new tab instead of iframe (better compatibility)
    if (ext === 'pdf') {
      try {
        const { data, error } = await supabase.storage
          .from('employee-documents')
          .createSignedUrl(doc.file_path, 3600); // 1 hour expiry

        if (error) throw error;
        
        window.open(data.signedUrl, '_blank');
      } catch (error) {
        console.error('Error opening PDF:', error);
        toast.error('Erreur lors de l\'ouverture du PDF');
      }
      return;
    }

    // For images, show in modal
    setPreviewDoc(doc);
    setLoadingPreview(true);
    
    try {
      const { data, error } = await supabase.storage
        .from('employee-documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setPreviewUrl(url);
    } catch (error) {
      console.error('Error loading preview:', error);
      toast.error('Erreur lors du chargement de la prévisualisation');
      setPreviewDoc(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewDoc(null);
    setPreviewUrl(null);
  };

  const isPreviewable = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
  };

  const isPdf = (fileName: string) => {
    return fileName.toLowerCase().endsWith('.pdf');
  };

  const handleDownload = async (doc: EmployeeDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('employee-documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.document_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleDeleteDocument = async (doc: EmployeeDocument) => {
    if (!isAdmin) {
      toast.error('Seuls les administrateurs peuvent supprimer des documents');
      return;
    }

    try {
      // Delete from storage
      await supabase.storage
        .from('employee-documents')
        .remove([doc.file_path]);

      // Delete from database
      const { error } = await supabase
        .from('employee_documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;

      toast.success('Document supprimé');
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getContractTypeLabel = (type: string | null) => {
    const found = CONTRACT_TYPES.find((t) => t.value === type);
    return found?.label || type || 'Non défini';
  };

  const getDocumentTypeLabel = (type: string) => {
    const found = DOCUMENT_TYPES.find((t) => t.value === type);
    return found?.label || type;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="font-medium text-primary">
                {getEmployeeInitials(employee.first_name, employee.last_name, sortOrder)}
              </span>
            </div>
            <div>
              <span>{formatEmployeeName(employee.first_name, employee.last_name, sortOrder)}</span>
              <p className="text-sm font-normal text-muted-foreground">{employee.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="contract" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="contract" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Contrat
            </TabsTrigger>
            <TabsTrigger value="leave" className="gap-2">
              <Calendar className="h-4 w-4" />
              Congés
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              Documents ({documents.length})
            </TabsTrigger>
          </TabsList>

          {/* Contract Tab */}
          <TabsContent value="contract" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informations du contrat</CardTitle>
                <CardDescription>
                  Type de contrat et durée d'emploi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Type de contrat</Label>
                  <Select
                    value={contractType}
                    onValueChange={setContractType}
                    disabled={!isManagerOrAdmin}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRACT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date d'entrée</Label>
                    <DateInput
                      value={startDate}
                      onChange={setStartDate}
                      disabled={!isManagerOrAdmin}
                      placeholder="JJ/MM/AAAA"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Date de sortie (optionnel)</Label>
                    <DateInput
                      value={endDate}
                      onChange={setEndDate}
                      disabled={!isManagerOrAdmin}
                      placeholder="JJ/MM/AAAA"
                      minDate={startDate}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Heures hebdomadaires</Label>
                    <Input
                      type="number"
                      value={contractHours}
                      onChange={(e) => setContractHours(e.target.value)}
                      disabled={!isManagerOrAdmin}
                      placeholder="35"
                      min="0"
                      step="0.5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Salaire brut mensuel (€)</Label>
                    <Input
                      type="number"
                      value={grossSalary}
                      onChange={(e) => setGrossSalary(e.target.value)}
                      disabled={!isManagerOrAdmin}
                      placeholder="2500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                {isManagerOrAdmin && (
                  <Button onClick={handleSaveContract} disabled={loading} className="w-full">
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Enregistrer les modifications
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leave Tab */}
          <TabsContent value="leave" className="space-y-4 mt-4">
            <EmployeeLeaveHistory employeeId={employee.id} showBalances={true} />
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4 mt-4">
            {isManagerOrAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ajouter un document</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex-1">
                      <Input
                        type="file"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="cursor-pointer"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                    </div>
                    {uploading && <Loader2 className="h-5 w-5 animate-spin" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Formats acceptés: PDF, DOC, DOCX, JPG, PNG
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Documents ({documents.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun document attaché
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{doc.document_name}</p>
                            <div className="flex gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {getDocumentTypeLabel(doc.document_type)}
                              </Badge>
                              <span>{formatFileSize(doc.file_size)}</span>
                              <span>•</span>
                              <span>{format(new Date(doc.created_at), 'dd/MM/yyyy')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {isPreviewable(doc.document_name) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePreview(doc)}
                              title="Aperçu"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(doc)}
                            title="Télécharger"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDocument(doc)}
                              className="text-destructive hover:text-destructive"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Preview Modal */}
        {previewDoc && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-background rounded-lg shadow-lg border overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <h3 className="font-semibold">{previewDoc.document_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {getDocumentTypeLabel(previewDoc.document_type)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(previewDoc)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closePreview}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-4 overflow-auto max-h-[calc(90vh-80px)] flex items-center justify-center">
                {loadingPreview ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={previewDoc.document_name}
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                ) : (
                  <p className="text-muted-foreground">Impossible de charger la prévisualisation</p>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}