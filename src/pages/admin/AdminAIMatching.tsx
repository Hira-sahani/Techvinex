import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Brain, Sliders, Activity, RefreshCw, Save, Zap, Target, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const defaultWeights = { skills: 35, experience: 25, interview: 20, education: 10, availability: 10 };

const mockMatchLogs = [
  { id: 1, candidate: "Rahul Sharma", role: "Senior React Dev", score: 92, skills: 95, experience: 88, interview: 90, matched: "2026-03-29 10:22", status: "matched" },
  { id: 2, candidate: "Priya Patel", role: "ML Engineer", score: 87, skills: 90, experience: 82, interview: 85, matched: "2026-03-29 09:45", status: "matched" },
  { id: 3, candidate: "Amit Kumar", role: "Backend Engineer", score: 45, skills: 50, experience: 40, interview: 38, matched: "2026-03-29 09:12", status: "mismatch" },
  { id: 4, candidate: "Sara Ali", role: "Data Scientist", score: 78, skills: 82, experience: 75, interview: 72, matched: "2026-03-28 18:30", status: "matched" },
  { id: 5, candidate: "Vikram Singh", role: "DevOps Lead", score: 34, skills: 30, experience: 45, interview: 25, matched: "2026-03-28 16:55", status: "mismatch" },
];

const AdminAIMatching = () => {
  const [weights, setWeights] = useState(defaultWeights);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [autoRematch, setAutoRematch] = useState(false);
  const [saving, setSaving] = useState(false);

  const total = weights.skills + weights.experience + weights.interview + weights.education + weights.availability;
  const isValid = total === 100;

  const updateWeight = (key: keyof typeof weights, value: number[]) => {
    setWeights(prev => ({ ...prev, [key]: value[0] }));
  };

  const handleSave = () => {
    if (!isValid) { toast.error("Weights must add up to 100%"); return; }
    setSaving(true);
    setTimeout(() => { setSaving(false); toast.success("AI matching weights saved"); }, 800);
  };

  const tableHeaderClass = "text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-foreground tracking-tight">AI Matching Control</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Configure scoring engine & monitor match quality</p>
        </div>
        <div className="flex items-center gap-2 bg-muted/40 rounded-md px-2.5 py-1.5 border border-border">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">AI Engine</span>
          <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${aiEnabled ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{aiEnabled ? "Active" : "Paused"}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[
          { label: "Matches Today", value: "142", icon: Target },
          { label: "Avg Score", value: "76.4", icon: TrendingUp },
          { label: "Mismatches", value: "8", icon: AlertTriangle },
          { label: "Processing", value: "3", icon: Zap },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-lg p-3.5">
            <div className="w-7 h-7 rounded-md bg-muted/60 flex items-center justify-center mb-3">
              <stat.icon className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold text-foreground leading-none tabular-nums">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1.5 uppercase tracking-wider font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3 bg-card border border-border rounded-lg">
          <div className="px-4 pt-4 pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-foreground">Scoring Weights</p>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded tabular-nums ${isValid ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
                Total: {total}%{isValid ? " ✓" : ""}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Adjust how each factor contributes to the final AI match score</p>
          </div>
          <div className="px-4 py-4 space-y-5">
            {([
              { key: "skills" as const, label: "Skills Match", desc: "Technical & soft skills alignment" },
              { key: "experience" as const, label: "Experience", desc: "Years & relevance of work history" },
              { key: "interview" as const, label: "Interview Score", desc: "AI interview performance rating" },
              { key: "education" as const, label: "Education", desc: "Degree & institution quality" },
              { key: "availability" as const, label: "Availability", desc: "Start date & time zone fit" },
            ]).map((item) => (
              <div key={item.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-foreground">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground tabular-nums w-10 text-right">{weights[item.key]}%</span>
                </div>
                <Slider value={[weights[item.key]]} onValueChange={(v) => updateWeight(item.key, v)} max={100} step={5} />
              </div>
            ))}

            <div className="flex gap-2 pt-3 border-t border-border">
              <Button onClick={handleSave} disabled={!isValid || saving} size="sm" className="gap-1.5 h-7 text-xs">
                <Save className="w-3 h-3" /> {saving ? "Saving..." : "Save Weights"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setWeights(defaultWeights); toast.info("Weights reset"); }} className="gap-1.5 h-7 text-xs text-muted-foreground">
                <RefreshCw className="w-3 h-3" /> Reset
              </Button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-card border border-border rounded-lg">
          <div className="px-4 pt-4 pb-3 border-b border-border">
            <div className="flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-medium text-foreground">Engine Config</p>
            </div>
          </div>
          <div className="px-4 py-4 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border">
              <div>
                <p className="text-xs font-medium text-foreground">Auto Re-match</p>
                <p className="text-[10px] text-muted-foreground">Re-run matching when weights change</p>
              </div>
              <Switch checked={autoRematch} onCheckedChange={setAutoRematch} />
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Score Thresholds</p>
              {[
                { label: "Strong Match", threshold: "≥ 80" },
                { label: "Good Match", threshold: "60–79" },
                { label: "Weak Match", threshold: "40–59" },
                { label: "Mismatch", threshold: "< 40" },
              ].map((t) => (
                <div key={t.label} className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/20 border border-border/50">
                  <span className="text-xs text-muted-foreground">{t.label}</span>
                  <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded tabular-nums">{t.threshold}</span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-md bg-muted/30 border border-border">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Activity className="w-3 h-3 text-muted-foreground" />
                <p className="text-xs font-medium text-foreground">Engine Health</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Latency: 42ms avg · Uptime: 99.97%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs font-medium text-foreground">Recent Match Logs</p>
          </div>
          <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded tabular-nums">{mockMatchLogs.length} entries</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className={tableHeaderClass}>Candidate</TableHead>
              <TableHead className={tableHeaderClass}>Role</TableHead>
              <TableHead className={tableHeaderClass}>Skills</TableHead>
              <TableHead className={tableHeaderClass}>Exp</TableHead>
              <TableHead className={tableHeaderClass}>Interview</TableHead>
              <TableHead className={tableHeaderClass}>Score</TableHead>
              <TableHead className={tableHeaderClass}>Status</TableHead>
              <TableHead className={tableHeaderClass}>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockMatchLogs.map((log) => (
              <TableRow key={log.id} className="hover:bg-muted/30 border-b border-border/50">
                <TableCell className="font-medium text-foreground text-xs py-2.5">{log.candidate}</TableCell>
                <TableCell className="text-muted-foreground text-xs py-2.5">{log.role}</TableCell>
                <TableCell className="tabular-nums text-xs text-muted-foreground py-2.5">{log.skills}</TableCell>
                <TableCell className="tabular-nums text-xs text-muted-foreground py-2.5">{log.experience}</TableCell>
                <TableCell className="tabular-nums text-xs text-muted-foreground py-2.5">{log.interview}</TableCell>
                <TableCell>
                  <span className={`font-semibold tabular-nums text-xs ${log.score >= 80 ? "text-emerald-600" : log.score >= 60 ? "text-foreground" : log.score >= 40 ? "text-muted-foreground" : "text-red-500"}`}>
                    {log.score}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${log.status === "matched" ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"}`}>{log.status}</span>
                </TableCell>
                <TableCell className="text-muted-foreground text-[10px] py-2.5 tabular-nums">{log.matched}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminAIMatching;
