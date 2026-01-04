import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  avatar_url: string | null;
  position?: string | null;
}

interface EmployeesListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  onEmployeeClick?: (employee: Employee) => void;
}

export function EmployeesListDialog({
  open,
  onOpenChange,
  employees,
  onEmployeeClick,
}: EmployeesListDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Employés actifs ({employees.length})</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onEmployeeClick?.(employee)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={employee.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {employee.first_name[0]}
                    {employee.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">
                    {employee.first_name} {employee.last_name}
                  </p>
                  {employee.position && (
                    <p className="text-sm text-muted-foreground">{employee.position}</p>
                  )}
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Actif
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
