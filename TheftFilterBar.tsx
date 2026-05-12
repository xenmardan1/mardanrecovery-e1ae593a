import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { FILTER_OPTIONS } from "@/lib/filterOptions";

const theftFilterColumns = [
  { key: "Sub Division", label: "Sub Division" },
  { key: "Batch", label: "Batch" },
  { key: "Tariff", label: "Tariff" },
  { key: "Feeder Number", label: "Feeder Number" },
  { key: "Status", label: "Status" },
];

export type TheftFilters = Record<string, string[]>;

interface TheftFilterBarProps {
  filters: TheftFilters;
  onFiltersChange: (filters: TheftFilters) => void;
}

const TheftFilterBar = ({ filters, onFiltersChange }: TheftFilterBarProps) => {
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

  const toggleAllValues = (key: string) => {
    const items = getOptionsFor(key);
    const current = filters[key] || [];
    const allSelected = current.length === items.length;

    const newFilters = { ...filters };
    if (allSelected) {
      delete newFilters[key];
    } else {
      newFilters[key] = items;
    }
    onFiltersChange(newFilters);
  };

  const toggleExpand = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const clearAll = () => {
    onFiltersChange({});
  };

  const hasFilters = Object.keys(filters).length > 0;

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

      <div className="space-y-1">
        {theftFilterColumns.map((col) => {
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
                    <>
                      <label className="flex items-center gap-2 text-xs cursor-pointer py-0.5 border-b pb-1">
                        <Checkbox
                          checked={selected.length === items.length && items.length > 0}
                          onCheckedChange={() => toggleAllValues(col.key)}
                          className="h-3.5 w-3.5"
                        />
                        <span className="text-foreground font-semibold">All</span>
                      </label>
                      {items.map((opt) => (
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
                      ))}
                    </>
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

export default TheftFilterBar;
