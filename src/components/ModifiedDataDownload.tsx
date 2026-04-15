import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const TABLE_NAME = "PESCO ARREAR LIST MARDAN";
const BUCKET = "picture";

const ModifiedDataDownload = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const pageSize = 1000;
      let allData: Record<string, any>[] = [];
      let from = 0;

      while (true) {
        const { data, error } = await supabase
          .from(TABLE_NAME)
          .select("*")
          .not("payment", "is", null)
          .neq("payment", "")
          .range(from, from + pageSize - 1);

        if (error) {
          toast.error("Download failed: " + error.message);
          setDownloading(false);
          return;
        }
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        if (data.length < pageSize) break;
        from += pageSize;
      }

      if (allData.length === 0) {
        toast.error("No modified records found");
        setDownloading(false);
        return;
      }

      // Build rows with picture links
      const rows = allData.map((r) => {
        const { data: urlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(`${r.Reference}.jpg`);
        return {
          ...r,
          "Picture Link": urlData?.publicUrl || "",
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);

      // Make Picture Link column clickable hyperlinks
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      const headers = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
        if (cell) headers.push(cell.v);
        else headers.push("");
      }
      const picCol = headers.indexOf("Picture Link");
      if (picCol >= 0) {
        for (let r = 1; r <= range.e.r; r++) {
          const addr = XLSX.utils.encode_cell({ r, c: picCol });
          const cell = ws[addr];
          if (cell && cell.v) {
            cell.l = { Target: cell.v, Tooltip: "Open Picture" };
          }
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Modified Records");

      const fileName = startDate && endDate
        ? `PESCO_Modified_${startDate}_to_${endDate}.xlsx`
        : "PESCO_Modified_Records.xlsx";

      XLSX.writeFile(wb, fileName);
      toast.success(`Downloaded ${allData.length} modified records`);
    } catch (err: any) {
      toast.error("Download error: " + err.message);
    }
    setDownloading(false);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Start Date</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">End Date</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      <Button
        onClick={handleDownload}
        disabled={downloading}
        variant="outline"
        className="w-full h-8 text-xs"
      >
        <Download className="mr-1 h-3.5 w-3.5" />
        {downloading ? "Downloading..." : "Download Modified Data (Excel)"}
      </Button>
    </div>
  );
};

export default ModifiedDataDownload;
