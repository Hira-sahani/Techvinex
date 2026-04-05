import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BlogImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

const BlogImageUpload = ({ value, onChange }: BlogImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
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
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, file);
      if (error) throw error;

      const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Image uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemove = () => onChange("");

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
          disabled={uploading}
          className="mt-1 w-full h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Upload className="w-5 h-5" />
          )}
          <span className="text-[10px]">{uploading ? "Uploading..." : "Click to upload image"}</span>
          <span className="text-[9px] text-muted-foreground">Max 5MB · JPG, PNG, WebP</span>
        </button>
      )}
    </div>
  );
};

export default BlogImageUpload;
