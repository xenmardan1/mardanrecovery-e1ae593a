import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import TheftFilterBar, { TheftFilters } from "@/components/TheftFilterBar";

const TABLE_NAME = "PESCO ARREAR LIST MARDAN";
const BUCKET = "picture";

interface Props {
  startDate?: string;
  endDate?: string;
  onStartDateChange?: (v: string) => void;
  onEndDateChange?: (v: string) => void;
  onFiltersChange?: (filters: TheftFilters) => void;
}

const TheftDataDownload = ({ startDate: startDateProp, endDate: endDateProp, onStartDateChange, onEndDateChange, onFiltersChange }: Props) => {
  const [startDateLocal, setStartDateLocal] = useState("");
  const [endDateLocal, setEndDateLocal] = useState("");
  const startDate = startDateProp !== undefined ? startDateProp : startDateLocal;
  const endDate = endDateProp !== undefined ? endDateProp : endDateLocal;
  const setStartDate = (v: string) => { onStartDateChange ? onStartDateChange(v) : setStartDateLocal(v); };
  const setEndDate = (v: string) => { onEndDateChange ? onEndDateChange(v) : setEndDateLocal(v); };
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState("");
  const [filters, setFilters] = useState<TheftFilters>({});

  const handleDownload = async () => {
    setDownloading(true);
    setProgress("Fetching theft cases...");
    try {
      const pageSize = 1000;
      let allData: Record<string, any>[] = [];
      let from = 0;

      while (true) {
        let query = supabase
          .from(TABLE_NAME)
          .select("*")
          .not("Payment_Date", "is", null)
          .neq("Payment_Date", "");

        if (startDate) query = query.gte("Payment_Date", startDate);
        if (endDate) query = query.lte("Payment_Date", endDate);

        // Apply theft-specific filters
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
        toast.error("No theft cases found");
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

        setProgress(`Downloading image ${i + 1}/${allData.length}...`);

        let imageDownloaded = false;
        let fileName = "";

        // Try to download image from storage
        try {
          const jpgFileName = `${ref}.jpg`;
          const { data: jpgBlob, error: jpgError } = await supabase.storage
            .from(BUCKET)
            .download(jpgFileName);

          if (!jpgError && jpgBlob) {
            fileName = jpgFileName;
            picturesFolder.file(fileName, jpgBlob);
            imageDownloaded = true;
            imgCount++;
          } else {
            // Try PNG if JPG doesn't exist
            const pngFileName = `${ref}.png`;
            const { data: pngBlob, error: pngError } = await supabase.storage
              .from(BUCKET)
              .download(pngFileName);

            if (!pngError && pngBlob) {
              fileName = pngFileName;
              picturesFolder.file(fileName, pngBlob);
              imageDownloaded = true;
              imgCount++;
            }
          }
        } catch {
          // skip failed image
        }

        const { data: urlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(`${ref}.jpg`);
        const publicUrl = urlData?.publicUrl || "";

        const sLoad = r.S_Load || r["S Load"] || r.S_load || r["Sanctioned Load"] || "";
        const cLoad = r["C/Load"] || r["C Load"] || r.C_Load || r["Connected Load"] || "";
        const reportingOfficer = r["Name of Reporting officer"] || r["Name of Reporting Officer"] || r["Reporting officer"] || r["Reporting Officer Name"] || "";
        const reportingDate = r["Reporting Date"] || r.Reporting_Date || r.reporting_date || "";
        const paymentDate = r["Payment_Date"] || r.payment_date || r.Payment_date || "";
        const method = r.Method || r.method || "";
        const theftPic = r["Theft Pic"] || r["Theft_Pic"] || r.theft_pic || r.Theft_Picture || r["Theft Picture"] || "";
        const media = r.media || r.Media || r.attachment || r.Attachment || "";

        rows.push({
          Reference: r.Reference || "",
          "Sub Division": r["Sub Division"] || "",
          Batch: r.Batch || "",
          Tariff: r.Tariff || "",
          Name: r.Name || "",
          Father: r.Father || "",
          Address: r.Address || "",
          ARREAR: r.ARREAR || "",
          AGE: r.AGE || "",
          Status: r.Status || "",
          "S_Load": sLoad,
          "C/Load": cLoad,
          "Name of Reporting officer": reportingOfficer,
          "Reporting Date": reportingDate,
          "Payment Date": paymentDate,
          Method: method,
          "Theft Pic": theftPic,
          Media: media,
          "Picture File": imageDownloaded && fileName ? `Pictures/${fileName}` : "",
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

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Theft Cases");

      const xlsxData = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const excelName = startDate && endDate
        ? `PESCO_Theft_Cases_${startDate}_to_${endDate}.xlsx`
        : "PESCO_Theft_Cases.xlsx";
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

      toast.success(`Downloaded ${allData.length} theft cases with ${imgCount} images`);
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
          <Label className="text-xs">Payment Start Date</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Payment End Date</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <TheftFilterBar
        filters={filters}
        onFiltersChange={(newFilters) => {
          setFilters(newFilters);
          if (onFiltersChange) onFiltersChange(newFilters);
        }}
      />

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
        {downloading ? "Downloading..." : "Download Theft Cases Progress (ZIP)"}
      </Button>
    </div>
  );
};

export default TheftDataDownload;
