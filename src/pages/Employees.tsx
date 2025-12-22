import { useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmployeeTable } from '@/components/employees/EmployeeTable';
import { EmployeeForm } from '@/components/employees/EmployeeForm';
import { useApp } from '@/contexts/AppContext';
import { mockEmployees, mockTeams } from '@/data/mockData';
import { Employee, ROLE_LABELS } from '@/types/hr';

const Employees = () => {
  const { currentCompany } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  if (!currentCompany) {
    return (
      <MainLayout title="Employés">
        <div className="text-center py-20 text-muted-foreground">
          Sélectionnez une entreprise pour voir les employés.
        </div>
      </MainLayout>
    );
  }

  const teams = mockTeams.filter((t) => t.companyId === currentCompany.id);
  const employees = mockEmployees.filter((e) => e.companyId === currentCompany.id);

  // Apply filters
  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      searchQuery === '' ||
      `${employee.firstName} ${employee.lastName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTeam =
      teamFilter === 'all' || employee.teamId === teamFilter;

    const matchesRole = roleFilter === 'all' || employee.role === roleFilter;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && employee.active) ||
      (statusFilter === 'inactive' && !employee.active);

    return matchesSearch && matchesTeam && matchesRole && matchesStatus;
  });

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsFormOpen(true);
  };

  const handleSave = (employee: Partial<Employee>) => {
    // In real app, this would save to database
    console.log('Saving employee:', employee);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingEmployee(null);
  };

  return (
    <MainLayout
      title="Employés"
      subtitle={`${employees.length} employés • ${currentCompany.name}`}
    >
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un employé..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Équipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Rôle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
              <SelectItem value="manager">{ROLE_LABELS.manager}</SelectItem>
              <SelectItem value="employee">{ROLE_LABELS.employee}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="inactive">Inactifs</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Employee Table */}
      <EmployeeTable
        employees={filteredEmployees}
        teams={teams}
        onEdit={handleEdit}
      />

      {/* Employee Form Modal */}
      <EmployeeForm
        employee={editingEmployee}
        teams={teams}
        companyId={currentCompany.id}
        open={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSave}
      />
    </MainLayout>
  );
};

export default Employees;
