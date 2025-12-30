import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LeaveBalanceCard } from '@/components/time-off/LeaveBalanceCard';
import { ImageUpload } from '@/components/ui/image-upload';
import { useCompany } from '@/contexts/CompanyContext';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  FileText,
  Download,
  Eye,
  Loader2,
} from 'lucide-react';

interface EmployeeData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  position: string | null;
  status: string;
  contract_type: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  contract_hours: number | null;
  gross_salary: number | null;
  avatar_url: string | null;
}

interface EmployeeSchedule {
  id: string;
  day_of_week: number;
  start_time: string | null;
  end_time: string | null;
  is_working_day: boolean;
}

interface EmployeeDocument {
  id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  file_size: number | null;
  created_at: string;
}

const CONTRACT_TYPES: Record<string, string> = {
  cdi: 'CDI',
  cdd: 'CDD',
  alternance: 'Alternance',
  stage: 'Stage',
  freelance: 'Freelance',
  interim: 'Intérim',
  other: 'Autre',
};

const DOCUMENT_TYPES: Record<string, string> = {
  contract: 'Contrat de travail',
  id_card: "Carte d'identité",
  cv: 'CV',
  diploma: 'Diplôme',
  rib: 'RIB',
  other: 'Autre document',
};

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function Profile() {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [schedules, setSchedules] = useState<EmployeeSchedule[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id && currentCompany?.id) {
      fetchProfileData();
    }
  }, [user?.id, currentCompany?.id]);

  const fetchProfileData = async () => {
    if (!user?.id || !currentCompany?.id) return;

    try {
      setLoading(true);

      // Fetch employee data for the current company
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', currentCompany.id)
        .maybeSingle();

      if (empError) throw empError;
      
      if (!empData) {
        setLoading(false);
        return;
      }

      setEmployee(empData);

      // Fetch schedules and documents in parallel
      const [schedulesResult, documentsResult] = await Promise.all([
        supabase
          .from('employee_schedules')
          .select('*')
          .eq('employee_id', empData.id)
          .order('day_of_week', { ascending: true }),
        supabase
          .from('employee_documents')
          .select('*')
          .eq('employee_id', empData.id)
          .order('created_at', { ascending: false }),
      ]);

      if (schedulesResult.data) setSchedules(schedulesResult.data);
      if (documentsResult.data) setDocuments(documentsResult.data);

    } catch (error) {
      console.error('Error fetching profile data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (url: string | null) => {
    if (!employee) return;

    try {
      const { error } = await supabase
        .from('employees')
        .update({ avatar_url: url })
        .eq('id', employee.id);

      if (error) throw error;

      setEmployee({ ...employee, avatar_url: url });
      
      // Also update the profile table
      if (user?.id) {
        await supabase
          .from('profiles')
          .update({ avatar_url: url })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDownload = async (doc: EmployeeDocument) => {
    setDownloadingDoc(doc.id);
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
    } finally {
      setDownloadingDoc(null);
    }
  };

  const handlePreview = async (doc: EmployeeDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('employee-documents')
        .createSignedUrl(doc.file_path, 3600);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error opening document:', error);
      toast.error("Erreur lors de l'ouverture du document");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTime = (time: string | null) => {
    if (!time) return '-';
    return time.substring(0, 5);
  };

  if (loading) {
    return (
      <MainLayout title="Mon Profil">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!employee) {
    return (
      <MainLayout title="Mon Profil">
        <div className="flex items-center justify-center h-full p-6">
          <Card className="max-w-md">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Aucun profil employé trouvé pour votre compte.
              </p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Mon Profil">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <ImageUpload
            currentImageUrl={employee.avatar_url}
            onImageChange={handleAvatarChange}
            folder={`employees/${employee.id}`}
            fallback={`${employee.first_name[0]}${employee.last_name[0]}`}
            variant="avatar"
            size="lg"
          />
          <div>
            <h1 className="text-2xl font-bold">
              {employee.first_name} {employee.last_name}
            </h1>
            <p className="text-muted-foreground">{employee.position || 'Poste non défini'}</p>
          </div>
          <Badge 
            variant={employee.status === 'active' ? 'default' : 'secondary'}
            className="ml-auto"
          >
            {employee.status === 'active' ? 'Actif' : 'Inactif'}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{employee.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{employee.phone || 'Non renseigné'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{employee.position || 'Non renseigné'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Contract Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Contrat de travail
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Type de contrat</p>
                  <p className="font-medium">
                    {employee.contract_type 
                      ? CONTRACT_TYPES[employee.contract_type] || employee.contract_type 
                      : 'Non défini'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Heures hebdo.</p>
                  <p className="font-medium">
                    {employee.contract_hours ? `${employee.contract_hours}h` : 'Non défini'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Date d'entrée</p>
                  <p className="font-medium">
                    {employee.contract_start_date 
                      ? format(new Date(employee.contract_start_date), 'dd/MM/yyyy', { locale: fr })
                      : 'Non défini'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date de sortie</p>
                  <p className="font-medium">
                    {employee.contract_end_date 
                      ? format(new Date(employee.contract_end_date), 'dd/MM/yyyy', { locale: fr })
                      : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leave Balances */}
          <LeaveBalanceCard employeeId={employee.id} />

          {/* Weekly Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horaires de travail
              </CardTitle>
            </CardHeader>
            <CardContent>
              {schedules.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun horaire configuré.
                </p>
              ) : (
                <div className="space-y-2">
                  {schedules
                    .filter(s => s.is_working_day)
                    .sort((a, b) => {
                      // Sort Monday-Friday (1-5), then Saturday (6), then Sunday (0)
                      const orderA = a.day_of_week === 0 ? 7 : a.day_of_week;
                      const orderB = b.day_of_week === 0 ? 7 : b.day_of_week;
                      return orderA - orderB;
                    })
                    .map((schedule) => (
                      <div 
                        key={schedule.id} 
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <span className="text-sm font-medium">
                          {DAY_NAMES[schedule.day_of_week]}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Mes documents ({documents.length})
              </CardTitle>
              <CardDescription>
                Documents personnels et administratifs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun document disponible.
                </p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div 
                      key={doc.id} 
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {doc.document_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {DOCUMENT_TYPES[doc.document_type] || doc.document_type} • {formatFileSize(doc.file_size)} • {format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handlePreview(doc)}
                          title="Prévisualiser"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDownload(doc)}
                          disabled={downloadingDoc === doc.id}
                          title="Télécharger"
                        >
                          {downloadingDoc === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
