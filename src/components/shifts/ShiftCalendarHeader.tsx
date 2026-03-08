import { Button } from '@/components/ui/button';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Calendar, CalendarDays, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ShiftCalendarHeaderProps {
  currentDate: Date;
  viewMode: 'month' | 'week';
  showOnlyCustomShifts: boolean;
  days: Date[];
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
  onGoToToday: () => void;
  onViewModeChange: (mode: 'month' | 'week') => void;
  onToggleCustomShifts: () => void;
}

export function ShiftCalendarHeader({
  currentDate,
  viewMode,
  showOnlyCustomShifts,
  days,
  onNavigatePrevious,
  onNavigateNext,
  onGoToToday,
  onViewModeChange,
  onToggleCustomShifts,
}: ShiftCalendarHeaderProps) {
  return (
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={onNavigatePrevious}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onNavigateNext}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <CardTitle className="text-lg capitalize ml-2">
          {viewMode === 'month'
            ? format(currentDate, 'MMMM yyyy', { locale: fr })
            : `Semaine du ${format(days[0], 'd MMMM', { locale: fr })}`}
        </CardTitle>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant={showOnlyCustomShifts ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleCustomShifts}
        >
          <Filter className="h-4 w-4 mr-1" />
          Personnalisés
        </Button>
        <Button variant="outline" size="sm" onClick={onGoToToday}>
          Aujourd'hui
        </Button>
        <div className="flex border rounded-lg overflow-hidden">
          <Button
            variant={viewMode === 'week' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none"
            onClick={() => onViewModeChange('week')}
          >
            <CalendarDays className="h-4 w-4 mr-1" />
            Semaine
          </Button>
          <Button
            variant={viewMode === 'month' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none"
            onClick={() => onViewModeChange('month')}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Mois
          </Button>
        </div>
      </div>
    </CardHeader>
  );
}
