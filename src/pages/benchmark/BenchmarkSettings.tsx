import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Key, Shield, Users } from "lucide-react";

const BenchmarkSettings = () => {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-lg font-bold">Benchmark Settings</h1>
        <p className="text-xs text-muted-foreground">Configure your benchmark platform</p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">API Configuration</h2>
        </div>
        <div className="p-3 bg-muted/30 rounded-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium">OpenAI API Key</p>
              <p className="text-[10px] text-muted-foreground">Used for benchmark execution and auto-scoring</p>
            </div>
            <Badge variant="default" className="text-[9px]">Configured</Badge>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Security & Access</h2>
        </div>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>• JWT-based authentication enabled</p>
          <p>• Role-based access control (RBAC) active</p>
          <p>• Rate limiting on API endpoints</p>
          <p>• Input validation on all forms</p>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Roles</h2>
        </div>
        <div className="space-y-2">
          {[
            { role: "Admin", desc: "Full access to all features" },
            { role: "Reviewer", desc: "Can review & override scores" },
            { role: "Viewer", desc: "Read-only access to tasks & results" },
          ].map((r) => (
            <div key={r.role} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
              <div>
                <p className="text-xs font-medium">{r.role}</p>
                <p className="text-[10px] text-muted-foreground">{r.desc}</p>
              </div>
              <Badge variant="outline" className="text-[9px]">Active</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default BenchmarkSettings;
