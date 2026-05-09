import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Eye, EyeOff, KeyRound, Copy, Lock } from "lucide-react";
import { toast } from "sonner";
import StepUpReauth from "@/components/security/StepUpReauth";

type SecretRow = {
  id: string;
  key: string;
  hint: string | null;
  description: string | null;
  masked_value: string;
  created_at: string;
  updated_at: string;
};

const KEY_RE = /^[A-Z][A-Z0-9_]{2,127}$/;

const AdminSecrets = () => {
  const [rows, setRows] = useState<SecretRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SecretRow | null>(null);
  const [form, setForm] = useState({ key: "", value: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [reauthOpen, setReauthOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SecretRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-secrets", { method: "GET" });
    if (error) toast.error(error.message);
    else setRows(data?.secrets ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ key: "", value: "", description: "" });
    setOpen(true);
  };
  const openEdit = (r: SecretRow) => {
    setEditing(r);
    setForm({ key: r.key, value: "", description: r.description ?? "" });
    setOpen(true);
  };

  const save = async () => {
    if (!KEY_RE.test(form.key)) return toast.error("Key must be UPPER_SNAKE_CASE");
    if (!form.value) return toast.error("Value required");
    setSaving(true);
    const { error } = await supabase.functions.invoke("admin-secrets", {
      method: "POST",
      body: {
        key: form.key,
        value: form.value,
        description: form.description || null,
        action: editing ? "rotate" : "create",
      },
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Secret updated" : "Secret created");
    setOpen(false);
    load();
  };

  const reveal = async (r: SecretRow) => {
    if (revealed[r.id]) {
      setRevealed((s) => { const c = { ...s }; delete c[r.id]; return c; });
      return;
    }
    const { data, error } = await supabase.functions.invoke(
      `admin-secrets?reveal=1&id=${r.id}`,
      { method: "GET" },
    );
    if (error) return toast.error(error.message);
    setRevealed((s) => ({ ...s, [r.id]: data.value }));
  };

  const remove = (r: SecretRow) => {
    setPendingDelete(r);
    setReauthOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { error } = await supabase.functions.invoke(`admin-secrets?id=${pendingDelete.id}`, { method: "DELETE" });
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    setPendingDelete(null);
    load();
  };

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Copied"); };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> Secrets Manager
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            AES-256-GCM encrypted at rest. Admin-only access (RLS enforced).
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew} className="h-7 text-[11px]">
              <Plus className="w-3 h-3 mr-1" /> New Secret
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm">{editing ? "Update Secret" : "Create Secret"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-[11px]">Key</Label>
                <Input
                  value={form.key}
                  onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toUpperCase() }))}
                  placeholder="STRIPE_API_KEY"
                  disabled={!!editing}
                  className="h-8 text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground mt-1">UPPER_SNAKE_CASE, A–Z 0–9 _</p>
              </div>
              <div>
                <Label className="text-[11px]">Value</Label>
                <Textarea
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  placeholder={editing ? "Enter new value to rotate" : "sk_live_..."}
                  className="text-xs font-mono min-h-[72px]"
                />
              </div>
              <div>
                <Label className="text-[11px]">Description (optional)</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="h-7 text-[11px]">
                Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={saving} className="h-7 text-[11px]">
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-medium">Stored Secrets</p>
          <Badge variant="outline" className="ml-auto text-[9px]">{rows.length}</Badge>
        </div>
        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">No secrets yet. Add one to get started.</div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((r) => (
              <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-mono font-semibold text-foreground truncate">{r.key}</p>
                    {r.description && (
                      <span className="text-[10px] text-muted-foreground truncate">— {r.description}</span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground mt-0.5 select-all">
                    {revealed[r.id] ?? r.masked_value}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => reveal(r)} title="Reveal">
                    {revealed[r.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                  {revealed[r.id] && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copy(revealed[r.id])} title="Copy">
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)} title="Rotate">
                    <KeyRound className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(r)} title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <StepUpReauth
        open={reauthOpen}
        onOpenChange={setReauthOpen}
        onVerified={confirmDelete}
        title="Confirm secret deletion"
        description={pendingDelete ? `Re-enter your password to delete ${pendingDelete.key}.` : ""}
      />
    </div>
  );
};

export default AdminSecrets;
