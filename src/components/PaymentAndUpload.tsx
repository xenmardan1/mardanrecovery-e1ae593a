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
import { Save, Upload, Image, ZoomIn, ZoomOut, X, Calendar as CalendarIcon, Camera } from "lucide-react";
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

const PaymentAndUpload = ({ record, onUpdated }: Props) => {
  const [payment, setPayment] = useState(record.payment ?? "");
  const [paymentMode, setPaymentMode] = useState(record["payment mode"] ?? "");
  const [paymentDate, setPaymentDate] = useState(record.Payment_Date ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const camRef = useRef<HTMLInputElement>(null);

  // Reset when record changes
  useEffect(() => {
    setPayment(record.payment ?? "");
    setPaymentMode(record["payment mode"] ?? "");
    setPaymentDate(record.Payment_Date ?? "");
    setFile(null);
  }, [record.Reference]);

  // Load existing image — try common extensions
  useEffect(() => {
    let cancelled = false;
    setImageUrl(null);
    const exts = ["jpg", "jpeg", "png", "webp"];
    (async () => {
      for (const ext of exts) {
        const { data } = supabase.storage
          .from("picture")
          .getPublicUrl(`${record.Reference}.${ext}`);
        if (!data?.publicUrl) continue;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(data.publicUrl, { method: "HEAD", signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) {
            if (!cancelled) setImageUrl(data.publicUrl);
            return;
          }
        } catch (err) {
          // Network error or timeout, try next extension
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [record.Reference]);

  const isPaymentDateFilledInDb = !!record.Payment_Date;
  const arePaymentFieldsFilled = !!(payment && paymentMode && paymentDate);
  const isPictureSelected = !!file;
  const isPaymentButtonDisabled = isPaymentDateFilledInDb || !arePaymentFieldsFilled || !isPictureSelected;
  const areAllFieldsDisabled = isPaymentDateFilledInDb;

  const handleSave = async () => {
    setSaving(true);

    // Update payment
    const { error: dbError } = await supabase
      .from(TABLE_NAME)
      .update({ payment, "payment mode": paymentMode, Payment_Date: paymentDate || null })
      .eq("Reference", record.Reference);

    if (dbError) {
      toast.error("Payment update failed: " + dbError.message);
      setSaving(false);
      return;
    }

    // Upload picture if selected
    if (file) {
      const ext = file.name.split(".").pop();
      const filePath = `${record.Reference}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("picture")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        toast.error("Picture upload failed: " + uploadError.message);
        setSaving(false);
        return;
      }

      const { data } = supabase.storage.from("picture").getPublicUrl(filePath);
      setImageUrl(data.publicUrl);

      const { error: picDbError } = await supabase
        .from(TABLE_NAME)
        .update({ Picture: data.publicUrl })
        .eq("Reference", record.Reference);

      if (picDbError) {
        toast.error("Saving picture URL failed: " + picDbError.message);
        setSaving(false);
        return;
      }
    }

    toast.success("Saved successfully!");
    onUpdated();
    setSaving(false);
  };

  return (
    <div className="space-y-4 form-3d">
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Payment Amount</Label>
          <Input
            type="number"
            placeholder="Enter amount"
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
            disabled={areAllFieldsDisabled}
            className="input-3d"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Payment Mode</Label>
          <Select value={paymentMode} onValueChange={setPaymentMode} disabled={areAllFieldsDisabled}>
            <SelectTrigger>
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Full Payment">Full Payment</SelectItem>
              <SelectItem value="Partial Payment">Partial Payment</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Payment Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={areAllFieldsDisabled}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !paymentDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {paymentDate && isValid(parseISO(paymentDate))
                  ? format(parseISO(paymentDate), "PPP")
                  : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={paymentDate && isValid(parseISO(paymentDate)) ? parseISO(paymentDate) : undefined}
                onSelect={(d) => setPaymentDate(d ? format(d, "yyyy-MM-dd") : "")}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Picture</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Choose File</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={areAllFieldsDisabled}
                className="text-sm input-3d"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Take Photo</Label>
              <input
                ref={camRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                disabled={areAllFieldsDisabled}
                className="w-full"
                onClick={() => camRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {file && (
            <p className="text-[11px] text-muted-foreground truncate">Selected: {file.name}</p>
          )}
        </div>
      </div>

      {imageUrl && (
        <div className="space-y-1">
          <Label className="text-xs">Current Picture (tap to zoom)</Label>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setZoomOpen(true);
            }}
            className="block w-full rounded-lg overflow-hidden border border-border hover:opacity-90 transition-opacity cursor-zoom-in"
          >
            <img
              src={imageUrl}
              alt="Reference"
              className="w-full h-auto max-h-48 object-cover"
            />
          </button>
        </div>
      )}

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-4xl w-[95vw] p-2 sm:p-4">
          <DialogTitle className="sr-only">Picture Preview</DialogTitle>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setZoom((z) => Math.max(0.05, +(z - 0.05).toFixed(2)))}
              disabled={zoom <= 0.05}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setZoom((z) => Math.min(4, +(z + 0.05).toFixed(2)))}
              disabled={zoom >= 4}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          <div className="overflow-auto max-h-[75vh] rounded-md bg-muted/30">
            <img
              src={imageUrl ?? ""}
              alt="Reference zoomed"
              style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
              className="transition-transform duration-150 max-w-none"
            />
          </div>
        </DialogContent>
      </Dialog>


      <Button
        onClick={handleSave}
        disabled={saving || isPaymentButtonDisabled}
        className="w-full button-3d"
        title={isPaymentDateFilledInDb ? "Payment Date already filled in database" : !arePaymentFieldsFilled ? "Please fill all payment fields" : !isPictureSelected ? "Please choose or take a picture" : ""}
      >
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Saving..." : isPaymentDateFilledInDb ? "Payment Already Saved" : "Save All"}
      </Button>
    </div>
  );
};

export default PaymentAndUpload;
