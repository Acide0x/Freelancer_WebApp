// earnings.jsx — wired to real wallet API
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownLeft, DollarSign, CreditCard, Wallet, RefreshCw, TrendingUp, Lock } from "lucide-react";

const API_BASE = "http://localhost:5000";

function authHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  };
}

// Map transaction type → display config
const TX_CONFIG = {
  topup:          { label: "Wallet Top-up",    icon: <ArrowDownLeft className="w-4 h-4 text-green-500" />,  bg: "bg-green-500/20",  color: "text-green-500",  dir: "+" },
  escrow_lock:    { label: "Escrow Locked",     icon: <Lock className="w-4 h-4 text-blue-500" />,            bg: "bg-blue-500/20",   color: "text-blue-500",   dir: "-" },
  escrow_release: { label: "Escrow Released",   icon: <ArrowDownLeft className="w-4 h-4 text-green-500" />,  bg: "bg-green-500/20",  color: "text-green-500",  dir: "+" },
  escrow_refund:  { label: "Escrow Refund",     icon: <ArrowDownLeft className="w-4 h-4 text-green-500" />,  bg: "bg-green-500/20",  color: "text-green-500",  dir: "+" },
  platform_fee:   { label: "Platform Fee",      icon: <ArrowUpRight className="w-4 h-4 text-red-500" />,     bg: "bg-red-500/20",    color: "text-red-500",    dir: "-" },
  withdrawal:     { label: "Withdrawal",        icon: <ArrowUpRight className="w-4 h-4 text-red-500" />,     bg: "bg-red-500/20",    color: "text-red-500",    dir: "-" },
  bonus:          { label: "Admin Bonus",       icon: <DollarSign className="w-4 h-4 text-yellow-500" />,    bg: "bg-yellow-500/20", color: "text-yellow-500", dir: "+" },
  dispute_refund: { label: "Dispute Refund",    icon: <ArrowDownLeft className="w-4 h-4 text-green-500" />,  bg: "bg-green-500/20",  color: "text-green-500",  dir: "+" },
};

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Withdraw Modal ───────────────────────────────────────────────────────────
const VALID_METHODS = ["bank", "esewa", "khalti", "cash"];

