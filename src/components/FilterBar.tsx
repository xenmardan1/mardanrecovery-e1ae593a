import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { FILTER_OPTIONS } from "@/lib/filterOptions";

const filterColumns = [
  { key: "Sub Division", label: "Sub Division" },
  { key: "Batch", label: "Batch" },
  { key: "Tariff", label: "Tariff" },
  { key: "Feeder Number", label: "Feeder Number" },
  { key: "Status", label: "Status" },
];

export type Filters = Record<string, string[]>;

interface FilterBarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  minArrear?: number;
  onMinArrearChange?: (value: number) => void;
}

const FilterBar = ({ filters, onFiltersChange, minArrear = 0, onMinArrearChange }: FilterBarProps) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const getOptionsFor = (colKey: string): string[] => {
    return FILTER_OPTIONS[colKey as keyof typeof FILTER_OPTIONS] || [];
  };

  const toggleValue = (key: string, value: string) => {
    const current = filters[key] || [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    const newFilters = { ...filters };
    if (next.length === 0) {
      delete newFilters[key];
    } else {
      newFilters[key] = next;
    }
    onFiltersChange(newFilters);
  };

  const toggleExpand = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const clearAll = () => {
    onFiltersChange({});
    if (onMinArrearChange) onMinArrearChange(0);
  };
  const hasFilters = Object.keys(filters).length > 0 || minArrear > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Filters
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-6 text-xs px-2">
            <X className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <div className="border border-border rounded-md px-3 py-2">
          <Label className="text-xs font-medium text-foreground mb-1 block">Minimum Arrear</Label>
          <Input
            type="number"
            placeholder="Enter minimum amount"
            value={minArrear}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value) : 0;
              if (onMinArrearChange) onMinArrearChange(val);
            }}
            className="text-xs h-8"
          />
        </div>
      </div>

      <div className="space-y-1">
        {filterColumns.map((col) => {
          const isOpen = expanded[col.key] || false;
          const selected = filters[col.key] || [];
          const items = getOptionsFor(col.key);

          return (
            <div key={col.key} className="border border-border rounded-md">
              <button
                onClick={() => toggleExpand(col.key)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-foreground hover:bg-accent/50 transition-colors rounded-md"
              >
                <span>
                  {col.label}
                  {selected.length > 0 && (
                    <span className="ml-1.5 text-primary">({selected.length})</span>
                  )}
                </span>
                {isOpen ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>

              {isOpen && (
                <div className="px-3 pb-2 max-h-36 overflow-y-auto space-y-1">
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-1">No options</p>
                  ) : (
                    items.map((opt) => (
                      <label
                        key={opt}
                        className="flex items-center gap-2 text-xs cursor-pointer py-0.5"
                      >
                        <Checkbox
                          checked={selected.includes(opt)}
                          onCheckedChange={() => toggleValue(col.key, opt)}
                          className="h-3.5 w-3.5"
                        />
                        <span className="text-foreground truncate">{opt}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FilterBar;
