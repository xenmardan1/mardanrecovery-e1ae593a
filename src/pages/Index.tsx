import { useState, useCallback } from "react";
import pescoLogo from "@/assets/pesco-logo.png";
import { supabase } from "@/lib/supabase";
import SearchBar from "@/components/SearchBar";
import FilterBar, { Filters } from "@/components/FilterBar";
import RecordDetails from "@/components/RecordDetails";
import PaymentAndUpload from "@/components/PaymentAndUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Download, ArrowLeft } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import ModifiedDataDownload from "@/components/ModifiedDataDownload";
import SummaryDialog from "@/components/SummaryDialog";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const TABLE_NAME = "PESCO ARREAR LIST MARDAN";

type View = "home" | "arrears" | "recovery" | "theft";

const Index = () => {
  const [view, setView] = useState<View>("home");
  const [records, setRecords] = useState<Record<string, any>[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>({});

  const handleSearch = useCallback(async (reference: string) => {
    setLoading(true);
    setRecords([]);
    setSelectedRecord(null);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .eq("Reference", reference)
      .maybeSingle();

    if (error) {
      toast.error("Search failed: " + error.message);
    } else if (!data) {
      toast.warning("No record found for reference: " + reference);
    } else {
      setRecords([data]);
      setSelectedRecord(data);
    }
    setLoading(false);
  }, []);

  const handleFilterChange = useCallback(async (newFilters: Filters) => {
    setFilters(newFilters);
    setSelectedRecord(null);

    const keys = Object.keys(newFilters);
    if (keys.length === 0) {
      setRecords([]);
      return;
    }

    setLoading(true);
    let query = supabase.from(TABLE_NAME).select("*");
    keys.forEach((key) => {
      const values = newFilters[key];
      if (values.length === 1) {
        query = query.eq(key, values[0]);
      } else {
        query = query.in(key, values);
      }
    });
    // Fetch all matching records in pages of 1000
    const pageSize = 1000;
    let allData: Record<string, any>[] = [];
    let from = 0;
    let error: any = null;
    while (true) {
      let pageQuery = supabase.from(TABLE_NAME).select("*").range(from, from + pageSize - 1);
      keys.forEach((key) => {
        const values = newFilters[key];
        if (values.length === 1) pageQuery = pageQuery.eq(key, values[0]);
        else pageQuery = pageQuery.in(key, values);
      });
      const { data: page, error: pageErr } = await pageQuery;
      if (pageErr) { error = pageErr; break; }
      if (!page || page.length === 0) break;
      allData = allData.concat(page);
      if (page.length < pageSize) break;
      from += pageSize;
    }
    const data = allData;
    if (error) {
      toast.error("Filter failed: " + error.message);
    } else {
      setRecords(data || []);
      if (data && data.length === 1) setSelectedRecord(data[0]);
      else if (data && data.length === 0) toast.info("No records match the selected filters");
      else toast.success(`Found ${data?.length} records`);
    }
    setLoading(false);
  }, []);

  const refreshRecord = useCallback(() => {
    if (selectedRecord?.Reference) handleSearch(selectedRecord.Reference);
  }, [selectedRecord, handleSearch]);

  const openMap = () => {
    if (!selectedRecord) return;
    const lat = selectedRecord.Latitude;
    const lng = selectedRecord.Longitude;
    if (!lat || !lng) {
      toast.error("No location data available for this record");
      return;
    }
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  const downloadExcel = useCallback(async () => {
    toast.info("Fetching all records…");

    const keys = Object.keys(filters);
    const pageSize = 1000;
    let allData: Record<string, any>[] = [];
    let from = 0;

    while (true) {
      let query = supabase.from(TABLE_NAME).select("*").range(from, from + pageSize - 1);
      keys.forEach((key) => {
        const values = filters[key];
        if (values.length === 1) query = query.eq(key, values[0]);
        else query = query.in(key, values);
      });
      const { data, error } = await query;
      if (error) {
        toast.error("Download failed: " + error.message);
        return;
      }
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    if (allData.length === 0) {
      toast.error("No records to download");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(allData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Arrears");
    XLSX.writeFile(wb, "PESCO_Arrears_Data.xlsx");
    toast.success(`Downloaded ${allData.length} records`);
  }, [filters]);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <header className="header-gradient sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-4 flex flex-col items-center text-center max-w-2xl mx-auto">
          <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-sm p-1 mb-2 shadow-md">
            <img src={pescoLogo} alt="PESCO Logo" className="h-full w-full rounded-full object-contain" />
          </div>
          <h1 className="text-lg font-bold text-white drop-shadow-sm">
            PESCO MARDAN CIRCLE RECOVERY APPLICATION
          </h1>
          <div className="mt-2">
            <ThemeToggle />
          </div>
          <p className="text-xs text-white/80 mt-1">
            Search by Reference or filter by columns
          </p>
        </div>
      </header>

      <main className="px-3 py-4 space-y-3 max-w-2xl mx-auto">
        <Card className="shadow-md border-0 bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-4 pb-3 space-y-3">
            <SearchBar onSearch={handleSearch} loading={loading} />
            <FilterBar filters={filters} onFiltersChange={handleFilterChange} />
            <Button variant="outline" size="sm" onClick={downloadExcel} className="w-full h-8 text-xs border-primary/30 hover:bg-primary/10 hover:text-primary transition-all">
              <Download className="mr-1 h-3.5 w-3.5" />
              Download Selected Arrears Lists (Excel)
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-md border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm text-primary font-semibold">Download Modified Records</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <ModifiedDataDownload />
            <SummaryDialog />
          </CardContent>
        </Card>

        {records.length > 1 && !selectedRecord && (
          <Card className="shadow-md border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-primary font-semibold">
                  Results ({records.length})
                </CardTitle>
                <Button variant="outline" size="sm" onClick={downloadExcel} className="h-8 text-xs border-primary/30 hover:bg-primary/10">
                  <Download className="mr-1 h-3.5 w-3.5" />
                  Download Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="max-h-96 overflow-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/70 sticky top-0">
                    <tr className="text-left">
                      <th className="px-2 py-1.5 font-semibold text-foreground">Reference</th>
                      <th className="px-2 py-1.5 font-semibold text-foreground">Name</th>
                      <th className="px-2 py-1.5 font-semibold text-foreground text-right">Arrear</th>
                      <th className="px-2 py-1.5 font-semibold text-foreground text-right">Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr
                        key={i}
                        onClick={() => setSelectedRecord(r)}
                        className="cursor-pointer border-t border-border hover:bg-primary/10 transition-colors"
                      >
                        <td className="px-2 py-1.5 font-medium text-foreground whitespace-nowrap">{r.Reference}</td>
                        <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[140px]">{r.Name ?? "—"}</td>
                        <td className="px-2 py-1.5 text-foreground text-right whitespace-nowrap">{r.ARREAR ?? "—"}</td>
                        <td className="px-2 py-1.5 text-muted-foreground text-right whitespace-nowrap">{r.AGE ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedRecord && (
          <>
            {records.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRecord(null)}
                className="text-xs h-7"
              >
                ← Back to results
              </Button>
            )}

            <Card className="shadow-md border-0 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-2 px-4 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-primary font-semibold">Consumer Details</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openMap}
                    className="h-8 text-xs border-primary/30 hover:bg-primary/10"
                  >
                    <MapPin className="mr-1 h-3.5 w-3.5" />
                    View on Map
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <RecordDetails record={selectedRecord} />
              </CardContent>
            </Card>

            <Card className="shadow-md border-0 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm text-primary font-semibold">Update Payment & Picture</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <PaymentAndUpload record={selectedRecord} onUpdated={refreshRecord} />
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <footer className="mt-6 py-4 text-center text-xs text-muted-foreground border-t border-border/50">
        Designed By Engr. Inayatullah
      </footer>
    </div>
  );
};

export default Index;
