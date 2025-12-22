import { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
  onExport: (companyId: string, month: number, year: number) => void;
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

export function ExportForm({ companies, currentCompany, onExport }: ExportFormProps) {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedCompany, setSelectedCompany] = useState(
    currentCompany?.id || ''
  );
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [isGenerating, setIsGenerating] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const handleGenerate = async () => {
    if (!selectedCompany) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez sélectionner une entreprise.',
      });
      return;
    }

    setIsGenerating(true);

    // Simulate export generation
    await new Promise((resolve) => setTimeout(resolve, 1500));

    onExport(
      selectedCompany,
      parseInt(selectedMonth),
      parseInt(selectedYear)
    );

    toast({
      title: 'Export généré',
      description: `L'export pour ${MONTHS[parseInt(selectedMonth) - 1]} ${selectedYear} a été créé.`,
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
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Entreprise</Label>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
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
