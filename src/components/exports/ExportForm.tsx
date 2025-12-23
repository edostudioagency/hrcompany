import { useState } from 'react';
import { Download, FileSpreadsheet, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Company } from '@/types/hr';

interface ExportFormProps {
  companies: Company[];
  currentCompany: Company | null;
  onExport: (companyId: string, month: number, year: number, sendToAccountant?: boolean) => void;
  onUpdateAccountantEmail?: (companyId: string, email: string) => void;
}

const MONTHS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

export function ExportForm({ companies, currentCompany, onExport, onUpdateAccountantEmail }: ExportFormProps) {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedCompany, setSelectedCompany] = useState(
    currentCompany?.id || ''
  );
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [isGenerating, setIsGenerating] = useState(false);
  const [sendToAccountant, setSendToAccountant] = useState(true);
  const [accountantEmail, setAccountantEmail] = useState(
    currentCompany?.accountantEmail || ''
  );

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const selectedCompanyData = companies.find((c) => c.id === selectedCompany);

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompany(companyId);
    const company = companies.find((c) => c.id === companyId);
    setAccountantEmail(company?.accountantEmail || '');
  };

  const handleSaveAccountantEmail = () => {
    if (selectedCompany && onUpdateAccountantEmail) {
      onUpdateAccountantEmail(selectedCompany, accountantEmail);
      toast({
        title: 'Email enregistré',
        description: `L'email du comptable a été mis à jour.`,
      });
    }
  };

  const handleGenerate = async () => {
    if (!selectedCompany) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez sélectionner une entreprise.',
      });
      return;
    }

    if (sendToAccountant && !accountantEmail) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez renseigner l\'email du comptable.',
      });
      return;
    }

    setIsGenerating(true);

    // Simulate export generation
    await new Promise((resolve) => setTimeout(resolve, 1500));

    onExport(
      selectedCompany,
      parseInt(selectedMonth),
      parseInt(selectedYear),
      sendToAccountant
    );

    toast({
      title: 'Export généré',
      description: sendToAccountant && accountantEmail
        ? `L'export pour ${MONTHS[parseInt(selectedMonth) - 1]} ${selectedYear} a été créé et envoyé à ${accountantEmail}.`
        : `L'export pour ${MONTHS[parseInt(selectedMonth) - 1]} ${selectedYear} a été créé.`,
    });

    setIsGenerating(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          Générer un export comptable
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Entreprise</Label>
            <Select value={selectedCompany} onValueChange={handleCompanyChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Mois</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month, index) => (
                  <SelectItem key={index} value={(index + 1).toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Année</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Accountant Email Section */}
        <div className="p-4 bg-secondary/30 rounded-lg space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            <Label className="font-medium">Email du comptable</Label>
          </div>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="comptable@entreprise.fr"
              value={accountantEmail}
              onChange={(e) => setAccountantEmail(e.target.value)}
              className="flex-1"
            />
            {onUpdateAccountantEmail && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveAccountantEmail}
                disabled={!selectedCompany}
              >
                Enregistrer
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="sendToAccountant"
              checked={sendToAccountant}
              onCheckedChange={(checked) => setSendToAccountant(checked === true)}
            />
            <label
              htmlFor="sendToAccountant"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Envoyer automatiquement l'export au comptable
            </label>
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full md:w-auto"
        >
          {isGenerating ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Génération en cours...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Générer l'export CSV
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
