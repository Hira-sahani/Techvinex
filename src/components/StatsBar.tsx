import { useLang } from "@/contexts/LangContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeRealtime } from "@/lib/realtimeBus";

const formatValue = (key: string, value: number): string => {
  if (key === "avg_pay_hourly") {
    return value > 0 ? `$${Math.round(value)}/hr` : "$0/hr";
  }
  if (key === "roles_created") {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return `${Math.round(value)}`;
  }
  if (key === "daily_payouts") {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M+`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k+`;
    return `$${Math.round(value)}`;
  }
  return `${value}`;
};

const StatsBar = () => {
  const { t } = useLang();
  const [statsData, setStatsData] = useState<Record<string, number>>({
    avg_pay_hourly: 0,
    roles_created: 0,
    daily_payouts: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase
        .from("platform_stats")
        .select("stat_key, stat_value");
      if (data) {
        const mapped: Record<string, number> = {};
        data.forEach((row) => {
          mapped[row.stat_key] = Number(row.stat_value);
        });
        setStatsData(mapped);
      }
    };
    fetchStats();

    // Multiplexed onto the shared global realtime channel.
    const unsubscribe = subscribeRealtime({
      table: "platform_stats",
      scope: "global",
      handler: (payload: any) => {
        const row = payload.new;
        if (row?.stat_key) {
          setStatsData((prev) => ({
            ...prev,
            [row.stat_key]: Number(row.stat_value),
          }));
        }
      },
    });

    return unsubscribe;
  }, []);

  const stats = [
    { label: t("stats.avgPay"), value: formatValue("avg_pay_hourly", statsData.avg_pay_hourly ?? 0) },
    { label: t("stats.rolesCreated"), value: formatValue("roles_created", statsData.roles_created ?? 0) },
    { label: t("stats.dailyPayouts"), value: formatValue("daily_payouts", statsData.daily_payouts ?? 0) },
  ];

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-6 md:gap-8 py-2.5 sm:py-3 px-4 sm:px-6 rounded-full border border-border bg-background shadow-card mx-auto w-fit max-w-full overflow-x-auto">
      {stats.map((stat, i) => (
        <div key={stat.label} className="flex items-center gap-2 sm:gap-3 shrink-0">
          {i > 0 && <div className="w-px h-6 sm:h-8 bg-border" />}
          <div className="text-center sm:text-left">
            <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">{stat.label}</p>
            <p className="text-xs sm:text-sm font-semibold text-foreground">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsBar;