function WithdrawModal({ wallet, onClose, onWithdrawn }) {
  const [amount,  setAmount]  = useState("");
  const [method,  setMethod]  = useState("bank");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState(null);

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 100) return setErr("Minimum withdrawal is Rs 100.");
    if (amt > (wallet?.balanceNpr || 0)) return setErr("Amount exceeds your available balance.");
    if (!details.trim()) return setErr("Please enter your account details.");

    setLoading(true); setErr(null);
    try {
      const res  = await fetch(`${API_BASE}/payment/withdraw`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ amountNpr: amt, method, accountDetails: details }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Withdrawal failed");
      onWithdrawn(data);
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="bg-card border border-border/50 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-foreground">Withdraw Funds</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">×</button>
        </div>

        <div className="bg-secondary/30 rounded-lg p-3 mb-4 flex justify-between text-sm">
          <span className="text-muted-foreground">Available balance</span>
          <span className="font-bold text-foreground">Rs {(wallet?.balanceNpr || 0).toLocaleString()}</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Amount (NPR)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 1000" min="100"
              className="w-full px-3 py-2 rounded-lg border border-border bg-transparent text-sm text-foreground outline-none focus:border-primary" />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground outline-none">
              {VALID_METHODS.map(m => (
                <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              {method === "bank" ? "Account Number / Bank Name" :
               method === "esewa" || method === "khalti" ? "Registered Phone / ID" : "Details"}
            </label>
            <input type="text" value={details} onChange={e => setDetails(e.target.value)}
              placeholder="Enter your account details"
              className="w-full px-3 py-2 rounded-lg border border-border bg-transparent text-sm text-foreground outline-none focus:border-primary" />
          </div>

          {err && <p className="text-red-500 text-xs bg-red-500/10 rounded-lg px-3 py-2">{err}</p>}

          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1 bg-transparent">Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1 bg-primary hover:bg-primary/90">
              {loading ? "Requesting…" : "Request Withdrawal"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Topup Modal ──────────────────────────────────────────────────────────────
function TopupModal({ onClose }) {
  const [amount,   setAmount]   = useState("");
  const [rate,     setRate]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/payment/exchange-rate`, { headers: authHeaders() })
      .then(r => r.json()).then(d => setRate(d.usdToNpr)).catch(() => {});
  }, []);

  const handlePay = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 100) return setErr("Minimum top-up is Rs 100.");
    setLoading(true); setErr(null);
    try {
      const res  = await fetch(`${API_BASE}/payment/topup/initiate`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ amountNpr: amt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to initiate top-up");

      // Save intent — no escrow for a plain wallet topup
      sessionStorage.setItem("stripe_escrow_intent", JSON.stringify({
        returnTo: window.location.pathname,
      }));

      window.location.href = data.checkoutUrl;
    } catch (e) { setErr(e.message); setLoading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="bg-card border border-border/50 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-foreground">💳 Top Up Wallet</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Amount (NPR)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 1000" min="100"
              className="w-full px-3 py-2 rounded-lg border border-border bg-transparent text-sm text-foreground outline-none focus:border-primary" />
            {rate && amount && !isNaN(parseFloat(amount)) && (
              <p className="text-xs text-muted-foreground mt-1">
                ≈ ${(parseFloat(amount) / rate).toFixed(2)} USD charged via Stripe
              </p>
            )}
          </div>

          {err && <p className="text-red-500 text-xs bg-red-500/10 rounded-lg px-3 py-2">{err}</p>}

          <div className="bg-blue-500/10 rounded-lg px-3 py-2 text-xs text-blue-400">
            You'll be redirected to Stripe and returned here after payment.
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">Cancel</Button>
            <Button onClick={handlePay} disabled={loading} className="flex-1 bg-primary hover:bg-primary/90">
              {loading ? "Redirecting…" : "Pay via Stripe"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Earnings Section ────────────────────────────────────────────────────
export default function EarningsSection() {
  const [wallet,       setWallet]       = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [typeFilter,   setTypeFilter]   = useState("");
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showTopup,    setShowTopup]    = useState(false);

  const fetchWallet = async (p = 1, type = "") => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: p, limit: 10, ...(type ? { type } : {}) });
      const res    = await fetch(`${API_BASE}/payment/wallet?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load wallet");
      const data = await res.json();
      setWallet(data.wallet);
      setTransactions(data.transactions || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWallet(page, typeFilter); }, [page, typeFilter]);

  // Compute quick stats from transactions
  const earned  = transactions.filter(t => t.direction === "credit" && t.type !== "topup")
                              .reduce((s, t) => s + (t.amountNpr || 0), 0);
  const pending = transactions.filter(t => t.status === "pending")
                              .reduce((s, t) => s + (t.amountNpr || 0), 0);

  return (
    <div className="space-y-6">
      {showWithdraw && (
        <WithdrawModal wallet={wallet} onClose={() => setShowWithdraw(false)}
          onWithdrawn={() => { fetchWallet(1, typeFilter); }} />
      )}
      {showTopup && <TopupModal onClose={() => setShowTopup(false)} />}

      {/* ── Wallet Overview ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50 bg-gradient-to-br from-primary/10 to-accent/10 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Wallet Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-3xl font-bold text-foreground/30">Loading…</div>
            ) : error ? (
              <div className="text-sm text-red-500">{error}</div>
            ) : (
              <>
                <div className="text-4xl font-bold text-foreground">
                  Rs {(wallet?.balanceNpr || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Available for withdrawal</p>
                {(wallet?.lockedNpr || 0) > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-yellow-500">
                    <Lock className="w-3 h-3" />
                    Rs {wallet.lockedNpr.toLocaleString()} locked in escrow
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={() => setShowTopup(true)} className="flex-1 bg-primary hover:bg-primary/90">
              💳 Top Up
            </Button>
            <Button onClick={() => setShowWithdraw(true)} variant="outline" className="flex-1 bg-transparent">
              💸 Withdraw
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              Rs {(wallet?.totalEarnedNpr || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Lifetime earnings</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <CreditCard className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              Rs {pending.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              Rs {(wallet?.totalSpentNpr || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total spending</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Transactions ─────────────────────────────────────────────────────── */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>All wallet activity</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
                className="text-xs px-2 py-1.5 rounded-lg border border-border bg-card text-foreground outline-none">
                <option value="">All types</option>
                {Object.keys(TX_CONFIG).map(k => (
                  <option key={k} value={k}>{TX_CONFIG[k].label}</option>
                ))}
              </select>
              <Button size="sm" variant="ghost" onClick={() => fetchWallet(page, typeFilter)}
                className="p-1.5">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading transactions…</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No transactions yet.</div>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => {
                const cfg = TX_CONFIG[tx.type] || {
                  label: tx.type, icon: <DollarSign className="w-4 h-4" />,
                  bg: "bg-secondary", color: "text-foreground", dir: "",
                };
                const isCredit = tx.direction === "credit";
                return (
                  <div key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${cfg.bg}`}>{cfg.icon}</div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{cfg.label}</p>
                        {tx.job && (
                          <p className="text-xs text-muted-foreground">Job: {tx.job.title || tx.job}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                        {tx.note && (
                          <p className="text-xs text-muted-foreground/60 max-w-xs truncate">{tx.note}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <span className={`font-semibold text-sm ${isCredit ? "text-green-500" : "text-red-500"}`}>
                          {isCredit ? "+" : "-"}Rs {(tx.amountNpr || 0).toLocaleString()}
                        </span>
                        {tx.stripe?.chargedUsd && (
                          <p className="text-xs text-muted-foreground">${tx.stripe.chargedUsd} USD</p>
                        )}
                      </div>
                      <Badge variant="outline"
                        className={
                          tx.status === "completed" ? "bg-green-500/20 text-green-600" :
                          tx.status === "pending"   ? "bg-yellow-500/20 text-yellow-600" :
                          tx.status === "failed"    ? "bg-red-500/20 text-red-600" :
                                                      "bg-secondary text-muted-foreground"
                        }>
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-border/50">
              <Button size="sm" variant="outline" className="bg-transparent"
                disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                ← Prev
              </Button>
              <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
              <Button size="sm" variant="outline" className="bg-transparent"
                disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                Next →
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}