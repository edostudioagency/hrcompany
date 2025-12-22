import { Download, FileSpreadsheet, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MonthlyExport } from '@/types/hr';
import { mockEmployees, mockCompanies } from '@/data/mockData';

interface ExportHistoryProps {
  exports: MonthlyExport[];
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

export function ExportHistory({ exports }: ExportHistoryProps) {
  const getEmployee = (employeeId: string) =>
    mockEmployees.find((e) => e.id === employeeId);

  const getCompany = (companyId: string) =>
    mockCompanies.find((c) => c.id === companyId);

  return (
    <div className="table-container">
      <div className="p-4 border-b border-border/50">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          Historique des exports
        </h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/30 hover:bg-secondary/30">
            <TableHead className="font-semibold">Entreprise</TableHead>
            <TableHead className="font-semibold">Période</TableHead>
            <TableHead className="font-semibold">Généré le</TableHead>
            <TableHead className="font-semibold">Par</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exports.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-32 text-center text-muted-foreground"
              >
                Aucun export généré
              </TableCell>
            </TableRow>
          ) : (
            exports.map((exportItem) => {
              const company = getCompany(exportItem.companyId);
              const generatedBy = getEmployee(exportItem.generatedById);

              return (
                <TableRow
                  key={exportItem.id}
                  className="group hover:bg-secondary/20"
                >
                  <TableCell className="font-medium text-foreground">
                    {company?.name}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {MONTHS[exportItem.month - 1]} {exportItem.year}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(exportItem.generatedAt, 'dd/MM/yyyy à HH:mm', {
                      locale: fr,
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {generatedBy?.firstName[0]}
                          {generatedBy?.lastName[0]}
                        </span>
                      </div>
                      <span className="text-muted-foreground">
                        {generatedBy?.firstName} {generatedBy?.lastName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      onClick={() => window.open(exportItem.fileUrl, '_blank')}
                    >
                      <Download className="w-4 h-4" />
                      CSV
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
