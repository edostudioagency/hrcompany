import { MoreHorizontal, Edit, Trash2, Mail, UserCheck, UserX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Employee, ROLE_LABELS, Team, EMPLOYEE_STATUS_LABELS } from '@/types/hr';
import { cn } from '@/lib/utils';

interface EmployeeTableProps {
  employees: Employee[];
  teams: Team[];
  onEdit?: (employee: Employee) => void;
  onDelete?: (employee: Employee) => void;
}

export function EmployeeTable({
  employees,
  teams,
  onEdit,
  onDelete,
}: EmployeeTableProps) {
  // Sort employees alphabetically by first name, then last name
  const sortedEmployees = [...employees].sort((a, b) => {
    const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
    const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
    return nameA.localeCompare(nameB, 'fr');
  });

  const getTeamName = (teamId?: string) => {
    if (!teamId) return '-';
    return teams.find((t) => t.id === teamId)?.name || '-';
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'manager':
        return 'bg-accent/10 text-accent border-accent/20';
      default:
        return 'bg-secondary text-secondary-foreground border-secondary';
    }
  };

  const getStatusBadge = (employee: Employee) => {
    const status = employee.status || (employee.active ? 'active' : 'inactive');
    
    switch (status) {
      case 'active':
        return (
          <Badge
            variant="outline"
            className="bg-success/10 text-success border-success/20"
          >
            {EMPLOYEE_STATUS_LABELS.active}
          </Badge>
        );
      case 'pending':
        return (
          <Badge
            variant="outline"
            className="bg-warning/10 text-warning border-warning/20"
          >
            {EMPLOYEE_STATUS_LABELS.pending}
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="bg-muted text-muted-foreground"
          >
            {EMPLOYEE_STATUS_LABELS.inactive}
          </Badge>
        );
    }
  };

  return (
    <div className="table-container">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/30 hover:bg-secondary/30">
            <TableHead className="font-semibold">Employé</TableHead>
            <TableHead className="font-semibold">Équipe</TableHead>
            <TableHead className="font-semibold">Rôle</TableHead>
            <TableHead className="font-semibold">Taux horaire</TableHead>
            <TableHead className="font-semibold">Statut</TableHead>
            <TableHead className="font-semibold">Compte</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="h-32 text-center text-muted-foreground"
              >
                Aucun employé trouvé
              </TableCell>
            </TableRow>
          ) : (
            sortedEmployees.map((employee) => (
              <TableRow
                key={employee.id}
                className="group hover:bg-secondary/20"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={employee.avatarUrl || undefined} alt={`${employee.firstName} ${employee.lastName}`} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {employee.firstName[0]}
                        {employee.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">
                        {employee.firstName} {employee.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {employee.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {getTeamName(employee.teamId)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn('font-medium', getRoleBadgeColor(employee.role))}
                  >
                    {ROLE_LABELS[employee.role]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {employee.hourlyRate ? `${employee.hourlyRate}€/h` : '-'}
                </TableCell>
                <TableCell>
                  {getStatusBadge(employee)}
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center">
                        {employee.userId ? (
                          <UserCheck className="w-5 h-5 text-success" />
                        ) : (
                          <UserX className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {employee.userId
                        ? 'Compte utilisateur lié'
                        : 'Aucun compte utilisateur lié'}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit?.(employee)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete?.(employee)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}