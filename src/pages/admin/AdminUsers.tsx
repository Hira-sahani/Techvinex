import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
    ]);
    setUsers((profiles || []).map((p) => ({ ...p, roles: (roles || []).filter((r) => r.user_id === p.user_id).map((r) => r.role) })));
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter((u) => {
    const matchSearch = (u.full_name || "").toLowerCase().includes(search.toLowerCase()) || (u.email || "").toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.roles.includes(roleFilter);
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-foreground tracking-tight">Users</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage all platform users</p>
        </div>
        <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded tabular-nums">{users.length} total</span>
      </div>

      <div className="bg-card border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs bg-muted/30 border-transparent focus-visible:border-border" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Filter role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="employer">Employer</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Name</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Email</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Role</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Country</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Joined</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-xs">Loading users...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-xs">No users found</TableCell></TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id} className="group hover:bg-muted/30 border-b border-border/50">
                  <TableCell className="font-medium text-foreground text-xs py-2.5">{u.full_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs py-2.5">{u.email || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {u.roles.map((r: string) => (
                        <span key={r} className={`text-[10px] px-1.5 py-0.5 rounded ${r === "admin" ? "bg-red-500/10 text-red-600" : "bg-muted text-muted-foreground"}`}>{r}</span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs py-2.5">{u.country || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-[10px] py-2.5 tabular-nums">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs">
                        <DropdownMenuItem onClick={() => toast.info(`Profile: ${u.full_name || u.email}`)}>View Profile</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.info("Feature coming soon")}>Block User</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => toast.info("Feature coming soon")}>Delete User</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminUsers;
