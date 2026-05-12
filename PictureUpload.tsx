import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Upload, Image } from "lucide-react";

interface PictureUploadProps {
  reference: string;
}

const PictureUpload = ({ reference }: PictureUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Try to load existing image
  useState(() => {
    const { data } = supabase.storage
      .from("picture")
      .getPublicUrl(`${reference}.jpg`);
    if (data?.publicUrl) {
      // Check if image exists by attempting to fetch
      fetch(data.publicUrl, { method: "HEAD" })
        .then((res) => {
          if (res.ok) setImageUrl(data.publicUrl);
        })
        .catch(() => {});
    }
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    const filePath = `${reference}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage
      .from("picture")
      .upload(filePath, file, { upsert: true });

    if (error) {
      toast.error("Upload failed: " + error.message);
    } else {
      const { data } = supabase.storage.from("picture").getPublicUrl(filePath);
      setImageUrl(data.publicUrl);
      toast.success("Picture uploaded successfully!");
    }
    setUploading(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Upload Picture</h3>
      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <Label>Select Image</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <Button onClick={handleUpload} disabled={!file || uploading}>
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      </div>
      {imageUrl && (
        <div className="mt-4">
          <Label className="text-xs text-muted-foreground">Current Picture</Label>
          <div className="mt-1 rounded-lg overflow-hidden border border-border max-w-sm">
            <img src={imageUrl} alt="Reference" className="w-full h-auto" />
          </div>
        </div>
      )}
    </div>
  );
};

export default PictureUpload;
