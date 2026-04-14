import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import SearchBar from "@/components/SearchBar";
import FilterBar, { Filters } from "@/components/FilterBar";
import RecordDetails from "@/components/RecordDetails";
import PaymentAndUpload from "@/components/PaymentAndUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

const TABLE_NAME = "PESCO ARREAR LIST MARDAN";

const Index = () => {
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
    query = query.limit(100);

    const { data, error } = await query;
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-foreground">
            PESCO Arrear List — Mardan
          </h1>
          <p className="text-xs text-muted-foreground">
            Search by Reference or filter by columns
          </p>
        </div>
      </header>

      <main className="px-3 py-4 space-y-3 max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-4 pb-3 space-y-3">
            <SearchBar onSearch={handleSearch} loading={loading} />
            <FilterBar filters={filters} onFiltersChange={handleFilterChange} />
          </CardContent>
        </Card>

        {records.length > 1 && !selectedRecord && (
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm">
                Results ({records.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {records.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedRecord(r)}
                    className="w-full text-left px-3 py-2 rounded-md text-xs bg-muted/50 hover:bg-accent transition-colors flex justify-between items-center"
                  >
                    <span className="font-medium text-foreground">{r.Reference}</span>
                    <span className="text-muted-foreground truncate ml-2">{r.Name}</span>
                  </button>
                ))}
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

            <Card>
              <CardHeader className="pb-2 px-4 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Consumer Details</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openMap}
                    className="h-8 text-xs"
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

            <Card>
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm">Update Payment & Picture</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <PaymentAndUpload record={selectedRecord} onUpdated={refreshRecord} />
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
