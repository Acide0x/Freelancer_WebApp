// earnings.jsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownLeft, DollarSign, CreditCard } from "lucide-react";

const walletBalance = 5234.5;

const transactions = [
  {
    id: 1,
    type: "earning",
    description: "Project: React Dashboard",
    amount: 1200,
    date: "Dec 5, 2024",
    status: "completed",
  },
  {
    id: 2,
    type: "earning",
    description: "Project: UI Design System",
    amount: 850,
    date: "Dec 3, 2024",
    status: "completed",
  },
  { id: 3, type: "withdrawal", description: "Bank Transfer", amount: -1000, date: "Dec 1, 2024", status: "completed" },
  {
    id: 4,
    type: "earning",
    description: "Project: API Integration",
    amount: 500,
    date: "Nov 28, 2024",
    status: "completed",
  },
  {
    id: 5,
    type: "earning",
    description: "Milestone: Landing Page",
    amount: 750,
    date: "Nov 25, 2024",
    status: "pending",
  },
];

const withdrawalMethods = [
  { id: 1, name: "Bank Account", last4: "****4521", type: "bank" },
  { id: 2, name: "PayPal", email: "user@email.com", type: "paypal" },
];

export default function EarningsSection() {
  return (
    <div className="space-y-6">
      {/* Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50 bg-gradient-to-br from-primary/10 to-accent/10 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Wallet Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-4xl font-bold text-foreground">${walletBalance.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Available for withdrawal</p>
              </div>
              <DollarSign className="w-12 h-12 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button className="flex-1 bg-primary hover:bg-primary/90">Withdraw Funds</Button>
            <Button variant="outline" className="flex-1 bg-transparent">
              View Invoice
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <ArrowUpRight className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">$4,200</div>
            <p className="text-xs text-muted-foreground">5 projects completed</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <CreditCard className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">$1,500</div>
            <p className="text-xs text-muted-foreground">Awaiting milestone completion</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">All Time Earnings</CardTitle>
            <DollarSign className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">$28,750</div>
            <p className="text-xs text-muted-foreground">Total earnings since join</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Recent earnings and withdrawals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${tx.type === "earning" ? "bg-green-500/20" : "bg-red-500/20"}`}>
                    {tx.type === "earning" ? (
                      <ArrowDownLeft className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">{tx.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${tx.type === "earning" ? "text-green-500" : "text-red-500"}`}>
                    {tx.type === "earning" ? "+" : "-"}${Math.abs(tx.amount)}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      tx.status === "completed"
                        ? "bg-green-500/20 text-green-600"
                        : "bg-yellow-500/20 text-yellow-600"
                    }
                  >
                    {tx.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Methods */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Withdrawal Methods</CardTitle>
          <CardDescription>Manage your payment methods</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {withdrawalMethods.map((method) => (
            <div key={method.id} className="flex items-center justify-between p-3 border border-border/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-lg">
                  <CreditCard className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{method.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {method.type === "bank" ? method.last4 : method.email}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="ghost">
                Edit
              </Button>
            </div>
          ))}
          <Button variant="outline" className="w-full bg-transparent">
            Add Payment Method
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}