import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Save, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
  record: Record<string, any>;
  onUpdated: () => void;
}

const TABLE_NAME = "PESCO ARREAR LIST MARDAN";

const TheftUpdate = ({ record, onUpdated }: Props) => {
  const [cLoad, setCLoad] = useState(record["C/Load"] ?? "");
  const [method, setMethod] = useState(record.Method ?? "");
  const [reportingDate, setReportingDate] = useState(record["Reporting Date"] ?? "");
  const [officer, setOfficer] = useState(record["Name of Reporting officer"] ?? "");
  const [theftPicFile, setTheftPicFile] = useState<File | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCLoad(record["C/Load"] ?? "");
    setMethod(record.Method ?? "");
    setReportingDate(record["Reporting Date"] ?? "");
    setOfficer(record["Name of Reporting officer"] ?? "");
    setTheftPicFile(null);
    setMediaFile(null);
  }, [record.Reference]);

  const uploadTo = async (bucket: string, file: File, prefix: string) => {
    const ext = file.name.split(".").pop();
    const path = `${prefix}_${record.Reference}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Record<string, any> = {
        "C/Load": cLoad,
        Method: method,
        "Reporting Date": reportingDate || null,
        "Name of Reporting officer": officer,
      };

      if (theftPicFile) {
        try {
          updates["Theft Pic"] = await uploadTo("picture", theftPicFile, "theft");
        } catch (e: any) {
          toast.error("Theft picture upload failed: " + e.message);
          setSaving(false);
          return;
        }
      }
      if (mediaFile) {
        try {
          updates["media"] = await uploadTo("picture", mediaFile, "media");
        } catch (e: any) {
          toast.error("Media upload failed: " + e.message);
          setSaving(false);
          return;
        }
      }

      const { error } = await supabase
        .from(TABLE_NAME)
        .update(updates)
        .eq("Reference", record.Reference);

      if (error) {
        toast.error("Update failed: " + error.message);
        setSaving(false);
        return;
      }

      toast.success("Theft details saved!");
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">C/Load</Label>
        <Input value={cLoad} onChange={(e) => setCLoad(e.target.value)} placeholder="Enter connected load" />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Method</Label>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger>
            <SelectValue placeholder="Select method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Direct">Direct</SelectItem>
            <SelectItem value="Bypass">Bypass</SelectItem>
            <SelectItem value="Tampered Meter">Tampered Meter</SelectItem>
            <SelectItem value="Reverse">Reverse</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Reporting Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !reportingDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {reportingDate && isValid(parseISO(reportingDate))
                ? format(parseISO(reportingDate), "PPP")
                : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={reportingDate && isValid(parseISO(reportingDate)) ? parseISO(reportingDate) : undefined}
              onSelect={(d) => setReportingDate(d ? format(d, "yyyy-MM-dd") : "")}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Name of Reporting officer</Label>
        <Input value={officer} onChange={(e) => setOfficer(e.target.value)} placeholder="Officer name" />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Theft Picture</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Choose File</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setTheftPicFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Take Photo</Label>
            <Input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setTheftPicFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </div>
        </div>
        {theftPicFile && (
          <p className="text-[11px] text-muted-foreground truncate">Selected: {theftPicFile.name}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Media (image/video)</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Choose File</Label>
            <Input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Record</Label>
            <Input
              type="file"
              accept="image/*,video/*"
              capture="environment"
              onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </div>
        </div>
        {mediaFile && (
          <p className="text-[11px] text-muted-foreground truncate">Selected: {mediaFile.name}</p>
        )}
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Saving..." : "Save Theft Details"}
      </Button>
    </div>
  );
};

export default TheftUpdate;
