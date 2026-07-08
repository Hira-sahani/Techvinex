import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface BlogImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

type ScanVerdict = "clean" | "suspicious" | "malicious" | "unknown" | "error";

const BlogImageUpload = ({ value, onChange }: BlogImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    let uploadedPath: string | null = null;
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, file);
      if (error) throw error;
      uploadedPath = path;

      // Security scan (Phase B3)
      setUploading(false);
      setScanning(true);
      let verdict: ScanVerdict = "unknown";
      try {
        const { data: scan, error: scanErr } = await supabase.functions.invoke("scan-upload", {
          body: { bucket: "blog-images", object_path: path },
        });
        if (scanErr) throw scanErr;
        verdict = (scan?.verdict as ScanVerdict) ?? "unknown";
      } catch (scanErr: any) {
        // Scanner unavailable — fall through as unknown; do not block upload.
        console.warn("scan-upload failed:", scanErr?.message ?? scanErr);
        verdict = "error";
      }

      if (verdict === "malicious" || verdict === "suspicious") {
        // Object is deleted by the edge function on malicious; ensure it's gone
        // on suspicious too, since we won't attach it.
        if (verdict === "suspicious") {
          await supabase.storage.from("blog-images").remove([path]).catch(() => {});
        }
        toast.error("Image blocked by security scan");
        return;
      }

      const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
      onChange(data.publicUrl);

      if (verdict === "clean") {
        toast.success("Image uploaded and verified");
      } else {
        toast.warning("Image uploaded (security scan unavailable)");
      }
    } catch (err: any) {
      // Best-effort cleanup if scanning threw after upload
      if (uploadedPath) {
        await supabase.storage.from("blog-images").remove([uploadedPath]).catch(() => {});
      }
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      setScanning(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemove = () => onChange("");

  const busy = uploading || scanning;
  const busyLabel = uploading ? "Uploading..." : scanning ? "Scanning..." : "Click to upload image";
  const BusyIcon = scanning ? ShieldCheck : Upload;

  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Cover Image</Label>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      {value ? (
        <div className="mt-1 relative rounded-lg overflow-hidden border border-border">
          <img src={value} alt="Cover" className="w-full h-32 object-cover" />
          <Button
            type="button" variant="destructive" size="icon"
            className="absolute top-1.5 right-1.5 h-6 w-6"
            onClick={handleRemove}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="mt-1 w-full h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <BusyIcon className="w-5 h-5" />
          )}
          <span className="text-[10px]">{busyLabel}</span>
          <span className="text-[9px] text-muted-foreground">Max 5MB · JPG, PNG, WebP · Scanned for malware</span>
        </button>
      )}
    </div>
  );
};

export default BlogImageUpload;
