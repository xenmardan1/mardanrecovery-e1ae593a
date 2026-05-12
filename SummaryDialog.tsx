import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BarChart3 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const TABLE_NAME = "PESCO ARREAR LIST MARDAN";

interface Row {
  subDivision: string;
  total: number;
  modified: number;
  notModified: number;
}

interface Props {
  variant?: "recovery" | "theft";
}

const SummaryDialog = ({ variant = "recovery" }: Props) => {
  const isTheft = variant === "theft";
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  const loadSummary = async () => {
    setLoading(true);
    setRows([]);
    try {
      const pageSize = 1000;
      const counts = new Map<string, { total: number; modified: number }>();
      let from = 0;

      const selectCols = isTheft
        ? '"Sub Division", "Reporting Date"'
        : '"Sub Division", payment';

      while (true) {
        const { data, error } = await supabase
          .from(TABLE_NAME)
          .select(selectCols)
          .range(from, from + pageSize - 1);

        if (error) {
          toast.error("Failed: " + error.message);
          setLoading(false);
          return;
        }
        if (!data || data.length === 0) break;

        for (const r of data as any[]) {
          const sd = String(r["Sub Division"] ?? "Unknown");
          const flagVal = isTheft ? r["Reporting Date"] : r.payment;
          const isFlagged = flagVal !== null && flagVal !== "" && flagVal !== undefined;
          const cur = counts.get(sd) ?? { total: 0, modified: 0 };
          cur.total += 1;
          if (isFlagged) cur.modified += 1;
          counts.set(sd, cur);
        }

        if (data.length < pageSize) break;
        from += pageSize;
      }

      const result: Row[] = Array.from(counts.entries())
        .map(([subDivision, v]) => ({
          subDivision,
          total: v.total,
          modified: v.modified,
          notModified: v.total - v.modified,
        }))
        .sort((a, b) => a.subDivision.localeCompare(b.subDivision));

      setRows(result);
    } catch (e: any) {
      toast.error("Error: " + e.message);
    }
    setLoading(false);
  };

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (o && rows.length === 0) loadSummary();
  };

  const totals = rows.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      modified: acc.modified + r.modified,
      notModified: acc.notModified + r.notModified,
    }),
    { total: 0, modified: 0, notModified: 0 }
  );

  const modifiedLabel = isTheft ? "Theft" : "Modified";
  const pendingLabel = isTheft ? "No Theft" : "Pending";
  const title = isTheft ? "Sub Division Theft Summary" : "Sub Division Recovery Summary";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs border-primary/30 hover:bg-primary/10 hover:text-primary transition-all"
        >
          <BarChart3 className="mr-1 h-3.5 w-3.5" />
          Summary
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm text-primary">
            {title}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            Loading summary...
          </p>
        ) : (
          <div className="overflow-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/70 sticky top-0">
                <tr className="text-left">
                  <th className="px-2 py-1.5 font-semibold">Sub Division</th>
                  <th className="px-2 py-1.5 font-semibold text-right">Total</th>
                  <th className="px-2 py-1.5 font-semibold text-right text-green-600">{modifiedLabel}</th>
                  <th className="px-2 py-1.5 font-semibold text-right text-orange-600">{pendingLabel}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.subDivision} className="border-t border-border">
                    <td className="px-2 py-1.5 font-medium">{r.subDivision}</td>
                    <td className="px-2 py-1.5 text-right">{r.total}</td>
                    <td className="px-2 py-1.5 text-right text-green-600">{r.modified}</td>
                    <td className="px-2 py-1.5 text-right text-orange-600">{r.notModified}</td>
                  </tr>
                ))}
                {rows.length > 0 && (
                  <tr className="border-t-2 border-primary/40 bg-muted/50 font-semibold">
                    <td className="px-2 py-1.5">Total</td>
                    <td className="px-2 py-1.5 text-right">{totals.total}</td>
                    <td className="px-2 py-1.5 text-right text-green-600">{totals.modified}</td>
                    <td className="px-2 py-1.5 text-right text-orange-600">{totals.notModified}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SummaryDialog;
