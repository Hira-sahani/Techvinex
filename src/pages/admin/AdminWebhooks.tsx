import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Webhook, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

type Endpoint = {
  id: string;
  name: string;
  description: string | null;
  secret_key_name: string;
  signature_header: string;
  algorithm: string;
  tolerance_seconds: number;
  is_active: boolean;
  created_at: string;
};

type Delivery = {
  id: string;
  endpoint_name: string;
  verified: boolean;
  status_code: number | null;
  reason: string | null;
  created_at: string;
};

const empty = {
  name: "",
  description: "",
  secret_key_name: "",
  signature_header: "x-signature",
  algorithm: "sha256",
  tolerance_seconds: 300,
  is_active: true,
};

const AdminWebhooks = () => {
  const [rows, setRows] = useState<Endpoint[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: eps }, { data: dels }] = await Promise.all([
      supabase.from("webhook_endpoints").select("*").order("created_at", { ascending: false }),
      supabase.from("webhook_deliveries").select("*").order("created_at", { ascending: false }).limit(25),
    ]);
    setRows((eps as Endpoint[]) ?? []);
    setDeliveries((dels as Delivery[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name || !form.secret_key_name) return toast.error("Name and Secret Key Name required");
    setSaving(true);
    const { error } = await supabase.from("webhook_endpoints").insert(form);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Endpoint created");
    setOpen(false);
    setForm({ ...empty });
    load();
  };

  const toggleActive = async (r: Endpoint) => {
    const { error } = await supabase.from("webhook_endpoints").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this endpoint?")) return;
    const { error } = await supabase.from("webhook_endpoints").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const baseUrl = `https://${projectRef}.supabase.co/functions/v1/webhook-receiver`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Webhook className="w-5 h-5" /> Webhook Endpoints
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            HMAC-verified inbound webhooks. Sender must compute HMAC of <code>timestamp.body</code> using the linked secret.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New endpoint</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New webhook endpoint</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Name (URL slug)</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="stripe-events" />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label>Secret Key Name</Label>
                <Input
                  value={form.secret_key_name}
                  onChange={(e) => setForm({ ...form, secret_key_name: e.target.value.toUpperCase() })}
                  placeholder="STRIPE_WEBHOOK_SECRET"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Must exist in Secrets Manager</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Header</Label>
                  <Input value={form.signature_header} onChange={(e) => setForm({ ...form, signature_header: e.target.value })} />
                </div>
                <div>
                  <Label>Algorithm</Label>
                  <Input value={form.algorithm} onChange={(e) => setForm({ ...form, algorithm: e.target.value })} />
                </div>
                <div>
                  <Label>Tolerance (s)</Label>
                  <Input
                    type="number"
                    value={form.tolerance_seconds}
                    onChange={(e) => setForm({ ...form, tolerance_seconds: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border border-border rounded-md divide-y">
        {loading ? (
          <p className="p-4 text-xs text-muted-foreground">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-xs text-muted-foreground">No endpoints yet.</p>
        ) : rows.map((r) => (
          <div key={r.id} className="p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">{r.name}</span>
                <Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "active" : "inactive"}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground truncate">
                URL: <code>{baseUrl}?endpoint={r.name}</code> · secret: {r.secret_key_name} · {r.algorithm} · ±{r.tolerance_seconds}s
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} />
              <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-2">Recent deliveries</h2>
        <div className="border border-border rounded-md divide-y">
          {deliveries.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground">No deliveries yet.</p>
          ) : deliveries.map((d) => (
            <div key={d.id} className="p-2 flex items-center gap-3 text-xs">
              {d.verified ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-red-600" />
              )}
              <span className="font-mono">{d.endpoint_name}</span>
              <Badge variant="outline">{d.status_code}</Badge>
              <span className="text-muted-foreground">{d.reason}</span>
              <span className="ml-auto text-muted-foreground">{new Date(d.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminWebhooks;
