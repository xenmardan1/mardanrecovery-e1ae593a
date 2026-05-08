import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import JSZip from "jszip";

interface TheftRecord {
  Reference?: string;
  "Sub Division"?: string;
  Name?: string;
  Father?: string;
  S_Load?: string;
  "C/Load"?: string;
  "Name of Reporting officer"?: string;
  "Reporting Date"?: string;
  Method?: string;
  "Theft Pic"?: string;
  media?: string;
  Media?: string;
  [key: string]: any;
}

interface Props {
  records: TheftRecord[];
  title: string;
}

const BUCKET = "picture";

const DisplayedDataDownload = ({ records, title }: Props) => {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState("");

  const handleDownload = async () => {
    if (!records || records.length === 0) {
      toast.error("No records to download");
      return;
    }

    setDownloading(true);
    setProgress("Preparing download...");

    try {
      const zip = new JSZip();
      const picturesFolder = zip.folder("Pictures")!;

      // Download images and build rows
      const rows: Record<string, any>[] = [];
      let imgCount = 0;
      let mediaCount = 0;

      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        const ref = r.Reference || "";
        const theftPic = r["Theft Pic"] || r["Theft_Pic"] || "";
        const media = r.media || r.Media || "";

        setProgress(`Processing record ${i + 1}/${records.length}...`);

        let picFileName = "";
        let picLink = "";

        // Download Theft Pic if available
        if (theftPic) {
          try {
            const resp = await fetch(theftPic);
            if (resp.ok) {
              const blob = await resp.blob();
              const ext = theftPic.includes(".jpg") ? ".jpg" : ".png";
              picFileName = `${ref}_theft${ext}`;
              picturesFolder.file(picFileName, blob);
              picLink = `Pictures/${picFileName}`;
              imgCount++;
            }
          } catch {
            // skip failed image
          }
        }

        rows.push({
          Reference: r.Reference || "",
          "Sub Division": r["Sub Division"] || "",
          Name: r.Name || "",
          Father: r.Father || "",
          S_Load: r.S_Load || "",
          "C/Load": r["C/Load"] || "",
          "Name of Reporting Officer": r["Name of Reporting officer"] || "",
          "Reporting Date": r["Reporting Date"] || "",
          Method: r.Method || "",
          "Theft Pic File": picLink,
          "Theft Pic Link": theftPic,
          "Media Link": media,
          "View/Play": media || theftPic ? "✓" : "",
        });

        if (media) mediaCount++;
      }

      setProgress("Creating Excel file...");

      // Build Excel with hyperlinks
      const ws = XLSX.utils.json_to_sheet(rows);
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      const headers: string[] = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
        headers.push(cell ? String(cell.v) : "");
      }

      // Make Theft Pic File column a relative hyperlink
      const picFileCol = headers.indexOf("Theft Pic File");
      if (picFileCol >= 0) {
        for (let r = 1; r <= range.e.r; r++) {
          const addr = XLSX.utils.encode_cell({ r, c: picFileCol });
          const cell = ws[addr];
          if (cell && cell.v) {
            cell.l = { Target: cell.v, Tooltip: "Open Theft Picture" };
          }
        }
      }

      // Make Theft Pic Link column a web hyperlink
      const picLinkCol = headers.indexOf("Theft Pic Link");
      if (picLinkCol >= 0) {
        for (let r = 1; r <= range.e.r; r++) {
          const addr = XLSX.utils.encode_cell({ r, c: picLinkCol });
          const cell = ws[addr];
          if (cell && cell.v) {
            cell.l = { Target: cell.v, Tooltip: "View Theft Picture Online" };
            cell.v = "View Pic";
          }
        }
      }

      // Make Media Link column a web hyperlink
      const mediaCol = headers.indexOf("Media Link");
      if (mediaCol >= 0) {
        for (let r = 1; r <= range.e.r; r++) {
          const addr = XLSX.utils.encode_cell({ r, c: mediaCol });
          const cell = ws[addr];
          if (cell && cell.v) {
            cell.l = { Target: cell.v, Tooltip: "View/Play Media" };
            cell.v = "Play/View";
          }
        }
      }

      // Set column widths
      ws["!cols"] = [
        { wch: 12 }, // Reference
        { wch: 15 }, // Sub Division
        { wch: 20 }, // Name
        { wch: 20 }, // Father
        { wch: 12 }, // S_Load
        { wch: 12 }, // C/Load
        { wch: 20 }, // Name of Reporting Officer
        { wch: 15 }, // Reporting Date
        { wch: 15 }, // Method
        { wch: 12 }, // Theft Pic File
        { wch: 12 }, // Theft Pic Link
        { wch: 12 }, // Media Link
        { wch: 10 }, // View/Play
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Theft Cases");

      const xlsxData = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const timestamp = new Date().toISOString().split("T")[0];
      const excelName = `${title.replace(/\s+/g, "_")}_${timestamp}.xlsx`;
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

      toast.success(`Downloaded ${records.length} records with ${imgCount} images and ${mediaCount} media files`);
    } catch (err: any) {
      toast.error("Download error: " + err.message);
    }
    setDownloading(false);
    setProgress("");
  };

  return (
    <div className="space-y-2">
      {progress && (
        <p className="text-xs text-muted-foreground text-center">{progress}</p>
      )}
      <Button
        onClick={handleDownload}
        disabled={downloading}
        variant="outline"
        size="sm"
        className="w-full h-8 text-xs border-primary/30 hover:bg-primary/10 hover:text-primary"
      >
        <Download className="mr-1 h-3.5 w-3.5" />
        {downloading ? "Downloading..." : "Download as ZIP (Excel + Pictures)"}
      </Button>
    </div>
  );
};

export default DisplayedDataDownload;
