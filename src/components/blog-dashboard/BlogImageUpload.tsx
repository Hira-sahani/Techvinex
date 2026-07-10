// Deploy touch: trigger fresh Vercel build from main (no functional change).
import { useState, useRef, forwardRef, useImperativeHandle, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface BlogImageUploadProps {
  value: string;
  /** Value present when the form was opened (existing published image). Never deleted by session cleanup. */
  originalValue?: string;
  onChange: (url: string) => void;
}

/** Imperative API used by the parent form to commit, discard, or inspect status. */
export interface BlogImageUploadHandle {
  /** Called on successful save — clears session tracking without deleting. */
  commit: () => void;
  /** Called on explicit Cancel — deletes any unsaved session upload (never the original). */
  discard: () => Promise<void>;
  /** Returns current upload/scan status so parent form can gate submit. */
  getStatus: () => UploadStatus;
}

/** idle: nothing selected. uploading/scanning: in progress. clean: scanner verified. unverified: uploaded but scanner not configured. failed: last attempt rejected/errored — parent MUST block save. */
export type UploadStatus = "idle" | "uploading" | "scanning" | "clean" | "unverified" | "failed";

type ScanVerdict = "clean" | "suspicious" | "malicious" | "unknown" | "error";

const BUCKET = "blog-images";
// Client-side allowlist mirrors the edge-function magic-byte sniff. SVG is
// explicitly excluded — it is a stored-XSS vector on a public bucket.
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** Extract the storage object path from a public URL, or null if not a bucket URL. */
function pathFromPublicUrl(url: string): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

async function removeObject(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
}

const BlogImageUpload = forwardRef<BlogImageUploadHandle, BlogImageUploadProps>(
  ({ value, originalValue = "", onChange }, ref) => {
    const [uploading, setUploading] = useState(false);
    const [scanning, setScanning] = useState(false);
    // Tracks the outcome of the most recent upload attempt. Parent form reads
    // this via getStatus() to gate blog create/update.
    const statusRef = useRef<UploadStatus>(value ? "unverified" : "idle");
    const fileRef = useRef<HTMLInputElement>(null);
    // Path of an image uploaded in THIS session that has not yet been saved.
    // Anything else (originalValue) is off-limits to auto-cleanup.
    const sessionPathRef = useRef<string | null>(null);
    const originalPathRef = useRef<string | null>(pathFromPublicUrl(originalValue));

    // [DIAG] Mount toast — confirms this exact component is the one rendered.
    useEffect(() => {
      toast.info("[diag] BlogImageUpload mounted", { duration: 4000 });
      console.info("[scan-upload:diag] BlogImageUpload mounted");
    }, []);

    // Keep originalPathRef fresh if the parent switches records without unmounting.
    if (pathFromPublicUrl(originalValue) !== originalPathRef.current) {
      originalPathRef.current = pathFromPublicUrl(originalValue);
    }

    const commit = useCallback(() => {
      // Session upload is now referenced by a saved row — stop tracking so
      // future edits treat it as an "original" not-eligible-for-cleanup value.
      sessionPathRef.current = null;
      originalPathRef.current = pathFromPublicUrl(value);
    }, [value]);

    const discard = useCallback(async () => {
      const sessionPath = sessionPathRef.current;
      // Only delete paths uploaded in this session AND not equal to the original.
      if (sessionPath && sessionPath !== originalPathRef.current) {
        await removeObject(sessionPath);
      }
      sessionPathRef.current = null;
    }, []);

    useImperativeHandle(ref, () => ({ commit, discard, getStatus: () => statusRef.current }), [commit, discard]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // [DIAG] handleUpload entry.
      toast.info(`[diag] handleUpload start · file=${file?.name ?? "none"}`, { duration: 5000 });
      console.info("[scan-upload:diag] handleUpload start", { hasFile: !!file, name: file?.name, type: file?.type, size: file?.size });
      if (!file) return;

      if (!ALLOWED_MIME.has(file.type)) {
        toast.error("Only JPG, PNG, WebP, or GIF are allowed");
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        if (fileRef.current) fileRef.current.value = "";
        return;
      }

      // If we already have an unsaved session upload, delete it before replacing.
      const previousSessionPath = sessionPathRef.current;

      setUploading(true);
      let uploadedPath: string | null = null;
      try {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file);
        if (error) throw error;
        uploadedPath = path;
        sessionPathRef.current = path;
        // [DIAG] Storage upload succeeded.
        toast.success(`[diag] storage upload OK · ${path}`, { duration: 5000 });
        console.info("[scan-upload:diag] storage upload OK", { path });

        // Purge the previous unsaved upload (if it wasn't the original).
        if (previousSessionPath && previousSessionPath !== originalPathRef.current) {
          await removeObject(previousSessionPath);
        }

        setUploading(false);
        setScanning(true);
        let verdict: ScanVerdict = "unknown";
        let scannerConfigured = false;
        try {
          // [DIAG] Log the invocation inputs (non-sensitive: bucket name + object path only).
          toast.info(`[diag] invoking scan-upload · ${path}`, { duration: 5000 });
          console.info("[scan-upload:diag] invoking", { bucket: BUCKET, object_path: path });
          const { data: scan, error: scanErr } = await supabase.functions.invoke("scan-upload", {
            body: { bucket: BUCKET, object_path: path },
          });
          // [DIAG] Log raw returned data + error shape (no headers, no tokens).
          toast.info(`[diag] scan-upload returned · verdict=${scan?.verdict ?? "n/a"} · err=${scanErr ? "yes" : "no"}`, { duration: 6000 });
          console.info("[scan-upload:diag] result", { data: scan, error: scanErr });
          if (scanErr) throw scanErr;
          verdict = (scan?.verdict as ScanVerdict) ?? "unknown";
          scannerConfigured = scan?.scanner_configured === true;
        } catch (scanErr: any) {
          // [DIAG] Extract safe, non-secret diagnostic details from the FunctionsHttpError.
          const errName: string = scanErr?.name ?? "Error";
          const errMsg: string = scanErr?.message ?? String(scanErr);
          const ctx = scanErr?.context;
          let status: number | string = "n/a";
          let bodyText = "";
          try {
            if (ctx && typeof ctx === "object" && "status" in ctx) {
              status = (ctx as { status?: number }).status ?? "n/a";
            }
            if (ctx && typeof (ctx as Response).clone === "function") {
              // ctx is a Response — read a short, safe snippet of the body.
              const cloned = (ctx as Response).clone();
              bodyText = await cloned.text().catch(() => "");
              if (bodyText.length > 500) bodyText = bodyText.slice(0, 500) + "…";
            }
          } catch {
            // Ignore body read failures — diagnostics must not break the flow.
          }
          console.warn("[scan-upload:diag] failed", { name: errName, message: errMsg, status, body: bodyText });
          toast.error(
            `scan-upload ${errName}: ${errMsg} · status=${status}${bodyText ? ` · body=${bodyText}` : ""}`,
            { duration: 15000 },
          );
          verdict = "error";
        }


        if (verdict === "malicious" || verdict === "suspicious" || verdict === "error") {
          // Server-side deletion is authoritative; the object is already gone
          // (or was rejected). Drop our session tracking so cancel-cleanup is a no-op.
          sessionPathRef.current = null;
          toast.error(verdict === "error" ? "Upload rejected by security scanner" : "Image blocked by security scan");
          return;
        }

        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        onChange(data.publicUrl);

        if (verdict === "clean") {
          toast.success("Image uploaded and verified");
        } else if (scannerConfigured) {
          // scanner_configured=true but verdict unknown — still uncertain.
          toast.warning("Image uploaded (verdict pending)");
        } else {
          // Honest: scanner not configured. Do NOT claim malware protection.
          toast.warning("Image uploaded — malware scanner not configured");
        }
      } catch (err: any) {
        if (uploadedPath) {
          await removeObject(uploadedPath);
          sessionPathRef.current = null;
        }
        toast.error(err.message || "Upload failed");
      } finally {
        setUploading(false);
        setScanning(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    };

    const handleRemove = async () => {
      // Explicit user removal before save: safe to delete the session upload.
      const sessionPath = sessionPathRef.current;
      if (sessionPath && sessionPath !== originalPathRef.current) {
        await removeObject(sessionPath);
        sessionPathRef.current = null;
      }
      onChange("");
    };

    const busy = uploading || scanning;
    const busyLabel = uploading ? "Uploading..." : scanning ? "Scanning..." : "Click to upload image";
    const BusyIcon = scanning ? ShieldCheck : Upload;

    return (
      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Cover Image</Label>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleUpload} />

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
            <span className="text-[9px] text-muted-foreground">Max 5MB · JPG, PNG, WebP, GIF</span>
          </button>
        )}
      </div>
    );
  },
);

BlogImageUpload.displayName = "BlogImageUpload";

export default BlogImageUpload;
