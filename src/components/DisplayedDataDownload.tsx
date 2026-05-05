import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import JSZip from "jszip";

interface ArrearRecord {
  Reference?: string;
  Name?: string;
  ARREAR?: number;
  payment?: number;
  Payment_Date?: string;
  Picture?: string;
  [key: string]: any;
}

interface Props {
  records: ArrearRecord[];
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

      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        const ref = r.Reference;
        const fileName = `${ref}.jpg`;
        const { data: urlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(fileName);
        const publicUrl = urlData?.publicUrl || "";

        setProgress(`Downloading image ${i + 1}/${records.length}...`);

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
          Reference: r.Reference,
          Name: r.Name || "",
          Arrear: r.ARREAR || "",
          Payment: r.payment || "",
          "Payment Date": r.Payment_Date || "",
          "Picture File": imageDownloaded ? `Pictures/${fileName}` : "",
          "Picture Link": publicUrl,
        });
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
      XLSX.utils.book_append_sheet(wb, ws, "Results");

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

      toast.success(`Downloaded ${records.length} records with ${imgCount} images`);
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
