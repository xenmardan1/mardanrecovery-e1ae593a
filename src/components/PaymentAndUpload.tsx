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
import { Save, Upload, Image, ZoomIn, ZoomOut, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface Props {
  record: Record<string, any>;
  onUpdated: () => void;
}

const TABLE_NAME = "PESCO ARREAR LIST MARDAN";

const PaymentAndUpload = ({ record, onUpdated }: Props) => {
  const [payment, setPayment] = useState(record.payment ?? "");
  const [paymentMode, setPaymentMode] = useState(record["payment mode"] ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Reset when record changes
  useEffect(() => {
    setPayment(record.payment ?? "");
    setPaymentMode(record["payment mode"] ?? "");
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
          const res = await fetch(data.publicUrl, { method: "HEAD" });
          if (res.ok) {
            if (!cancelled) setImageUrl(data.publicUrl);
            return;
          }
        } catch {
          // try next
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [record.Reference]);

  const handleSave = async () => {
    setSaving(true);

    // Update payment
    const { error: dbError } = await supabase
      .from(TABLE_NAME)
      .update({ payment, "payment mode": paymentMode })
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
    }

    toast.success("Saved successfully!");
    onUpdated();
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Payment Amount</Label>
          <Input
            type="number"
            placeholder="Enter amount"
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Payment Mode</Label>
          <Select value={paymentMode} onValueChange={setPaymentMode}>
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
          <Label className="text-xs">Picture</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
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
          <div className="flex items-center justify-end gap-2 mb-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
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
        disabled={saving || !!(record.payment && String(record.payment).trim() !== "")}
        className="w-full"
      >
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Saving..." : record.payment && String(record.payment).trim() !== "" ? "Already Modified" : "Save All"}
      </Button>
    </div>
  );
};

export default PaymentAndUpload;
