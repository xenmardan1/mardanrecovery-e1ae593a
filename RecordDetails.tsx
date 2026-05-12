import { Label } from "@/components/ui/label";

interface RecordDetailsProps {
  record: Record<string, any>;
}

const fields = [
  { key: "Reference", label: "Reference" },
  { key: "Sub Division", label: "Sub Division" },
  { key: "Batch", label: "Batch" },
  { key: "Tariff", label: "Tariff" },
  { key: "S_Load", label: "Sanction Load" },
  { key: "Meter NO.", label: "Meter No." },
  { key: "Feeder Name", label: "Feeder Name" },
  { key: "Feeder Number", label: "Feeder Number" },
  { key: "Name", label: "Name" },
  { key: "Father", label: "Father" },
  { key: "Address", label: "Address" },
  { key: "Mobile_Number", label: "Mobile Number" },
  { key: "ARREAR", label: "Arrear" },
  { key: "AGE", label: "Age" },
  { key: "Status", label: "Status" },
];

const RecordDetails = ({ record }: RecordDetailsProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {fields.map((f) => (
        <div
          key={f.key}
          className="flex items-baseline gap-2 py-1.5 px-2 rounded bg-muted/50 text-sm"
        >
          <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[80px]">
            {f.label}:
          </span>
          <span className="font-medium text-foreground truncate">
            {record[f.key] ?? "—"}
          </span>
        </div>
      ))}
    </div>
  );
};

export default RecordDetails;
