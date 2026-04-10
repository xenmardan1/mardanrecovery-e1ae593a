import { Input } from "@/components/ui/input";
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {fields.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label className="text-xs text-muted-foreground">{f.label}</Label>
          <Input value={record[f.key] ?? ""} readOnly className="bg-muted" />
        </div>
      ))}
    </div>
  );
};

export default RecordDetails;
