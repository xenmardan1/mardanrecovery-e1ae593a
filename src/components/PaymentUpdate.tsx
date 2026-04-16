import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface PaymentUpdateProps {
  record: Record<string, any>;
  onUpdated: () => void;
}

const TABLE_NAME = "PESCO ARREAR LIST MARDAN";

const PaymentUpdate = ({ record, onUpdated }: PaymentUpdateProps) => {
  const [payment, setPayment] = useState(record.payment ?? "");
  const [paymentMode, setPaymentMode] = useState(record["payment mode"] ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from(TABLE_NAME)
      .update({ payment, "payment mode": paymentMode })
      .eq("Reference", record.Reference);

    if (error) {
      toast.error("Update failed: " + error.message);
    } else {
      toast.success("Payment updated successfully!");
      onUpdated();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Update Payment</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Payment Amount</Label>
          <Input
            type="number"
            placeholder="Enter payment amount"
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Payment Mode</Label>
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
      </div>
      <Button onClick={handleSave} disabled={saving}>
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Saving..." : "Save Payment"}
      </Button>
    </div>
  );
};

export default PaymentUpdate;
