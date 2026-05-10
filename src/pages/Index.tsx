import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import pescoLogo from "@/assets/pesco-logo.png";
import { supabase } from "@/lib/supabase";
import SearchBar from "@/components/SearchBar";
import FilterBar, { Filters } from "@/components/FilterBar";
import RecordDetails from "@/components/RecordDetails";
import PaymentAndUpload from "@/components/PaymentAndUpload";
import TheftUpdate from "@/components/TheftUpdate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Download, ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown, LogOut } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import ModifiedDataDownload from "@/components/ModifiedDataDownload";
import TheftDataDownload from "@/components/TheftDataDownload";
import DisplayedDataDownload from "@/components/DisplayedDataDownload";
import SummaryDialog from "@/components/SummaryDialog";
import TheftFilterBar, { TheftFilters } from "@/components/TheftFilterBar";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const TABLE_NAME = "PESCO ARREAR LIST MARDAN";

type View = "home" | "arrears" | "recovery" | "theft";

const Index = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<View>("home");
  const [records, setRecords] = useState<Record<string, any>[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [theftFilters, setTheftFilters] = useState<TheftFilters>({});
  const [minArrear, setMinArrear] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [recoveryStart, setRecoveryStart] = useState("");
  const [recoveryEnd, setRecoveryEnd] = useState("");
  const [theftStart, setTheftStart] = useState("");
  const [theftEnd, setTheftEnd] = useState("");

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  }, [navigate]);

  const toggleSort = useCallback((key: string) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return key;
      }
      setSortDir("asc");
      return key;
    });
  }, []);

  const sortedRecords = useMemo(() => {
    if (!sortKey) return records;
    const numeric = sortKey === "ARREAR" || sortKey === "AGE";
    const copy = [...records];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      let cmp: number;
      if (numeric) {
        cmp = (parseFloat(String(av).replace(/,/g, "")) || 0) - (parseFloat(String(bv).replace(/,/g, "")) || 0);
      } else {
        cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [records, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ArrowUpDown className="inline ml-1 h-3 w-3 opacity-50" />;
    return sortDir === "asc"
      ? <ArrowUp className="inline ml-1 h-3 w-3" />
      : <ArrowDown className="inline ml-1 h-3 w-3" />;
  };


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
    if (keys.length === 0 && minArrear === 0) {
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
    let data = allData;
    if (minArrear > 0) {
      data = data.filter((record) => {
        const arrear = parseFloat(String(record.ARREAR || "0").replace(/,/g, "")) || 0;
        return arrear >= minArrear;
      });
    }
    if (error) {
      toast.error("Filter failed: " + error.message);
    } else {
      setRecords(data || []);
      if (data && data.length === 1) setSelectedRecord(data[0]);
      else if (data && data.length === 0) toast.info("No records match the selected filters");
      else toast.success(`Found ${data?.length} records`);
    }
    setLoading(false);
  }, [minArrear]);

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

  const displayByColumn = useCallback(async (column: string, label: string, startDate?: string, endDate?: string, applyFilters: boolean = false, filtersToUse?: Filters) => {
    setLoading(true);
    setRecords([]);
    setSelectedRecord(null);
    setSortKey(null);
    setSortDir("asc");
    const pageSize = 1000;
    let allData: Record<string, any>[] = [];
    let from = 0;
    const activeFilters = filtersToUse !== undefined ? filtersToUse : filters;

    while (true) {
      let q = supabase
        .from(TABLE_NAME)
        .select("*")
        .not(column, "is", null)
        .neq(column, "");
      if (startDate) q = q.gte(column, startDate);
      if (endDate) q = q.lte(column, endDate);

      if (applyFilters) {
        Object.entries(activeFilters).forEach(([key, vals]) => {
          if (vals && vals.length > 0) {
            q = q.in(key, vals);
          }
        });
      }

      const { data, error } = await q.range(from, from + pageSize - 1);
      if (error) {
        toast.error("Fetch failed: " + error.message);
        setLoading(false);
        return;
      }
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    setRecords(allData);
    if (allData.length === 0) toast.info(`No ${label} found`);
    else toast.success(`Found ${allData.length} ${label}`);
    setLoading(false);
  }, [filters]);

  const displayModified = useCallback(() => displayByColumn("Payment_Date", "recovery cases", recoveryStart, recoveryEnd, true, filters), [displayByColumn, recoveryStart, recoveryEnd, filters]);

  const displayTheft = useCallback(async () => {
    setLoading(true);
    setRecords([]);
    setSelectedRecord(null);
    setSortKey(null);
    setSortDir("asc");
    const pageSize = 1000;
    let allData: Record<string, any>[] = [];
    let from = 0;

    while (true) {
      let q = supabase
        .from(TABLE_NAME)
        .select("*")
        .not("Payment_Date", "is", null)
        .neq("Payment_Date", "");

      if (theftStart) q = q.gte("Payment_Date", theftStart);
      if (theftEnd) q = q.lte("Payment_Date", theftEnd);

      if (Object.keys(theftFilters).length > 0) {
        Object.entries(theftFilters).forEach(([key, vals]) => {
          if (vals && vals.length > 0) {
            q = q.in(key, vals);
          }
        });
      }

      const { data, error } = await q.range(from, from + pageSize - 1);
      if (error) {
        toast.error("Fetch failed: " + error.message);
        setLoading(false);
        return;
      }
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    setRecords(allData);
    if (allData.length === 0) toast.info("No theft cases found");
    else toast.success(`Found ${allData.length} theft cases`);
    setLoading(false);
  }, [theftStart, theftEnd, theftFilters]);

  const downloadExcel = useCallback(async () => {
    toast.info("Fetching filtered records…");

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

    if (minArrear > 0) {
      allData = allData.filter((record) => {
        const arrear = parseFloat(String(record.ARREAR || "0").replace(/,/g, "")) || 0;
        return arrear >= minArrear;
      });
    }

    if (allData.length === 0) {
      toast.error("No records match the selected filters");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(allData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Arrears");
    XLSX.writeFile(wb, "PESCO_Arrears_Filtered.xlsx");
    toast.success(`Downloaded ${allData.length} filtered records`);
  }, [filters, minArrear]);

  const downloadResults = useCallback(() => {
    if (records.length === 0) {
      toast.error("No records to download");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(records);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    XLSX.writeFile(wb, "PESCO_Results.xlsx");
    toast.success(`Downloaded ${records.length} displayed records`);
  }, [records]);

  return (
    <div className="min-h-screen flex flex-col bg-background transition-colors duration-300">
      <header className="header-gradient sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-4 relative">
          <div className="absolute top-4 left-4">
            {view !== "home" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setView("home");
                  setRecords([]);
                  setSelectedRecord(null);
                  setFilters({});
                  setSortKey(null);
                }}
                className="text-white hover:bg-white/20 h-8 px-2 text-xs"
              >
                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
              </Button>
            )}
          </div>
          <div className="absolute top-4 right-4 flex gap-2">
            <ThemeToggle />
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
            <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-sm p-1 mb-2 shadow-md">
              <img src={pescoLogo} alt="PESCO Logo" className="h-full w-full rounded-full object-contain" />
            </div>
            <h1 className="text-lg font-bold text-white drop-shadow-sm">
              PESCO MARDAN CIRCLE RECOVERY APPLICATION
            </h1>
            <p className="text-xs text-white/80 mt-1">
              Search by Reference or filter by columns
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-3 py-4 space-y-3 w-full mx-auto">
        <Card className="shadow-md border-0 bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-4 pb-3 space-y-3">
            <SearchBar onSearch={handleSearch} loading={loading} />
          </CardContent>
        </Card>

        {view === "home" && !selectedRecord && records.length === 0 && (
          <div className="grid grid-cols-1 gap-2">
            <Button variant="outline" className="w-full h-10 text-sm border-primary/30 hover:bg-primary/10 hover:text-primary" onClick={() => setView("arrears")}>
              <Download className="mr-2 h-4 w-4" />
              Download Arrears List
            </Button>
            <Button variant="outline" className="w-full h-10 text-sm border-primary/30 hover:bg-primary/10 hover:text-primary" onClick={() => setView("recovery")}>
              <Download className="mr-2 h-4 w-4" />
              Download Recovery
            </Button>
            <Button variant="outline" className="w-full h-10 text-sm border-primary/30 hover:bg-primary/10 hover:text-primary" onClick={() => setView("theft")}>
              <Download className="mr-2 h-4 w-4" />
              Download Theft Cases
            </Button>
            <Button
              variant="outline"
              className="w-full h-10 text-sm border-primary/30 hover:bg-primary/10 hover:text-primary"
              onClick={() => {
                toast.info("Search a Reference above to update theft details");
                document.querySelector('input')?.focus();
              }}
            >
              Update Theft
            </Button>
          </div>
        )}


        {view === "arrears" && !selectedRecord && (
          <Card className="shadow-md border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm text-primary font-semibold">Download Arrears List</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <FilterBar filters={filters} onFiltersChange={handleFilterChange} minArrear={minArrear} onMinArrearChange={(val) => { setMinArrear(val); handleFilterChange(filters); }} />
              <Button variant="outline" size="sm" onClick={downloadExcel} className="w-full h-8 text-xs border-primary/30 hover:bg-primary/10 hover:text-primary transition-all">
                <Download className="mr-1 h-3.5 w-3.5" />
                Download Selected Arrears Lists (Excel)
              </Button>
            </CardContent>
          </Card>
        )}

        {view === "recovery" && !selectedRecord && records.length === 0 && (
          <Card className="shadow-md border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm text-primary font-semibold">Download Modified Records</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <ModifiedDataDownload startDate={recoveryStart} endDate={recoveryEnd} onStartDateChange={setRecoveryStart} onEndDateChange={setRecoveryEnd} />
              <SummaryDialog />
              <Button variant="outline" size="sm" onClick={displayModified} className="w-full h-8 text-xs border-primary/30 hover:bg-primary/10 hover:text-primary">
                Display Recovery Cases
              </Button>
            </CardContent>
          </Card>
        )}

        {view === "theft" && !selectedRecord && records.length === 0 && (
          <Card className="shadow-md border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm text-primary font-semibold">Download Theft Cases</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <TheftDataDownload startDate={theftStart} endDate={theftEnd} onStartDateChange={setTheftStart} onEndDateChange={setTheftEnd} onFiltersChange={setTheftFilters} />
              <SummaryDialog variant="theft" />
              <Button variant="outline" size="sm" onClick={displayTheft} className="w-full h-8 text-xs border-primary/30 hover:bg-primary/10 hover:text-primary">
                Display Theft Cases
              </Button>
            </CardContent>
          </Card>
        )}

        {view === "recovery" && records.length > 0 && !selectedRecord && (
          <Card className="shadow-md border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm text-primary font-semibold">
                Recovery Results ({records.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="max-h-96 overflow-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/70 sticky top-0">
                    <tr className="text-left">
                      <th className="px-2 py-1.5 font-semibold text-foreground cursor-pointer select-none hover:bg-muted" onClick={() => toggleSort("Reference")}>Reference<SortIcon col="Reference" /></th>
                      <th className="px-2 py-1.5 font-semibold text-foreground cursor-pointer select-none hover:bg-muted" onClick={() => toggleSort("Sub Division")}>Sub Division<SortIcon col="Sub Division" /></th>
                      <th className="px-2 py-1.5 font-semibold text-foreground cursor-pointer select-none hover:bg-muted" onClick={() => toggleSort("Name")}>Name<SortIcon col="Name" /></th>
                      <th className="px-2 py-1.5 font-semibold text-foreground cursor-pointer select-none hover:bg-muted" onClick={() => toggleSort("Tariff")}>Tariff<SortIcon col="Tariff" /></th>
                      <th className="px-2 py-1.5 font-semibold text-foreground text-right cursor-pointer select-none hover:bg-muted" onClick={() => toggleSort("payment")}>Payment<SortIcon col="payment" /></th>
                      <th className="px-2 py-1.5 font-semibold text-foreground cursor-pointer select-none hover:bg-muted" onClick={() => toggleSort("Payment_Date")}>Payment Date<SortIcon col="Payment_Date" /></th>
                      <th className="px-2 py-1.5 font-semibold text-foreground cursor-pointer select-none hover:bg-muted" onClick={() => toggleSort("Payment_Mode")}>Payment Mode<SortIcon col="Payment_Mode" /></th>
                      <th className="px-2 py-1.5 font-semibold text-foreground">Picture</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRecords.map((r, i) => {
                      const picUrl = r.Picture || r.picture || supabase.storage.from("picture").getPublicUrl(`${r.Reference}.jpg`).data.publicUrl;
                      const paymentMode = r["payment mode"] ?? r.Payment_Mode ?? r["Payment Mode"] ?? r.payment_mode ?? "—";
                      return (
                        <tr
                          key={i}
                          onClick={() => setSelectedRecord(r)}
                          className="cursor-pointer border-t border-border hover:bg-primary/10 transition-colors"
                        >
                          <td className="px-2 py-1.5 font-medium text-foreground whitespace-nowrap">{r.Reference}</td>
                          <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[120px]">{r["Sub Division"] ?? "—"}</td>
                          <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[140px]">{r.Name ?? "—"}</td>
                          <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">{r.Tariff ?? "—"}</td>
                          <td className="px-2 py-1.5 text-foreground text-right whitespace-nowrap">{r.payment ?? "—"}</td>
                          <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">{r.Payment_Date ?? "—"}</td>
                          <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">{paymentMode}</td>
                          <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                            {picUrl ? (
                              <a href={picUrl} target="_blank" rel="noopener noreferrer">
                                <img src={picUrl} alt="pic" className="h-10 w-10 object-cover rounded" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                              </a>
                            ) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3">
                <DisplayedDataDownload records={sortedRecords} title="Recovery Cases" isRecovery={true} />
              </div>
            </CardContent>
          </Card>
        )}

        {view === "theft" && records.length > 0 && !selectedRecord && (
          <Card className="shadow-md border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm text-primary font-semibold">
                Results ({records.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="max-h-96 overflow-auto rounded-md border border-border" style={{ overflowX: 'auto' }}>
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-muted/70 sticky top-0 divide-x divide-border">
                    <tr className="text-left">
                      <th className="px-2 py-1.5 font-semibold text-foreground cursor-pointer select-none hover:bg-muted whitespace-nowrap min-w-fit" onClick={() => toggleSort("Reference")}>Reference<SortIcon col="Reference" /></th>
                      <th className="px-2 py-1.5 font-semibold text-foreground cursor-pointer select-none hover:bg-muted whitespace-nowrap min-w-fit" onClick={() => toggleSort("Sub Division")}>Sub Division<SortIcon col="Sub Division" /></th>
                      <th className="px-2 py-1.5 font-semibold text-foreground cursor-pointer select-none hover:bg-muted whitespace-nowrap min-w-fit" onClick={() => toggleSort("Name")}>Name<SortIcon col="Name" /></th>
                      <th className="px-2 py-1.5 font-semibold text-foreground cursor-pointer select-none hover:bg-muted whitespace-nowrap min-w-fit" onClick={() => toggleSort("Father")}>Father<SortIcon col="Father" /></th>
                      <th className="px-2 py-1.5 font-semibold text-foreground text-right cursor-pointer select-none hover:bg-muted whitespace-nowrap min-w-fit" onClick={() => toggleSort("S_Load")}>S_Load<SortIcon col="S_Load" /></th>
                      <th className="px-2 py-1.5 font-semibold text-foreground text-right cursor-pointer select-none hover:bg-muted whitespace-nowrap min-w-fit" onClick={() => toggleSort("C/Load")}>C/Load<SortIcon col="C/Load" /></th>
                      <th className="px-2 py-1.5 font-semibold text-foreground cursor-pointer select-none hover:bg-muted whitespace-nowrap min-w-fit" onClick={() => toggleSort("Name of Reporting officer")}>Name of Reporting Officer<SortIcon col="Name of Reporting officer" /></th>
                      <th className="px-2 py-1.5 font-semibold text-foreground cursor-pointer select-none hover:bg-muted whitespace-nowrap min-w-fit" onClick={() => toggleSort("Reporting Date")}>Reporting Date<SortIcon col="Reporting Date" /></th>
                      <th className="px-2 py-1.5 font-semibold text-foreground cursor-pointer select-none hover:bg-muted whitespace-nowrap min-w-fit" onClick={() => toggleSort("Method")}>Method<SortIcon col="Method" /></th>
                      <th className="px-2 py-1.5 font-semibold text-foreground whitespace-nowrap min-w-fit">Theft Pic</th>
                      <th className="px-2 py-1.5 font-semibold text-foreground whitespace-nowrap min-w-fit">Media</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sortedRecords.map((r, i) => {
                      const sLoad = r.S_Load || r["S Load"] || r.S_load || r["Sanctioned Load"] || "";
                      const cLoad = r["C/Load"] || r["C Load"] || r.C_Load || r["Connected Load"] || "";
                      const reportingOfficer = r["Name of Reporting officer"] || r["Name of Reporting Officer"] || r["Reporting officer"] || r["Reporting Officer Name"] || "";
                      const reportingDate = r["Reporting Date"] || r.Reporting_Date || r.reporting_date || "";
                      const method = r.Method || r.method || "";
                      const theftPic = r["Theft Pic"] || r["Theft_Pic"] || r.theft_pic || r.Theft_Picture || r["Theft Picture"] || "";
                      const media = r.media || r.Media || r.attachment || r.Attachment || "";

                      return (
                        <tr
                          key={i}
                          onClick={() => setSelectedRecord(r)}
                          className="cursor-pointer divide-x divide-border hover:bg-primary/10 transition-colors"
                        >
                          <td className="px-2 py-1.5 font-medium text-foreground whitespace-nowrap min-w-fit">{r.Reference}</td>
                          <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap min-w-fit">{r["Sub Division"] ?? "—"}</td>
                          <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[100px]">{r.Name ?? "—"}</td>
                          <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap min-w-fit">{r.Father ?? "—"}</td>
                          <td className="px-2 py-1.5 text-foreground text-right whitespace-nowrap min-w-fit">{sLoad || "—"}</td>
                          <td className="px-2 py-1.5 text-foreground text-right whitespace-nowrap min-w-fit">{cLoad || "—"}</td>
                          <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap min-w-fit">{reportingOfficer || "—"}</td>
                          <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap min-w-fit">{reportingDate || "—"}</td>
                          <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap min-w-fit">{method || "—"}</td>
                          <td className="px-2 py-1.5 min-w-fit" onClick={(e) => e.stopPropagation()}>
                            {theftPic ? (
                              <a href={theftPic} target="_blank" rel="noopener noreferrer">
                                <img src={theftPic} alt="theft" className="h-10 w-10 object-cover rounded" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                              </a>
                            ) : "—"}
                          </td>
                          <td className="px-2 py-1.5 min-w-fit" onClick={(e) => e.stopPropagation()}>
                            {media ? (
                              <a href={media} target="_blank" rel="noopener noreferrer" className="text-primary underline">View</a>
                            ) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3">
                <DisplayedDataDownload records={sortedRecords} title="Theft Cases" />
              </div>
            </CardContent>
          </Card>
        )}

        {view === "arrears" && records.length > 1 && !selectedRecord && (
          <Card className="shadow-md border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-primary font-semibold">
                  Results ({records.length})
                </CardTitle>
                <Button variant="outline" size="sm" onClick={downloadResults} className="h-8 text-xs border-primary/30 hover:bg-primary/10">
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
                      <th className="px-2 py-1.5 font-semibold text-foreground cursor-pointer select-none hover:bg-muted" onClick={() => toggleSort("Reference")}>Reference<SortIcon col="Reference" /></th>
                      <th className="px-2 py-1.5 font-semibold text-foreground cursor-pointer select-none hover:bg-muted" onClick={() => toggleSort("Name")}>Name<SortIcon col="Name" /></th>
                      <th className="px-2 py-1.5 font-semibold text-foreground text-right cursor-pointer select-none hover:bg-muted" onClick={() => toggleSort("ARREAR")}>Arrear<SortIcon col="ARREAR" /></th>
                      <th className="px-2 py-1.5 font-semibold text-foreground text-right cursor-pointer select-none hover:bg-muted" onClick={() => toggleSort("AGE")}>Age<SortIcon col="AGE" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRecords.map((r, i) => (
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

            <Card id="theft-update-section" className="shadow-md border-0 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm text-primary font-semibold">Update Theft</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <TheftUpdate record={selectedRecord} onUpdated={refreshRecord} />
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <footer className="mt-auto py-4 text-center text-xs text-muted-foreground border-t border-border/50">
        Designed By Engr. Inayatullah
      </footer>
    </div>
  );
};

export default Index;
