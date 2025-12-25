import * as React from "react";
import { format, parse, isValid, setMonth, setYear, getMonth, getYear } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DayPicker } from "react-day-picker";

interface DateInputProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  minDate?: Date;
  className?: string;
}

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) => currentYear - 25 + i);

export function DateInput({
  value,
  onChange,
  disabled = false,
  placeholder = "JJ/MM/AAAA",
  minDate,
  className,
}: DateInputProps) {
  const [inputValue, setInputValue] = React.useState(
    value ? format(value, "dd/MM/yyyy") : ""
  );
  const [isOpen, setIsOpen] = React.useState(false);
  const [calendarMonth, setCalendarMonth] = React.useState<Date>(value || new Date());

  React.useEffect(() => {
    if (value) {
      setInputValue(format(value, "dd/MM/yyyy"));
      setCalendarMonth(value);
    } else {
      setInputValue("");
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Auto-format: add slashes automatically
    const digits = newValue.replace(/\D/g, "");
    if (digits.length >= 2 && newValue.length === 2) {
      newValue = digits.slice(0, 2) + "/";
    } else if (digits.length >= 4 && newValue.length === 5) {
      newValue = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/";
    } else if (digits.length > 4) {
      newValue = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4, 8);
    }
    
    setInputValue(newValue);

    // Try to parse the date when complete
    if (newValue.length === 10) {
      const parsed = parse(newValue, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) {
        if (!minDate || parsed >= minDate) {
          onChange(parsed);
          setCalendarMonth(parsed);
        }
      }
    }
  };

  const handleInputBlur = () => {
    if (inputValue.length === 10) {
      const parsed = parse(inputValue, "dd/MM/yyyy", new Date());
      if (isValid(parsed) && (!minDate || parsed >= minDate)) {
        onChange(parsed);
      } else {
        // Reset to current value if invalid
        setInputValue(value ? format(value, "dd/MM/yyyy") : "");
      }
    } else if (inputValue.length === 0) {
      onChange(undefined);
    } else {
      // Reset to current value if incomplete
      setInputValue(value ? format(value, "dd/MM/yyyy") : "");
    }
  };

  const handleMonthChange = (monthStr: string) => {
    const month = parseInt(monthStr, 10);
    setCalendarMonth(setMonth(calendarMonth, month));
  };

  const handleYearChange = (yearStr: string) => {
    const year = parseInt(yearStr, 10);
    setCalendarMonth(setYear(calendarMonth, year));
  };

  const handlePrevMonth = () => {
    const newMonth = getMonth(calendarMonth) - 1;
    if (newMonth < 0) {
      setCalendarMonth(setYear(setMonth(calendarMonth, 11), getYear(calendarMonth) - 1));
    } else {
      setCalendarMonth(setMonth(calendarMonth, newMonth));
    }
  };

  const handleNextMonth = () => {
    const newMonth = getMonth(calendarMonth) + 1;
    if (newMonth > 11) {
      setCalendarMonth(setYear(setMonth(calendarMonth, 0), getYear(calendarMonth) + 1));
    } else {
      setCalendarMonth(setMonth(calendarMonth, newMonth));
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    onChange(date);
    if (date) {
      setInputValue(format(date, "dd/MM/yyyy"));
      setCalendarMonth(date);
    }
    setIsOpen(false);
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
        maxLength={10}
      />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            disabled={disabled}
            className="shrink-0"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 pointer-events-auto" align="end">
          <div className="p-3">
            {/* Month/Year Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={handlePrevMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex gap-2">
                <Select
                  value={getMonth(calendarMonth).toString()}
                  onValueChange={handleMonthChange}
                >
                  <SelectTrigger className="h-8 w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, index) => (
                      <SelectItem key={month} value={index.toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={getYear(calendarMonth).toString()}
                  onValueChange={handleYearChange}
                >
                  <SelectTrigger className="h-8 w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={handleNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <DayPicker
              mode="single"
              selected={value}
              onSelect={handleDateSelect}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              locale={fr}
              disabled={minDate ? (date) => date < minDate : undefined}
              showOutsideDays
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4",
                caption: "hidden",
                caption_label: "hidden",
                nav: "hidden",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                row: "flex w-full mt-2",
                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md",
                day_range_end: "day-range-end",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground",
                day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_hidden: "invisible",
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
