import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, ChevronDown, ChevronUp } from "lucide-react";
import { FILTER_OPTIONS } from "@/lib/filterOptions";

interface TableColumnFilterProps {
  columnKey: string;
  columnLabel: string;
  selectedValues: string[];
  onValuesChange: (values: string[]) => void;
}

const TableColumnFilter = ({
  columnKey,
  columnLabel,
  selectedValues,
  onValuesChange,
}: TableColumnFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const getOptionsFor = (colKey: string): string[] => {
    return FILTER_OPTIONS[colKey as keyof typeof FILTER_OPTIONS] || [];
  };

  const options = getOptionsFor(columnKey);

  const toggleValue = (value: string) => {
    const next = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];
    onValuesChange(next);
  };

  const toggleAllValues = () => {
    const allSelected = selectedValues.length === options.length;
    onValuesChange(allSelected ? [] : options);
  };

  const isAllSelected = selectedValues.length === options.length && options.length > 0;

  return (
    <div className="relative inline-block">
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`h-6 px-1.5 text-xs hover:bg-accent/50 gap-1 ${selectedValues.length > 0 ? "text-primary font-semibold" : ""}`}
        title={`Filter ${columnLabel}`}
      >
        <Filter className={`h-3 w-3`} />
        {isOpen ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-[100] min-w-[180px]">
          <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
            {options.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1 px-2">No options</p>
            ) : (
              <>
                <label className="flex items-center gap-2 text-xs cursor-pointer py-0.5 px-2 hover:bg-accent/50 rounded">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={toggleAllValues}
                    className="h-3.5 w-3.5"
                  />
                  <span className="font-semibold">All</span>
                </label>
                {options.map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-2 text-xs cursor-pointer py-0.5 px-2 hover:bg-accent/50 rounded"
                  >
                    <Checkbox
                      checked={selectedValues.includes(opt)}
                      onCheckedChange={() => toggleValue(opt)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="truncate text-foreground">{opt}</span>
                  </label>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TableColumnFilter;
