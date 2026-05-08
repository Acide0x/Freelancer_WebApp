/**
 * TopupModal.jsx
 *
 * Wallet top-up flow that NEVER navigates away from the current page.
 *
 * Flow:
 *   1. User opens modal, types NPR amount → POST /payment/topup/initiate
 *   2. Backend returns { clientSecret, sessionId, summary }
 *   3. <EmbeddedCheckout> renders Stripe's card form inside the modal
 *   4. After Stripe calls return_url (with ?session_id=...) we intercept it
 *      using the onComplete callback — no redirect happens
 *   5. Poll GET /payment/topup/status?session_id=... every 2 s until credited
 *   6. Show success (green) or error (red) inline, then close
 *
 * Usage:
 *   <TopupModal isOpen={open} onClose={() => setOpen(false)} onSuccess={refetchWallet} />
 *
 * Dependencies (add to package.json if not already there):
 *   @stripe/react-stripe-js  @stripe/stripe-js
 *
 * Env var needed in your Vite/CRA setup:
 *   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";

// ─── Stripe singleton ─────────────────────────────────────────────────────────
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? ""
);

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:5000";
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS  = 5 * 60 * 1000; // 5 min

function authHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  };
}

// ─── Phases ───────────────────────────────────────────────────────────────────
// "amount"   → user types NPR
// "checkout" → Stripe EmbeddedCheckout rendered
// "polling"  → Stripe done, waiting for webhook to credit wallet
// "success"  → wallet credited
// "error"    → something went wrong

export default function TopupModal({ isOpen, onClose, onSuccess }) {
  const [phase, setPhase]           = useState("amount");
  const [amountNpr, setAmountNpr]   = useState("");
  const [summary, setSummary]       = useState(null);   // { amountNpr, chargedUsd, rateUsed }
  const [clientSecret, setClientSecret] = useState(null);
  const [sessionId, setSessionId]   = useState(null);
  const [errorMsg, setErrorMsg]     = useState("");
  const [loading, setLoading]       = useState(false);
  const pollRef = useRef(null);

  // Reset when modal opens / closes
  useEffect(() => {
    if (!isOpen) {
      stopPolling();
      // Small delay before resetting so the close animation plays
      const t = setTimeout(() => {
        setPhase("amount");
        setAmountNpr("");
        setSummary(null);
        setClientSecret(null);
        setSessionId(null);
        setErrorMsg("");
        setLoading(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // ── Step 1: Initiate top-up ──────────────────────────────────────────────────
  const handleInitiate = async () => {
    const num = parseFloat(amountNpr);
    if (isNaN(num) || num < 100) {
      setErrorMsg("Minimum top-up is Rs 100");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/payment/topup/initiate`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ amountNpr: num }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message ?? "Failed to initiate");

      setClientSecret(data.clientSecret);
      setSessionId(data.sessionId);
      setSummary({
        amountNpr:  data.amountNpr,
        chargedUsd: data.chargedUsd,
        rateUsed:   data.rateUsed,
        label:      data.summary,
      });
      setPhase("checkout");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Stripe EmbeddedCheckout completed callback ───────────────────────
  // Called when Stripe's embedded form finishes (success OR close-without-paying).
  // We then poll to find out which.
  const handleCheckoutComplete = useCallback(() => {
    setPhase("polling");
    startPolling(sessionId);
  }, [sessionId]);

  // ── Step 3: Poll /payment/topup/status ──────────────────────────────────────
  const startPolling = (sid) => {
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/payment/topup/status?session_id=${sid}`,
          { headers: authHeaders() }
        );
        const data = await res.json();

        if (data.success && data.status === "completed" && data.credited) {
          stopPolling();
          setSummary(prev => ({ ...prev, amountNpr: data.amountNpr }));
          setPhase("success");
          onSuccess?.();
          return;
        }

        if (data.status === "failed") {
          stopPolling();
          setErrorMsg("Payment failed or was cancelled.");
          setPhase("error");
          return;
        }

        if (Date.now() > deadline) {
          stopPolling();
          setErrorMsg(
            "We couldn't confirm your payment in time. " +
            "If your card was charged, funds will appear shortly. " +
            "Please check your transaction history."
          );
          setPhase("error");
        }
      } catch {
        // Network hiccup — keep polling
      }
    }, POLL_INTERVAL_MS);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), []);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>

        {/* ── Header ── */}
        <div style={styles.header}>
          <div>
            <div style={styles.headerTitle}>Add Money</div>
            {summary && phase !== "amount" && (
              <div style={styles.headerSub}>{summary.label}</div>
            )}
          </div>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* ── Phase: Amount entry ── */}
        {phase === "amount" && (
          <div style={styles.body}>
            <label style={styles.label}>Amount (NPR)</label>
            <div style={styles.inputRow}>
              <span style={styles.currency}>Rs</span>
              <input
                style={styles.input}
                type="number"
                min="100"
                placeholder="e.g. 1000"
                value={amountNpr}
                onChange={e => { setAmountNpr(e.target.value); setErrorMsg(""); }}
                onKeyDown={e => e.key === "Enter" && handleInitiate()}
                autoFocus
              />
            </div>
            {errorMsg && <div style={styles.errorText}>{errorMsg}</div>}
            <ExchangeHint amountNpr={parseFloat(amountNpr)} />
            <button
              style={{ ...styles.primaryBtn, opacity: loading ? 0.7 : 1 }}
              onClick={handleInitiate}
              disabled={loading}
            >
              {loading ? "Preparing…" : "Continue to Payment →"}
            </button>
          </div>
        )}

        {/* ── Phase: Stripe EmbeddedCheckout ── */}
        {phase === "checkout" && clientSecret && (
          <div style={styles.checkoutWrap}>
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ clientSecret, onComplete: handleCheckoutComplete }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}

        {/* ── Phase: Polling ── */}
        {phase === "polling" && (
          <div style={styles.centreBody}>
            <Spinner />
            <div style={styles.pollingTitle}>Confirming your payment…</div>
            <div style={styles.pollingHint}>This usually takes a few seconds.</div>
          </div>
        )}

        {/* ── Phase: Success ── */}
        {phase === "success" && (
          <div style={styles.centreBody}>
            <div style={styles.successIcon}>✓</div>
            <div style={styles.successTitle}>Payment Successful!</div>
            <div style={styles.successAmount}>
              Rs {summary?.amountNpr?.toLocaleString()} added to your wallet
            </div>
            {summary?.chargedUsd && (
              <div style={styles.successMeta}>
                Charged: ${summary.chargedUsd} USD · Rate: 1 USD = Rs {summary.rateUsed}
              </div>
            )}
            <button style={styles.primaryBtn} onClick={onClose}>
              Done
            </button>
          </div>
        )}

        {/* ── Phase: Error ── */}
        {phase === "error" && (
          <div style={styles.centreBody}>
            <div style={styles.errorIcon}>✕</div>
            <div style={styles.errorTitle}>Payment Not Completed</div>
            <div style={styles.errorBody}>{errorMsg}</div>
            <div style={styles.errorActions}>
              <button style={styles.ghostBtn} onClick={onClose}>Close</button>
              <button
                style={styles.primaryBtn}
                onClick={() => { setPhase("amount"); setErrorMsg(""); }}
              >
                Try Again
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Live exchange hint shown while user types the NPR amount */
function ExchangeHint({ amountNpr }) {
  const [rate, setRate] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/payment/exchange-rate`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => d.success && setRate(d.usdToNpr))
      .catch(() => {});
  }, []);

  if (!rate || isNaN(amountNpr) || amountNpr < 1) return null;
  const usd = (amountNpr / rate).toFixed(2);

  return (
    <div style={styles.hint}>
      ≈ ${usd} USD · 1 USD = Rs {rate}
    </div>
  );
}

function Spinner() {
  return (
    <div style={styles.spinner}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={styles.spinnerCircle} />
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 9999,
    padding: "16px",
  },
  modal: {
    background: "#fff",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "480px",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    padding: "20px 24px 16px",
    borderBottom: "1px solid #F0F0F0",
  },
  headerTitle: {
    fontSize: "18px", fontWeight: 700, color: "#111",
  },
  headerSub: {
    fontSize: "12px", color: "#888", marginTop: "2px",
  },
  closeBtn: {
    background: "none", border: "none", cursor: "pointer",
    fontSize: "18px", color: "#999", padding: "0 0 0 12px",
    lineHeight: 1,
  },
  body: {
    padding: "24px",
    display: "flex", flexDirection: "column", gap: "12px",
  },
  label: {
    fontSize: "13px", fontWeight: 600, color: "#555",
  },
  inputRow: {
    display: "flex", alignItems: "center",
    border: "1.5px solid #E0E0E0", borderRadius: "10px",
    overflow: "hidden",
  },
  currency: {
    padding: "0 12px",
    fontSize: "15px", fontWeight: 600, color: "#555",
    background: "#F8F8F8",
    borderRight: "1.5px solid #E0E0E0",
    height: "100%", display: "flex", alignItems: "center",
    paddingTop: "12px", paddingBottom: "12px",
  },
  input: {
    flex: 1, border: "none", outline: "none",
    padding: "12px 14px",
    fontSize: "16px", fontWeight: 500,
    background: "transparent",
  },
  hint: {
    fontSize: "12px", color: "#888", marginTop: "-4px",
  },
  errorText: {
    fontSize: "13px", color: "#DC2626",
    background: "#FEF2F2", padding: "8px 12px", borderRadius: "8px",
  },
  primaryBtn: {
    background: "#1D4ED8", color: "#fff",
    border: "none", borderRadius: "10px",
    padding: "13px 20px",
    fontSize: "15px", fontWeight: 600,
    cursor: "pointer", marginTop: "4px",
    transition: "background 0.15s",
  },
  ghostBtn: {
    background: "transparent", color: "#555",
    border: "1.5px solid #E0E0E0", borderRadius: "10px",
    padding: "13px 20px",
    fontSize: "15px", fontWeight: 600,
    cursor: "pointer",
  },
  checkoutWrap: {
    padding: "16px",
  },
  centreBody: {
    padding: "40px 28px",
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: "12px",
    textAlign: "center",
  },
  spinner: {
    marginBottom: "8px",
  },
  spinnerCircle: {
    width: 48, height: 48,
    border: "4px solid #E0E0E0",
    borderTopColor: "#1D4ED8",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  pollingTitle: {
    fontSize: "18px", fontWeight: 700, color: "#111",
  },
  pollingHint: {
    fontSize: "14px", color: "#888",
  },
  successIcon: {
    width: 64, height: 64, borderRadius: "50%",
    background: "#DCFCE7", color: "#16A34A",
    fontSize: "28px", fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  successTitle: {
    fontSize: "20px", fontWeight: 700, color: "#111",
  },
  successAmount: {
    fontSize: "16px", color: "#16A34A", fontWeight: 600,
  },
  successMeta: {
    fontSize: "12px", color: "#888", marginBottom: "8px",
  },
  errorIcon: {
    width: 64, height: 64, borderRadius: "50%",
    background: "#FEE2E2", color: "#DC2626",
    fontSize: "24px", fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  errorTitle: {
    fontSize: "20px", fontWeight: 700, color: "#111",
  },
  errorBody: {
    fontSize: "14px", color: "#666",
    maxWidth: "340px", lineHeight: 1.5,
    marginBottom: "8px",
  },
  errorActions: {
    display: "flex", gap: "12px", marginTop: "4px",
  },
};