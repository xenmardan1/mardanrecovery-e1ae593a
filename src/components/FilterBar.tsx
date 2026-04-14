import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

const TABLE_NAME = "PESCO ARREAR LIST MARDAN";

const filterColumns = [
  { key: "Sub Division", label: "Sub Division" },
  { key: "Batch", label: "Batch" },
  { key: "Tariff", label: "Tariff" },
  { key: "Feeder Name", label: "Feeder Name" },
  { key: "Status", label: "Status" },
];

export type Filters = Record<string, string>;

interface FilterBarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

const FilterBar = ({ filters, onFiltersChange }: FilterBarProps) => {
  const [options, setOptions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const fetchOptions = async () => {
      const results: Record<string, string[]> = {};
      await Promise.all(
        filterColumns.map(async (col) => {
          const { data } = await supabase
            .from(TABLE_NAME)
            .select(col.key)
            .not(col.key, "is", null)
            .order(col.key, { ascending: true });

          if (data) {
            const unique = [...new Set(data.map((r: any) => String(r[col.key])).filter(Boolean))];
            results[col.key] = unique;
          }
        })
      );
      setOptions(results);
    };
    fetchOptions();
  }, []);

  const handleChange = (key: string, value: string) => {
    const next = { ...filters };
    if (value === "__all__") {
      delete next[key];
    } else {
      next[key] = value;
    }
    onFiltersChange(next);
  };

  const clearAll = () => onFiltersChange({});
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
            Clear
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {filterColumns.map((col) => (
          <Select
            key={col.key}
            value={filters[col.key] || "__all__"}
            onValueChange={(v) => handleChange(col.key, v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={col.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All {col.label}</SelectItem>
              {(options[col.key] || []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>
    </div>
  );
};

export default FilterBar;
