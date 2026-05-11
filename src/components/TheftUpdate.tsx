import { useState, useEffect, useRef } from "react";
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
import { Save, Calendar as CalendarIcon, Camera, Video, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
  const theftCamRef = useRef<HTMLInputElement>(null);
  const mediaCamRef = useRef<HTMLInputElement>(null);
  const [theftPreview, setTheftPreview] = useState<string | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [zoomKind, setZoomKind] = useState<"image" | "video">("image");
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!theftPicFile) { setTheftPreview(null); return; }
    const url = URL.createObjectURL(theftPicFile);
    setTheftPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [theftPicFile]);

  useEffect(() => {
    if (!mediaFile) { setMediaPreview(null); return; }
    const url = URL.createObjectURL(mediaFile);
    setMediaPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [mediaFile]);

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

  const isReportingDateFilledInDb = !!record["Reporting Date"];
  const areTheftFieldsFilled = !!(cLoad && method && reportingDate && officer);
  const isTheftPictureSelected = !!theftPicFile;
  const isTheftButtonDisabled = isReportingDateFilledInDb || !areTheftFieldsFilled || !isTheftPictureSelected;
  const areAllTheftFieldsDisabled = isReportingDateFilledInDb;

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
        <Input
          value={cLoad}
          onChange={(e) => setCLoad(e.target.value)}
          placeholder="Enter connected load"
          disabled={areAllTheftFieldsDisabled}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Method</Label>
        <Select value={method} onValueChange={setMethod} disabled={areAllTheftFieldsDisabled}>
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
              disabled={areAllTheftFieldsDisabled}
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
        <Input
          value={officer}
          onChange={(e) => setOfficer(e.target.value)}
          placeholder="Officer name"
          disabled={areAllTheftFieldsDisabled}
        />
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
              disabled={areAllTheftFieldsDisabled}
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Take Photo</Label>
            <input
              ref={theftCamRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setTheftPicFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              disabled={areAllTheftFieldsDisabled}
              className="w-full"
              onClick={() => theftCamRef.current?.click()}
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {theftPicFile && (
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground truncate">Selected: {theftPicFile.name}</p>
            {theftPreview && (
              <button
                type="button"
                onClick={() => { setZoom(1); setZoomKind("image"); setZoomSrc(theftPreview); }}
                className="block w-full rounded-lg overflow-hidden border border-border hover:opacity-90 cursor-zoom-in"
              >
                <img src={theftPreview} alt="Theft preview" className="w-full h-auto max-h-48 object-cover" />
              </button>
            )}
          </div>
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
              disabled={areAllTheftFieldsDisabled}
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Record</Label>
            <input
              ref={mediaCamRef}
              type="file"
              accept="video/*"
              capture="environment"
              onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              disabled={areAllTheftFieldsDisabled}
              className="w-full"
              onClick={() => mediaCamRef.current?.click()}
            >
              <Video className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {mediaFile && (
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground truncate">Selected: {mediaFile.name}</p>
            {mediaPreview && (mediaFile.type.startsWith("video") ? (
              <button
                type="button"
                onClick={() => { setZoom(1); setZoomKind("video"); setZoomSrc(mediaPreview); }}
                className="block w-full rounded-lg overflow-hidden border border-border hover:opacity-90 cursor-zoom-in"
              >
                <video src={mediaPreview} className="w-full h-auto max-h-48 object-cover" muted />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setZoom(1); setZoomKind("image"); setZoomSrc(mediaPreview); }}
                className="block w-full rounded-lg overflow-hidden border border-border hover:opacity-90 cursor-zoom-in"
              >
                <img src={mediaPreview} alt="Media preview" className="w-full h-auto max-h-48 object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!zoomSrc} onOpenChange={(o) => !o && setZoomSrc(null)}>
        <DialogContent className="max-w-4xl w-[95vw] p-2 sm:p-4">
          <DialogTitle className="sr-only">Preview</DialogTitle>
          {zoomKind === "image" && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <Button size="icon" variant="outline" onClick={() => setZoom((z) => Math.max(0.05, +(z - 0.1).toFixed(2)))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
              <Button size="icon" variant="outline" onClick={() => setZoom((z) => Math.min(4, +(z + 0.1).toFixed(2)))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="overflow-auto max-h-[75vh] rounded-md bg-muted/30">
            {zoomSrc && zoomKind === "image" ? (
              <img
                src={zoomSrc}
                alt="Zoomed"
                style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
                className="transition-transform duration-150 max-w-none"
              />
            ) : zoomSrc && (
              <video src={zoomSrc} controls autoPlay className="w-full max-h-[75vh]" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Button
        onClick={handleSave}
        disabled={saving || isTheftButtonDisabled}
        className="w-full"
        title={isReportingDateFilledInDb ? "Reporting Date already filled in database" : !areTheftFieldsFilled ? "Please fill all theft fields" : !isTheftPictureSelected ? "Please select a theft picture" : ""}
      >
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Saving..." : isReportingDateFilledInDb ? "Theft Already Saved" : "Save Theft Details"}
      </Button>
    </div>
  );
};

export default TheftUpdate;
