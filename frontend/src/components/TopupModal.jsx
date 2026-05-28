/**
 * TopupModal.jsx
 *
 * Wallet top-up flow that NEVER navigates away from the current page.
 * Includes token preservation for redirect scenarios & cookie-based auth support.
 *
 * Flow:
 *   1. User opens modal, types NPR amount → POST /payment/topup/initiate
 *   2. Backend returns { clientSecret, sessionId, summary }
 *   3. <EmbeddedCheckout> renders Stripe's card form inside the modal
 *   4. onComplete callback fires when Stripe form finishes — no redirect
 *   5. Poll GET /payment/topup/status?session_id=... until credited
 *   6. Show success/error inline, then close
 *
 * Dependencies:
 *   @stripe/react-stripe-js  @stripe/stripe-js
 *
 * Env vars:
 *   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
 *   VITE_API_BASE=http://localhost:5000
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";

// ─── Auth Utilities (import from your utils/auth.js) ─────────────────────────
// If you haven't created utils/auth.js yet, see the auth utilities section below
import { 
  getAuthToken, 
  authHeaders, 
  backupSession,
  restoreSession 
} from "../utils/auth";

// ─── Stripe singleton ─────────────────────────────────────────────────────────
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? ""
);

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:5000";
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS  = 5 * 60 * 1000; // 5 min

// ─── Phases ───────────────────────────────────────────────────────────────────
// "amount"   → user types NPR
// "checkout" → Stripe EmbeddedCheckout rendered
// "polling"  → Stripe done, waiting for webhook to credit wallet
// "success"  → wallet credited
// "error"    → something went wrong

export default function TopupModal({ isOpen, onClose, onSuccess }) {
  const [phase, setPhase]           = useState("amount");
  const [amountNpr, setAmountNpr]   = useState("");
  const [summary, setSummary]       = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [sessionId, setSessionId]   = useState(null);
  const [errorMsg, setErrorMsg]     = useState("");
  const [loading, setLoading]       = useState(false);
  const pollRef = useRef(null);

  // ─── Restore session on mount (handles redirect returns) ───────────────────
  useEffect(() => {
    if (isOpen) {
      const restored = restoreSession();
      if (restored) {
        console.log("✓ Session restored from sessionStorage");
      }
    }
  }, [isOpen]);

  // ─── Reset state when modal closes ─────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      stopPolling();
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

  // ─── Cleanup polling on unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => stopPolling();
  }, []);

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
      // Backup session BEFORE any API call (safety for edge-case redirects)
      backupSession();
      
      const res = await fetch(`${API_BASE}/payment/topup/initiate`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "include", // Critical for HttpOnly cookie auth
        body: JSON.stringify({ amountNpr: num }),
      });
      
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message ?? "Failed to initiate top-up");
      }

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
      console.error("Topup initiate error:", err);
      setErrorMsg(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Stripe EmbeddedCheckout completed callback ───────────────────────
  const handleCheckoutComplete = useCallback(() => {
    // Backup session again after Stripe interaction (belt & suspenders)
    backupSession();
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
          { 
            headers: authHeaders(),
            credentials: "include"
          }
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
          setErrorMsg("Payment failed or was cancelled. Please try again.");
          setPhase("error");
          return;
        }

        if (Date.now() > deadline) {
          stopPolling();
          setErrorMsg(
            "We couldn't confirm your payment in time. " +
            "If your card was charged, funds will appear shortly. " +
            "Please check your wallet balance or contact support."
          );
          setPhase("error");
        }
      } catch (err) {
        console.warn("Polling error (retrying):", err);
        // Keep polling on network hiccup
      }
    }, POLL_INTERVAL_MS);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // ─── Handle modal background click ─────────────────────────────────────────
  const handleOverlayClick = (e) => {
    // Only close if clicking the overlay, not the modal content
    if (e.target === e.currentTarget && phase !== "checkout" && phase !== "polling") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.modal}>

        {/* ── Header ── */}
        <div style={styles.header}>
          <div>
            <div style={styles.headerTitle}>Add Money to Wallet</div>
            {summary && phase !== "amount" && (
              <div style={styles.headerSub}>{summary.label}</div>
            )}
          </div>
          <button 
            style={styles.closeBtn} 
            onClick={onClose} 
            aria-label="Close modal"
            disabled={phase === "checkout" || phase === "polling"}
          >
            ✕
          </button>
        </div>

        {/* ── Phase: Amount entry ── */}
        {phase === "amount" && (
          <div style={styles.body}>
            <label style={styles.label}>Enter amount (NPR)</label>
            <div style={styles.inputRow}>
              <span style={styles.currency}>Rs</span>
              <input
                style={styles.input}
                type="number"
                min="100"
                step="100"
                placeholder="e.g. 1000"
                value={amountNpr}
                onChange={e => { 
                  setAmountNpr(e.target.value); 
                  setErrorMsg(""); 
                }}
                onKeyDown={e => e.key === "Enter" && !loading && handleInitiate()}
                autoFocus
                disabled={loading}
              />
            </div>
            
            {errorMsg && <div style={styles.errorText} role="alert">{errorMsg}</div>}
            
            <ExchangeHint amountNpr={parseFloat(amountNpr)} />
            
            <button
              style={{ 
                ...styles.primaryBtn, 
                opacity: loading || !amountNpr ? 0.7 : 1,
                cursor: loading || !amountNpr ? "not-allowed" : "pointer"
              }}
              onClick={handleInitiate}
              disabled={loading || !amountNpr}
            >
              {loading ? "Preparing payment…" : "Continue to Payment →"}
            </button>
            
            <div style={styles.securityNote}>
              🔒 Secured by Stripe • Your card details never touch our servers
            </div>
          </div>
        )}

        {/* ── Phase: Stripe EmbeddedCheckout ── */}
        {phase === "checkout" && clientSecret && (
          <div style={styles.checkoutWrap}>
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ 
                clientSecret, 
                onComplete: handleCheckoutComplete 
              }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
            <div style={styles.checkoutHint}>
              Enter your card details securely above. Do not close this window.
            </div>
          </div>
        )}

        {/* ── Phase: Polling ── */}
        {phase === "polling" && (
          <div style={styles.centreBody}>
            <Spinner />
            <div style={styles.pollingTitle}>Confirming your payment…</div>
            <div style={styles.pollingHint}>
              This usually takes just a few seconds. Please wait.
            </div>
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
                onClick={() => { 
                  setPhase("amount"); 
                  setErrorMsg(""); 
                  setAmountNpr("");
                }}
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const fetchRate = async () => {
      try {
        const res = await fetch(`${API_BASE}/payment/exchange-rate`, { 
          headers: authHeaders(),
          credentials: "include"
        });
        const d = await res.json();
        if (mounted && d.success) {
          setRate(d.usdToNpr);
        }
      } catch (err) {
        console.warn("Failed to fetch exchange rate:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    
    fetchRate();
    return () => { mounted = false; };
  }, []);

  if (loading || !rate || isNaN(amountNpr) || amountNpr < 1) return null;
  const usd = (amountNpr / rate).toFixed(2);

  return (
    <div style={styles.hint}>
      ≈ ${usd} USD · 1 USD = Rs {rate.toLocaleString()}
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
  securityNote: {
    fontSize: "11px", color: "#94A3B8", textAlign: "center", marginTop: "8px",
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
  checkoutHint: {
    fontSize: "12px", color: "#64748B", textAlign: "center", marginTop: "12px",
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
    fontSize: "16px", color: "#166534", fontWeight: 600,
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