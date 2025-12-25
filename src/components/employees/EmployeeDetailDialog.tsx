import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
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
} from 'lucide-react';
import { DateInput } from '@/components/ui/date-input';

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
  const isAdmin = role === 'admin';
  const isManagerOrAdmin = role === 'manager' || role === 'admin';
  
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('contract');
  
  // Contract form state
  const [contractType, setContractType] = useState(employee?.contract_type || '');
  const [startDate, setStartDate] = useState<Date | undefined>(
    employee?.contract_start_date ? new Date(employee.contract_start_date) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    employee?.contract_end_date ? new Date(employee.contract_end_date) : undefined
  );

  useEffect(() => {
    if (employee) {
      setContractType(employee.contract_type || '');
      setStartDate(employee.contract_start_date ? new Date(employee.contract_start_date) : undefined);
      setEndDate(employee.contract_end_date ? new Date(employee.contract_end_date) : undefined);
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
      const fileName = `${Date.now()}_${file.name}`;
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
                {employee.first_name[0]}{employee.last_name[0]}
              </span>
            </div>
            <div>
              <span>{employee.first_name} {employee.last_name}</span>
              <p className="text-sm font-normal text-muted-foreground">{employee.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="contract" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="contract" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Contrat
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

                {isManagerOrAdmin && (
                  <Button onClick={handleSaveContract} disabled={loading} className="w-full">
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Enregistrer les modifications
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Contract Summary */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <Badge variant="secondary" className="mt-1">
                      {getContractTypeLabel(contractType)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Début</p>
                    <p className="font-medium mt-1">
                      {startDate ? format(startDate, 'dd/MM/yyyy') : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fin</p>
                    <p className="font-medium mt-1">
                      {endDate ? format(endDate, 'dd/MM/yyyy') : 'Indéterminée'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
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
      </DialogContent>
    </Dialog>
  );
}