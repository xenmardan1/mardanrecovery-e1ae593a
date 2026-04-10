import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import SearchBar from "@/components/SearchBar";
import RecordDetails from "@/components/RecordDetails";
import PaymentUpdate from "@/components/PaymentUpdate";
import PictureUpload from "@/components/PictureUpload";
import LocationMap from "@/components/LocationMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const TABLE_NAME = "PESCO ARREAR LIST MARDAN";

const Index = () => {
  const [record, setRecord] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async (reference: string) => {
    setLoading(true);
    setRecord(null);

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
      setRecord(data);
    }
    setLoading(false);
  }, []);

  const refreshRecord = useCallback(() => {
    if (record?.Reference) handleSearch(record.Reference);
  }, [record, handleSearch]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">
            PESCO Arrear List — Mardan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Search by Reference to view, update payment, upload picture & view location
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reference Search</CardTitle>
          </CardHeader>
          <CardContent>
            <SearchBar onSearch={handleSearch} loading={loading} />
          </CardContent>
        </Card>

        {record && (
          <>
            {/* Record Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Consumer Details</CardTitle>
              </CardHeader>
              <CardContent>
                <RecordDetails record={record} />
              </CardContent>
            </Card>

            {/* Payment Update */}
            <Card>
              <CardContent className="pt-6">
                <PaymentUpdate record={record} onUpdated={refreshRecord} />
              </CardContent>
            </Card>

            {/* Picture Upload */}
            <Card>
              <CardContent className="pt-6">
                <PictureUpload reference={record.Reference} />
              </CardContent>
            </Card>

            {/* Map */}
            <Card>
              <CardContent className="pt-6">
                <LocationMap
                  latitude={parseFloat(record.Latitude)}
                  longitude={parseFloat(record.Longitude)}
                  name={record.Name}
                  reference={record.Reference}
                />
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
