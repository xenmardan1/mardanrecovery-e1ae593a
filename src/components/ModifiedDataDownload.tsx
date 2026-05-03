import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import FilterBar, { Filters } from "@/components/FilterBar";

const TABLE_NAME = "PESCO ARREAR LIST MARDAN";
const BUCKET = "picture";

interface Props {
  variant?: "recovery" | "theft";
}
const ModifiedDataDownload = ({ variant = "recovery" }: Props) => {
  const isTheft = variant === "theft";
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState("");
  const [filters, setFilters] = useState<Filters>({});

  const handleDownload = async () => {
    setDownloading(true);
    setProgress("Fetching records...");
    try {
      const pageSize = 1000;
      let allData: Record<string, any>[] = [];
      let from = 0;

      while (true) {
        let query = supabase
          .from(TABLE_NAME)
          .select("*")
          .not("payment", "is", null)
          .neq("payment", "");

        // Apply filters
        Object.entries(filters).forEach(([key, vals]) => {
          if (vals && vals.length > 0) {
            query = query.in(key, vals);
          }
        });

        const { data, error } = await query.range(from, from + pageSize - 1);

        if (error) {
          toast.error("Download failed: " + error.message);
          setDownloading(false);
          setProgress("");
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
        setProgress("");
        return;
      }

      const zip = new JSZip();
      const picturesFolder = zip.folder("Pictures")!;

      // Download images and build rows
      const rows: Record<string, any>[] = [];
      let imgCount = 0;

      for (let i = 0; i < allData.length; i++) {
        const r = allData[i];
        const ref = r.Reference;
        const fileName = `${ref}.jpg`;
        const { data: urlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(fileName);
        const publicUrl = urlData?.publicUrl || "";

        setProgress(`Downloading image ${i + 1}/${allData.length}...`);

        // Try to fetch the image
        let imageDownloaded = false;
        try {
          const resp = await fetch(publicUrl);
          if (resp.ok) {
            const blob = await resp.blob();
            picturesFolder.file(fileName, blob);
            imageDownloaded = true;
            imgCount++;
          }
        } catch {
          // skip failed image
        }

        rows.push({
          ...r,
          "Picture File": imageDownloaded ? `Pictures/${fileName}` : "",
          "Picture Link": publicUrl,
        });
      }

      setProgress("Creating Excel file...");

      // Build Excel with hyperlinks pointing to local picture files
      const ws = XLSX.utils.json_to_sheet(rows);
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      const headers: string[] = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
        headers.push(cell ? String(cell.v) : "");
      }

      // Make Picture File column a relative hyperlink
      const fileCol = headers.indexOf("Picture File");
      if (fileCol >= 0) {
        for (let r = 1; r <= range.e.r; r++) {
          const addr = XLSX.utils.encode_cell({ r, c: fileCol });
          const cell = ws[addr];
          if (cell && cell.v) {
            cell.l = { Target: cell.v, Tooltip: "Open Picture" };
          }
        }
      }

      // Make Picture Link column a web hyperlink
      const linkCol = headers.indexOf("Picture Link");
      if (linkCol >= 0) {
        for (let r = 1; r <= range.e.r; r++) {
          const addr = XLSX.utils.encode_cell({ r, c: linkCol });
          const cell = ws[addr];
          if (cell && cell.v) {
            cell.l = { Target: cell.v, Tooltip: "Open Online" };
          }
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Modified Records");

      const xlsxData = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const excelName = startDate && endDate
        ? `PESCO_Modified_${startDate}_to_${endDate}.xlsx`
        : "PESCO_Modified_Records.xlsx";
      zip.file(excelName, xlsxData);

      setProgress("Generating ZIP...");
      const zipBlob = await zip.generateAsync({ type: "blob" });

      // Trigger download
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = excelName.replace(".xlsx", ".zip");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${allData.length} records with ${imgCount} images`);
    } catch (err: any) {
      toast.error("Download error: " + err.message);
    }
    setDownloading(false);
    setProgress("");
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">{isTheft ? "Reporting Start Date" : "Start Date"}</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{isTheft ? "Reporting End Date" : "End Date"}</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <FilterBar filters={filters} onFiltersChange={setFilters} />

      {progress && (
        <p className="text-xs text-muted-foreground text-center">{progress}</p>
      )}
      <Button
        onClick={handleDownload}
        disabled={downloading}
        variant="outline"
        className="w-full h-8 text-xs"
      >
        <Download className="mr-1 h-3.5 w-3.5" />
        {downloading ? "Downloading..." : isTheft ? "Download Theft Cases Progress (ZIP)" : "Download Recovery Progress (ZIP)"}
      </Button>
    </div>
  );
};

export default ModifiedDataDownload;
