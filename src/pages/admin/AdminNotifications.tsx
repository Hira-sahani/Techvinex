import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Send } from "lucide-react";
import { toast } from "sonner";

const AdminNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => { setNotifications(data || []); setLoading(false); });
  }, []);

  const sendNotification = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSending(true);
    const { data: profiles } = await supabase.from("profiles").select("user_id");
    const inserts = (profiles || []).map((p) => ({ user_id: p.user_id, title: title.trim(), body: body.trim() || null }));
    if (inserts.length > 0) {
      const { error } = await supabase.from("notifications").insert(inserts);
      if (error) toast.error("Failed to send: " + error.message);
      else { toast.success(`Sent to ${inserts.length} users`); setTitle(""); setBody(""); }
    }
    setSending(false);
  };

  const tableHeaderClass = "text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-base font-semibold text-foreground tracking-tight">Notifications</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Send and manage platform notifications</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-1.5 mb-4">
            <Send className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs font-medium text-foreground">Send Global Notification</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title..." className="h-8 text-xs bg-muted/30 border-transparent focus-visible:border-border" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Message (optional)</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Notification body..." rows={3} className="text-xs bg-muted/30 border-transparent focus-visible:border-border resize-none" />
            </div>
            <Button onClick={sendNotification} disabled={sending} size="sm" className="w-full h-8 text-xs">
              {sending ? "Sending..." : "Send to All Users"}
            </Button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-card border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-medium text-foreground">Recent Notifications</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className={tableHeaderClass}>Title</TableHead>
                <TableHead className={tableHeaderClass}>Body</TableHead>
                <TableHead className={tableHeaderClass}>Read</TableHead>
                <TableHead className={tableHeaderClass}>Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <SkeletonTableRows rows={4} cols={4} />
              ) : notifications.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-xs">No notifications</TableCell></TableRow>
              ) : notifications.map((n) => (
                <TableRow key={n.id} className="hover:bg-muted/30 border-b border-border/50">
                  <TableCell className="font-medium text-foreground text-xs py-2.5">{n.title}</TableCell>
                  <TableCell className="text-muted-foreground text-xs py-2.5 max-w-[200px] truncate">{n.body || "—"}</TableCell>
                  <TableCell>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${n.is_read ? "bg-muted text-muted-foreground" : "bg-emerald-500/10 text-emerald-600"}`}>{n.is_read ? "Read" : "Unread"}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-[10px] py-2.5 tabular-nums">{new Date(n.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default AdminNotifications;
