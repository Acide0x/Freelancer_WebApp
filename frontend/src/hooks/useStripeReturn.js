/**
 * useStripeReturn.js
 *
 * Drop this hook into your Wallet page (or wherever the return_url points).
 * It detects ?session_id= in the URL, polls for the result, and returns
 * a status object you can render inline — no separate success/cancel routes needed.
 *
 * Usage in your WalletPage.jsx:
 *
 *   import useStripeReturn from "./useStripeReturn";
 *
 *   function WalletPage() {
 *     const { status, amountNpr, errorMsg, dismiss } = useStripeReturn({ onSuccess: refetchWallet });
 *
 *     return (
 *       <>
 *         {status === "success" && (
 *           <SuccessBanner amountNpr={amountNpr} onDismiss={dismiss} />
 *         )}
 *         {status === "error" && (
 *           <ErrorBanner message={errorMsg} onDismiss={dismiss} />
 *         )}
 *         {status === "polling" && <PollingBanner />}
 *         ...rest of page...
 *       </>
 *     );
 *   }
 */

import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:5000";
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 min

function authHeaders() {
    return {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
    };
}

/**
 * @param {{ onSuccess?: () => void }} options
 * @returns {{ status: "idle"|"polling"|"success"|"error", amountNpr: number|null, errorMsg: string, dismiss: () => void }}
 */
export default function useStripeReturn({ onSuccess } = {}) {
    const [status, setStatus] = useState("idle");
    const [amountNpr, setAmountNpr] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");
    const pollRef = useRef(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get("session_id");

        // Nothing to do if no session_id in URL
        if (!sessionId) return;

        // Clean the URL immediately so a refresh doesn't re-trigger
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, "", cleanUrl);

        setStatus("polling");

        const deadline = Date.now() + POLL_TIMEOUT_MS;

        pollRef.current = setInterval(async () => {
            try {
                const res = await fetch(
                    `${API_BASE}/payment/topup/status?session_id=${sessionId}`,
                    { headers: authHeaders() }
                );
                const data = await res.json();

                if (data.success && data.status === "completed" && data.credited) {
                    stop();
                    onSuccess?.();
                    window.location.reload();
                    return;
                }

                if (data.status === "failed") {
                    stop();
                    setErrorMsg("Your payment did not go through. Please try again.");
                    setStatus("error");
                    return;
                }

                if (Date.now() > deadline) {
                    stop();
                    setErrorMsg(
                        "Payment confirmation is taking longer than expected. " +
                        "If your card was charged, funds will appear shortly."
                    );
                    setStatus("error");
                }
            } catch {
                // Network blip — keep polling
            }
        }, POLL_INTERVAL_MS);

        return () => stop();
    }, []);

    const stop = () => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    };

    const dismiss = () => {
        stop();
        setStatus("idle");
        setAmountNpr(null);
        setErrorMsg("");
    };

    return { status, amountNpr, errorMsg, dismiss };
}

// ─── Ready-made banner components ─────────────────────────────────────────────

export function SuccessBanner({ amountNpr, onDismiss }) {
    return (
        <div style={bannerStyles.success}>
            <span style={bannerStyles.icon}>✓</span>
            <div>
                <strong>Rs {amountNpr?.toLocaleString()} added to your wallet!</strong>
                <div style={{ fontSize: "13px", marginTop: "2px", opacity: 0.8 }}>
                    Your balance has been updated.
                </div>
            </div>
            <button style={bannerStyles.dismiss} onClick={onDismiss}>✕</button>
        </div>
    );
}

export function ErrorBanner({ message, onDismiss }) {
    return (
        <div style={bannerStyles.error}>
            <span style={bannerStyles.icon}>!</span>
            <div>
                <strong>Payment Not Confirmed</strong>
                <div style={{ fontSize: "13px", marginTop: "2px", opacity: 0.85 }}>
                    {message}
                </div>
            </div>
            <button style={bannerStyles.dismiss} onClick={onDismiss}>✕</button>
        </div>
    );
}

export function PollingBanner() {
    return (
        <div style={bannerStyles.polling}>
            <span style={bannerStyles.spinner} />
            <span>Confirming your payment…</span>
        </div>
    );
}

const bannerBase = {
    display: "flex", alignItems: "flex-start", gap: "12px",
    padding: "14px 18px", borderRadius: "12px",
    marginBottom: "20px",
    fontSize: "14px",
};

const bannerStyles = {
    success: {
        ...bannerBase,
        background: "#DCFCE7", color: "#166534",
        border: "1px solid #BBF7D0",
    },
    error: {
        ...bannerBase,
        background: "#FEE2E2", color: "#991B1B",
        border: "1px solid #FECACA",
    },
    polling: {
        ...bannerBase,
        background: "#EFF6FF", color: "#1D4ED8",
        border: "1px solid #BFDBFE",
        alignItems: "center",
    },
    icon: {
        fontSize: "18px", fontWeight: 700, flexShrink: 0,
        marginTop: "1px",
    },
    dismiss: {
        marginLeft: "auto", background: "none", border: "none",
        cursor: "pointer", fontSize: "16px", opacity: 0.6,
        flexShrink: 0, alignSelf: "flex-start",
        padding: 0, color: "inherit",
    },
    spinner: {
        display: "inline-block",
        width: 16, height: 16,
        border: "2px solid #BFDBFE",
        borderTopColor: "#1D4ED8",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
        flexShrink: 0,
    },
};