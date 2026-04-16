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
import { Save, Upload, Image } from "lucide-react";

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

  // Reset when record changes
  useEffect(() => {
    setPayment(record.payment ?? "");
    setPaymentMode(record["payment mode"] ?? "");
    setFile(null);
  }, [record.Reference]);

  // Load existing image
  useEffect(() => {
    const { data } = supabase.storage
      .from("picture")
      .getPublicUrl(`${record.Reference}.jpg`);
    if (data?.publicUrl) {
      fetch(data.publicUrl, { method: "HEAD" })
        .then((res) => {
          if (res.ok) setImageUrl(data.publicUrl);
          else setImageUrl(null);
        })
        .catch(() => setImageUrl(null));
    }
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
        <div className="rounded-lg overflow-hidden border border-border">
          <img
            src={imageUrl}
            alt="Reference"
            className="w-full h-auto max-h-48 object-cover"
          />
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Saving..." : "Save All"}
      </Button>
    </div>
  );
};

export default PaymentAndUpload;
