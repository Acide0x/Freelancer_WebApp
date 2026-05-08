// overview.jsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { TrendingUp, CheckCircle2, Wallet, Lock } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:5000";

function authHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  };
}

const revenueData = [
  { month: "Jan", revenue: 2400 },
  { month: "Feb", revenue: 3200 },
  { month: "Mar", revenue: 2800 },
  { month: "Apr", revenue: 3900 },
  { month: "May", revenue: 4200 },
  { month: "Jun", revenue: 5100 },
];

export default function DashboardOverview() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/payment/wallet`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (d.success) setWallet(d.wallet); })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n) => (n || 0).toLocaleString();

  return (
    <div className="space-y-6">
      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Wallet Balance */}
        <Card className="border-border/50 bg-gradient-to-br from-primary/10 to-accent/10 backdrop-blur hover:bg-card/70 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Wallet Balance</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {loading ? "…" : `Rs ${fmt(wallet?.balanceNpr)}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Available to spend</p>
          </CardContent>
        </Card>

        {/* Locked in Escrow */}
        <Card className="border-border/50 bg-card/50 backdrop-blur hover:bg-card/70 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Locked in Escrow</CardTitle>
            <Lock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {loading ? "…" : `Rs ${fmt(wallet?.lockedNpr)}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Held for active jobs</p>
          </CardContent>
        </Card>

        {/* Total Earned */}
        <Card className="border-border/50 bg-card/50 backdrop-blur hover:bg-card/70 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-chart-1" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {loading ? "…" : `Rs ${fmt(wallet?.totalEarnedNpr)}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime earnings</p>
          </CardContent>
        </Card>

        {/* Total Spent */}
        <Card className="border-border/50 bg-card/50 backdrop-blur hover:bg-card/70 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {loading ? "…" : `Rs ${fmt(wallet?.totalSpentNpr)}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across all jobs</p>
          </CardContent>
        </Card>

      </div>

      {/* Revenue Chart */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Monthly earnings overview</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" />
              <Tooltip
                contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
                cursor={{ fill: "rgba(0,0,0,0.1)" }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-chart-1)"
                fillOpacity={1}
                fill="url(#colorRevenue)"
                name="Revenue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}