import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:5000";

const STATUS_STYLES = {
  in_progress:                { bg: "#EFF6FF", color: "#1D4ED8",  label: "In Progress"  },
  escrow_funded:              { bg: "#F0FDF4", color: "#166534",  label: "Escrow Funded" },
  completed:                  { bg: "#F0FDF4", color: "#166534",  label: "Completed"     },
  open:                       { bg: "#FEF9EE", color: "#92400E",  label: "Open"          },
  cancelled:                  { bg: "#FEF2F2", color: "#991B1B",  label: "Cancelled"     },
  pending_provider_acceptance:{ bg: "#F5F3FF", color: "#6D28D9",  label: "Awaiting Provider" },
  disputed:                   { bg: "#FFF7ED", color: "#C2410C",  label: "Disputed"      },
};

const URGENCY_STYLES = {
  high:   { bg: "#FEF2F2", color: "#991B1B" },
  medium: { bg: "#FFFBEB", color: "#92400E" },
  low:    { bg: "#F0FDF4", color: "#166534" },
};

const CHAT_ALLOWED_STATUSES = ["in_progress", "escrow_funded", "accepted", "open"];

const JOB_CATEGORIES = [
  "Carpentry","Plumbing","Electrical","Painting",
  "HVAC","Welding","Cooking","Mechanic","House Help",
];

// ─── Utilities ────────────────────────────────────────────────────────────────
function authHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  };
}

function getUserRole() {
  try { return JSON.parse(localStorage.getItem("user") || "{}").role || "customer"; } catch { return "customer"; }
}
function getCurrentUserId() {
  try { const u = JSON.parse(localStorage.getItem("user")||"{}"); return u._id||u.id||null; } catch { return null; }
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Global toast ─────────────────────────────────────────────────────────────
let _toastFn = null;
function toast(msg, type = "info") { _toastFn?.(msg, type); }

// ─── Sub-components ───────────────────────────────────────────────────────────
function Avatar({ src, name, size = 36 }) {
  const initials = name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() || "?";
  const [err, setErr] = useState(false);
  return src && !err ? (
    <img src={src} alt={name} onError={()=>setErr(true)}
      style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",flexShrink:0}} />
  ) : (
    <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,
      background:"#DBEAFE",color:"#1E40AF",display:"flex",alignItems:"center",
      justifyContent:"center",fontSize:size*0.38,fontWeight:600}}>
      {initials}
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{background:"#F8FAFC",borderRadius:12,padding:"1rem 1.25rem",
      borderLeft:`3px solid ${accent}`,flex:"1 1 120px"}}>
      <div style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em",color:"#94A3B8",marginBottom:4}}>{label}</div>
      <div style={{fontSize:22,fontWeight:700,color:"#0F172A"}}>{value}</div>
    </div>
  );
}

// ─── Toast system ─────────────────────────────────────────────────────────────
function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    _toastFn = (msg, type) => {
      const id = Date.now();
      setToasts(p => [...p, {id,msg,type}]);
      setTimeout(() => setToasts(p=>p.filter(t=>t.id!==id)), 3800);
    };
    return () => { _toastFn = null; };
  }, []);
  const colors = {success:"#166534",error:"#991B1B",info:"#1D4ED8",warning:"#92400E"};
  const bgs    = {success:"#F0FDF4",error:"#FEF2F2",info:"#EFF6FF",warning:"#FFFBEB"};
  return (
    <div style={{position:"fixed",top:20,right:20,zIndex:9999,display:"flex",flexDirection:"column",gap:8}}>
      {toasts.map(t=>(
        <div key={t.id} style={{background:bgs[t.type]||bgs.info,border:`1px solid`,
          borderColor:colors[t.type]||colors.info,borderRadius:10,padding:"10px 16px",
          fontSize:13,fontWeight:500,color:colors[t.type]||colors.info,
          boxShadow:"0 4px 12px rgba(0,0,0,0.1)",maxWidth:320,
          animation:"slideIn 0.2s ease"}}>
          {t.msg}
        </div>
      ))}
      <style>{`@keyframes slideIn{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel="Confirm", confirmColor="#DC2626",
                        onConfirm, onCancel, loading=false, children }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",borderRadius:16,padding:"1.75rem",width:"100%",maxWidth:420,
        boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        <h2 style={{margin:"0 0 8px",fontSize:18,fontWeight:700,color:"#0F172A"}}>{title}</h2>
        <p style={{margin:"0 0 1rem",fontSize:14,color:"#64748B",lineHeight:1.6}}>{message}</p>
        {children}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:"1.25rem"}}>
          <button onClick={onCancel} disabled={loading}
            style={{padding:"8px 20px",borderRadius:8,border:"1px solid #E2E8F0",
              background:"#fff",color:"#64748B",fontSize:13,fontWeight:500,cursor:"pointer"}}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            style={{padding:"8px 20px",borderRadius:8,border:"none",
              background:loading?"#CBD5E1":confirmColor,color:"#fff",fontSize:13,
              fontWeight:600,cursor:loading?"not-allowed":"pointer"}}>
            {loading?"Processing…":confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Job Modal ───────────────────────────────────────────────────────────
function EditJobModal({ job, onSave, onClose }) {
  const [form, setForm] = useState({
    title:       job.title       || "",
    description: job.description || "",
    budget:      job.budget      || "",
    urgency:     job.urgency     || "medium",
    category:    job.category    || "",
    address:     job.location?.address || "",
    city:        job.location?.city    || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState(null);

  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.budget) {
      return setErr("Title, description, and budget are required.");
    }
    setSaving(true); setErr(null);
    try {
      const res = await fetch(`${API_BASE}/jobs/${job._id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          title:       form.title.trim(),
          description: form.description.trim(),
          budget:      parseFloat(form.budget),
          urgency:     form.urgency,
          category:    form.category,
          address:     form.address.trim() || undefined,
          city:        form.city.trim()    || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");
      toast("Job updated successfully!", "success");
      onSave(data.job);
    } catch(e) {
      setErr(e.message);
    } finally { setSaving(false); }
  };

  const field = (label, key, type="text", extra={}) => (
    <div key={key}>
      <label style={{display:"block",fontSize:12,fontWeight:600,color:"#475569",marginBottom:4}}>{label}</label>
      <input type={type} value={form[key]}
        onChange={e=>set(key,e.target.value)} {...extra}
        style={{width:"100%",boxSizing:"border-box",padding:"8px 12px",borderRadius:8,
          border:"1px solid #E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit"}} />
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto"}}>
      <div style={{background:"#fff",borderRadius:16,padding:"1.75rem",width:"100%",maxWidth:500,
        boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem"}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:700,color:"#0F172A"}}>✏️ Edit Job</h2>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#94A3B8"}}>×</button>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {field("Job Title","title")}
          <div>
            <label style={{display:"block",fontSize:12,fontWeight:600,color:"#475569",marginBottom:4}}>Description</label>
            <textarea value={form.description} onChange={e=>set("description",e.target.value)} rows={4}
              style={{width:"100%",boxSizing:"border-box",padding:"8px 12px",borderRadius:8,
                border:"1px solid #E2E8F0",fontSize:13,resize:"vertical",fontFamily:"inherit"}} />
          </div>
          {field("Budget (Rs)","budget","number",{min:0})}

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label style={{display:"block",fontSize:12,fontWeight:600,color:"#475569",marginBottom:4}}>Urgency</label>
              <select value={form.urgency} onChange={e=>set("urgency",e.target.value)}
                style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"1px solid #E2E8F0",fontSize:13}}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label style={{display:"block",fontSize:12,fontWeight:600,color:"#475569",marginBottom:4}}>Category</label>
              <select value={form.category} onChange={e=>set("category",e.target.value)}
                style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"1px solid #E2E8F0",fontSize:13}}>
                <option value="">— select —</option>
                {JOB_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {field("Address","address")}
            {field("City","city")}
          </div>

          {err && <div style={{fontSize:13,color:"#DC2626",background:"#FEF2F2",padding:"8px 12px",borderRadius:8}}>{err}</div>}
        </div>

        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:"1.25rem"}}>
          <button onClick={onClose} disabled={saving}
            style={{padding:"8px 20px",borderRadius:8,border:"1px solid #E2E8F0",
              background:"#fff",color:"#64748B",fontSize:13,cursor:"pointer"}}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{padding:"8px 20px",borderRadius:8,border:"none",
              background:saving?"#CBD5E1":"#2563EB",color:"#fff",fontSize:13,
              fontWeight:600,cursor:saving?"not-allowed":"pointer"}}>
            {saving?"Saving…":"Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Fund Escrow Modal ────────────────────────────────────────────────────────
function FundEscrowModal({ job, onClose, onFunded }) {
  const [wallet, setWallet]           = useState(null);
  const [loadingWallet, setLoadWallet]= useState(true);
  const [phase, setPhase]             = useState("check");
  const [clientSecret, setClientSecret] = useState(null);
  const [sessionId, setSessionId]     = useState(null);
  const [fundLoading, setFundLoading] = useState(false);
  const [err, setErr]                 = useState(null);
  const pollRef = useRef(null);

  const escrowRs  = job.escrow?.amount || job.budget || 0;
  const balance   = wallet?.balanceNpr || 0;
  const shortfall = Math.max(0, escrowRs - balance);
  const hasFunds  = balance >= escrowRs;

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`${API_BASE}/payment/wallet`, { headers: authHeaders() });
        const data = await res.json();
        setWallet(data.wallet);
      } catch {
        setErr("Failed to load wallet info.");
      } finally {
        setLoadWallet(false);
      }
    })();
    return () => stopPolling();
  }, []);

  const handleFundDirect = async () => {
    setFundLoading(true); setErr(null);
    try {
      const res  = await fetch(`${API_BASE}/payment/escrow/${job._id}/fund`, {
        method: "POST", headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fund escrow");
      toast("Escrow funded! Funds are now secured. 🔒", "success");
      onFunded(data);
      onClose();
    } catch(e) {
      setErr(e.message);
    } finally { setFundLoading(false); }
  };

  const handleInitiateTopup = async () => {
    setErr(null); setFundLoading(true);
    try {
      const topupAmt = Math.max(100, Math.ceil(shortfall / 100) * 100);
      const res  = await fetch(`${API_BASE}/payment/topup/initiate`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ amountNpr: topupAmt }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to start payment");
      setClientSecret(data.clientSecret);
      setSessionId(data.sessionId);
      setPhase("stripe");
    } catch(e) {
      setErr(e.message);
    } finally { setFundLoading(false); }
  };

  const handleStripeComplete = useCallback(() => {
    setPhase("polling");
    startPolling(sessionId);
  }, [sessionId]);

  const startPolling = (sid) => {
    const deadline = Date.now() + 5 * 60 * 1000;
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${API_BASE}/payment/topup/status?session_id=${sid}`, {
          headers: authHeaders(),
        });
        const data = await res.json();

        if (data.success && data.credited) {
          stopPolling();
          await autoFundAfterTopup();
          return;
        }
        if (data.status === "failed") {
          stopPolling();
          setErr("Payment failed or was cancelled. Please try again.");
          setPhase("check");
          return;
        }
        if (Date.now() > deadline) {
          stopPolling();
          setErr("Payment confirmation timed out. If your card was charged, your balance will update shortly — then click 'Fund Escrow'.");
          setPhase("check");
        }
      } catch { /* keep polling on network blip */ }
    }, 2000);
  };

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const autoFundAfterTopup = async () => {
    try {
      const res  = await fetch(`${API_BASE}/payment/escrow/${job._id}/fund`, {
        method: "POST", headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fund escrow");
      setPhase("success");
      onFunded(data);
    } catch(e) {
      setErr(`Payment received but escrow funding failed: ${e.message}. Please fund manually.`);
      setPhase("check");
    }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(3px)"}}>
      <div style={{background:"#fff",borderRadius:16,width:"100%",
        maxWidth: phase==="stripe" ? 560 : 440,
        maxHeight:"90vh",overflowY:"auto",
        boxShadow:"0 24px 64px rgba(0,0,0,0.22)"}}>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"1.25rem 1.5rem",borderBottom:"1px solid #F1F5F9"}}>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0F172A"}}>
            {phase==="stripe"   ? "💳 Complete Payment"    :
             phase==="polling"  ? "⏳ Confirming…"          :
             phase==="success"  ? "✅ Escrow Funded"        : "🔒 Fund Escrow"}
          </h2>
          {phase !== "polling" && phase !== "success" && (
            <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#94A3B8"}}>×</button>
          )}
        </div>

        <div style={{padding:"1.25rem 1.5rem"}}>

          {phase === "check" && (
            loadingWallet ? (
              <div style={{textAlign:"center",padding:"2rem",color:"#94A3B8"}}>Loading wallet…</div>
            ) : (
              <div>
                <div style={{background:"#F8FAFC",borderRadius:12,padding:"1rem",marginBottom:"1rem",
                  borderLeft:"3px solid #3B82F6"}}>
                  <div style={{fontSize:12,color:"#64748B",marginBottom:4}}>
                    Job: <strong style={{color:"#0F172A"}}>{job.title}</strong>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}>
                    <span style={{color:"#64748B"}}>Escrow required</span>
                    <span style={{fontWeight:700,color:"#0F172A"}}>Rs {escrowRs.toLocaleString()}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom: hasFunds?0:5}}>
                    <span style={{color:"#64748B"}}>Wallet balance</span>
                    <span style={{fontWeight:700,color:hasFunds?"#166534":"#991B1B"}}>
                      Rs {balance.toLocaleString()}
                    </span>
                  </div>
                  {!hasFunds && (
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13,
                      borderTop:"1px dashed #E2E8F0",paddingTop:6,marginTop:4}}>
                      <span style={{color:"#991B1B",fontWeight:600}}>Shortfall</span>
                      <span style={{fontWeight:700,color:"#991B1B"}}>Rs {shortfall.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {err && (
                  <div style={{fontSize:13,color:"#DC2626",background:"#FEF2F2",
                    padding:"10px 12px",borderRadius:8,marginBottom:12,lineHeight:1.5}}>
                    {err}
                  </div>
                )}

                {hasFunds ? (
                  <>
                    <div style={{background:"#F0FDF4",borderRadius:10,padding:"10px 14px",
                      fontSize:13,color:"#166534",marginBottom:14}}>
                      ✅ Your wallet has sufficient funds.
                    </div>
                    <button onClick={handleFundDirect} disabled={fundLoading}
                      style={{width:"100%",padding:"13px",borderRadius:10,border:"none",
                        background:fundLoading?"#CBD5E1":"#1D4ED8",color:"#fff",fontSize:14,
                        fontWeight:700,cursor:fundLoading?"not-allowed":"pointer"}}>
                      {fundLoading ? "Locking funds…" : `🔒 Lock Rs ${escrowRs.toLocaleString()} in Escrow`}
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{background:"#FFF7ED",borderRadius:10,padding:"10px 14px",
                      fontSize:13,color:"#C2410C",marginBottom:14,lineHeight:1.5}}>
                      Your wallet is short by <strong>Rs {shortfall.toLocaleString()}</strong>.
                      We'll charge exactly <strong>Rs {Math.max(100, Math.ceil(shortfall/100)*100).toLocaleString()}</strong> via card,
                      then lock the escrow automatically.
                    </div>
                    <button onClick={handleInitiateTopup} disabled={fundLoading}
                      style={{width:"100%",padding:"13px",borderRadius:10,border:"none",
                        background:fundLoading?"#CBD5E1":"#7C3AED",color:"#fff",fontSize:14,
                        fontWeight:700,cursor:fundLoading?"not-allowed":"pointer",
                        display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                      <span>💳</span>
                      {fundLoading ? "Preparing payment…" : `Pay Rs ${Math.max(100,Math.ceil(shortfall/100)*100).toLocaleString()} & Fund Escrow`}
                    </button>
                  </>
                )}
              </div>
            )
          )}

          {phase === "stripe" && clientSecret && (
            <StripeEmbedded clientSecret={clientSecret} onComplete={handleStripeComplete} />
          )}

          {phase === "polling" && (
            <div style={{textAlign:"center",padding:"2.5rem 1rem"}}>
              <div style={{
                width:52,height:52,borderRadius:"50%",
                border:"4px solid #E0E0E0",borderTopColor:"#7C3AED",
                animation:"spin 0.8s linear infinite",
                margin:"0 auto 16px"
              }}/>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <div style={{fontSize:16,fontWeight:700,color:"#0F172A",marginBottom:6}}>
                Confirming payment &amp; locking escrow…
              </div>
              <div style={{fontSize:13,color:"#64748B"}}>
                This usually takes just a few seconds.
              </div>
            </div>
          )}

          {phase === "success" && (
            <div style={{textAlign:"center",padding:"2rem 1rem"}}>
              <div style={{width:64,height:64,borderRadius:"50%",background:"#DCFCE7",
                color:"#16A34A",fontSize:28,fontWeight:700,
                display:"flex",alignItems:"center",justifyContent:"center",
                margin:"0 auto 16px"}}>✓</div>
              <div style={{fontSize:18,fontWeight:700,color:"#0F172A",marginBottom:6}}>Escrow Funded!</div>
              <div style={{fontSize:14,color:"#166534",fontWeight:600,marginBottom:4}}>
                Rs {escrowRs.toLocaleString()} is now secured.
              </div>
              <div style={{fontSize:13,color:"#64748B",marginBottom:24,lineHeight:1.5}}>
                Funds will be released to the provider once the job is completed and confirmed.
              </div>
              <button onClick={onClose}
                style={{padding:"11px 32px",borderRadius:10,border:"none",
                  background:"#1D4ED8",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>
                Done
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

let _stripePromise = null;
function getStripe() {
  if (!_stripePromise) {
    _stripePromise = import("@stripe/stripe-js").then(m =>
      m.loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "")
    );
  }
  return _stripePromise;
}

function StripeEmbedded({ clientSecret, onComplete }) {
  const [ECP, setECP]  = useState(null);
  const [EC,  setEC]   = useState(null);
  const [sp,  setSP]   = useState(null);
  const [loadErr, setLoadErr] = useState(null);

  useEffect(() => {
    Promise.all([
      import("@stripe/react-stripe-js"),
      getStripe(),
    ]).then(([mod, stripe]) => {
      setECP(() => mod.EmbeddedCheckoutProvider);
      setEC(() => mod.EmbeddedCheckout);
      setSP(stripe);
    }).catch(e => setLoadErr("Stripe failed to load: " + e.message));
  }, []);

  if (loadErr) return <div style={{color:"#DC2626",fontSize:13,padding:"1rem"}}>{loadErr}</div>;
  if (!ECP || !EC || !sp) return (
    <div style={{textAlign:"center",padding:"2rem",color:"#94A3B8",fontSize:13}}>
      Loading payment form…
    </div>
  );

  return (
    <ECP stripe={sp} options={{ clientSecret, onComplete }}>
      <EC />
    </ECP>
  );
}

// ─── Complete Job Modal ───────────────────────────────────────────────────────
function CompleteJobModal({ job, userRole, onClose, onCompleted }) {
  const isClient   = userRole === "customer";
  const [rating, setRating]   = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState(null);

  const handleComplete = async () => {
    setLoading(true); setErr(null);
    try {
      const body = {};
      if (isClient && rating > 0) { body.rating = rating; body.comment = comment.trim(); }
      const res = await fetch(`${API_BASE}/jobs/${job._id}/complete`, {
        method: "PATCH", headers: authHeaders(), body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to complete job");
      toast("Job marked as complete! 🎉", "success");
      onCompleted(data.job);
    } catch(e) {
      setErr(e.message);
    } finally { setLoading(false); }
  };

  return (
    <ConfirmModal
      title="✅ Complete Job"
      message={`Are you sure you want to mark "${job.title}" as complete?${job.escrow?.funded ? " The admin will release the escrow payment to the provider." : ""}`}
      confirmLabel="Mark Complete"
      confirmColor="#166534"
      onConfirm={handleComplete}
      onCancel={onClose}
      loading={loading}
    >
      {isClient && (
        <div style={{background:"#F8FAFC",borderRadius:10,padding:"1rem",marginBottom:8}}>
          <div style={{fontSize:13,fontWeight:600,color:"#475569",marginBottom:8}}>Leave a rating (optional)</div>
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            {[1,2,3,4,5].map(s=>(
              <button key={s} onClick={()=>setRating(s)}
                style={{fontSize:22,background:"none",border:"none",cursor:"pointer",
                  opacity: s <= rating ? 1 : 0.3, transition:"opacity 0.1s"}}>⭐</button>
            ))}
            {rating > 0 && <span style={{fontSize:12,color:"#64748B",alignSelf:"center"}}>{rating}/5</span>}
          </div>
          {rating > 0 && (
            <textarea value={comment} onChange={e=>setComment(e.target.value)}
              placeholder="Add a comment (optional)…" rows={2}
              style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",borderRadius:8,
                border:"1px solid #E2E8F0",fontSize:13,resize:"none",fontFamily:"inherit"}} />
          )}
        </div>
      )}
      {err && <div style={{fontSize:13,color:"#DC2626",background:"#FEF2F2",padding:"8px 12px",borderRadius:8,marginTop:8}}>{err}</div>}
    </ConfirmModal>
  );
}

// ─── Cancel Job Modal ─────────────────────────────────────────────────────────
function CancelJobModal({ job, onClose, onCancelled }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState(null);

  const handleCancel = async () => {
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`${API_BASE}/jobs/${job._id}/cancel`, {
        method: "PATCH", headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to cancel job");
      toast(data.notice || "Job cancelled.", "warning");
      onCancelled(data.job);
    } catch(e) {
      setErr(e.message);
    } finally { setLoading(false); }
  };

  return (
    <ConfirmModal
      title="🚫 Cancel Job"
      confirmLabel="Yes, Cancel Job"
      confirmColor="#DC2626"
      onConfirm={handleCancel}
      onCancel={onClose}
      loading={loading}
      message={
        job.escrow?.funded
          ? `This job has funded escrow (Rs ${(job.escrow.amount||0).toLocaleString()}). Funds will stay locked until an admin processes a refund. Are you sure?`
          : `Are you sure you want to cancel "${job.title}"? This cannot be undone.`
      }
    >
      {err && <div style={{fontSize:13,color:"#DC2626",background:"#FEF2F2",padding:"8px 12px",borderRadius:8,marginTop:8}}>{err}</div>}
    </ConfirmModal>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────
function JobChatPanel({ job, onClose }) {
  const [messages, setMessages]           = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [input, setInput]                 = useState("");
  const [loading, setLoading]             = useState(true);
  const [sending, setSending]             = useState(false);
  const [error, setError]                 = useState(null);
  const [editingId, setEditingId]         = useState(null);
  const [editText, setEditText]           = useState("");
  const [hoveredId, setHoveredId]         = useState(null);
  const [replyTo, setReplyTo]             = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const messagesEndRef = useRef(null);
  const pollRef        = useRef(null);
  const isChatAllowed  = CHAT_ALLOWED_STATUSES.includes(job.status);

  useEffect(() => {
    try { const u=JSON.parse(localStorage.getItem("user")||"{}"); setCurrentUserId(u._id||u.id||null); } catch {}
  }, []);

  const loadMessages = useCallback(async (convId) => {
    try {
      const res = await fetch(`${API_BASE}/chat/conversations/${convId}/messages?limit=50`,{headers:authHeaders()});
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (!isChatAllowed) { setLoading(false); return; }
    (async () => {
      setLoading(true); setError(null);
      try {
        const res = await fetch(`${API_BASE}/chat/conversations/job/${job._id}`,{method:"POST",headers:authHeaders()});
        const data = await res.json();
        const conv = data.conversation || data.data?.conversation;
        if (!conv?._id) throw new Error("Could not open conversation");
        setConversationId(conv._id);
        await loadMessages(conv._id);
      } catch(e) { setError(e.message || "Failed to load chat"); }
      finally { setLoading(false); }
    })();
  }, [job._id, isChatAllowed, loadMessages]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);
  useEffect(() => {
    if (!conversationId) return;
    pollRef.current = setInterval(()=>loadMessages(conversationId), 5000);
    return () => clearInterval(pollRef.current);
  }, [conversationId, loadMessages]);

  const handleSend = async () => {
    if (!input.trim() || sending || !conversationId) return;
    setSending(true);
    const body = {content:input.trim()};
    if (replyTo) body.replyTo={messageId:replyTo._id,senderName:replyTo.sender?.fullName||"User",contentSnippet:(replyTo.content||"").slice(0,200)};
    try {
      const res = await fetch(`${API_BASE}/chat/conversations/${conversationId}/messages`,{method:"POST",headers:authHeaders(),body:JSON.stringify(body)});
      const data = await res.json();
      if (data.message) setMessages(p=>[...p,data.message]);
      setInput(""); setReplyTo(null);
    } catch {} finally { setSending(false); }
  };

  const handleEdit = async (msgId) => {
    if (!editText.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/chat/messages/${msgId}`,{method:"PATCH",headers:authHeaders(),body:JSON.stringify({content:editText.trim()})});
      const data = await res.json();
      if (data.message) setMessages(p=>p.map(m=>m._id===msgId?data.message:m));
      setEditingId(null); setEditText("");
    } catch {}
  };

  const handleDelete = async (msgId) => {
    try {
      await fetch(`${API_BASE}/chat/messages/${msgId}`,{method:"DELETE",headers:authHeaders()});
      setMessages(p=>p.map(m=>m._id===msgId?{...m,deletedAt:new Date().toISOString()}:m));
    } catch {}
  };

  const emojiBtn = {fontSize:13,background:"#F1F5F9",border:"1px solid #E2E8F0",borderRadius:6,padding:"2px 6px",cursor:"pointer"};

  return (
    <div style={{borderTop:"2px solid #3B82F6",background:"#FAFBFF",borderRadius:"0 0 16px 16px",
      display:"flex",flexDirection:"column",height:420,overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"10px 16px",background:"#EFF6FF",borderBottom:"1px solid #DBEAFE",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14,color:"#3B82F6"}}>💬</span>
          <span style={{fontSize:13,fontWeight:700,color:"#1E40AF"}}>Job Chat</span>
          {job.assignedWorker&&<span style={{fontSize:12,color:"#64748B",marginLeft:4}}>· {job.assignedWorker.fullName}</span>}
        </div>
        <button onClick={onClose} style={{background:"transparent",border:"none",cursor:"pointer",color:"#94A3B8",fontSize:18}}>×</button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:6}}>
        {loading?<div style={{margin:"auto",textAlign:"center",color:"#94A3B8"}}><div style={{fontSize:24,marginBottom:8}}>⏳</div><div style={{fontSize:13}}>Loading…</div></div>
        :!isChatAllowed?<div style={{margin:"auto",textAlign:"center",color:"#94A3B8",padding:"1rem"}}><div style={{fontSize:28,marginBottom:8}}>🔒</div><div style={{fontSize:13,fontWeight:600}}>Chat not available</div></div>
        :error?<div style={{margin:"auto",textAlign:"center",color:"#DC2626",padding:"1rem"}}><div style={{fontSize:28,marginBottom:8}}>⚠️</div><div style={{fontSize:13}}>{error}</div></div>
        :messages.length===0?<div style={{margin:"auto",textAlign:"center",color:"#94A3B8"}}><div style={{fontSize:28,marginBottom:8}}>👋</div><div style={{fontSize:13,fontWeight:600}}>No messages yet</div></div>
        :messages.map(msg=>{
          const isOwn=msg.sender?._id===currentUserId||msg.sender?.id===currentUserId;
          const isDeleted=!!msg.deletedAt;
          const isEditing=editingId===msg._id;
          const isHovered=hoveredId===msg._id;
          return (
            <div key={msg._id} onMouseEnter={()=>setHoveredId(msg._id)} onMouseLeave={()=>setHoveredId(null)}
              style={{display:"flex",flexDirection:isOwn?"row-reverse":"row",gap:8,alignItems:"flex-end"}}>
              {!isOwn&&<Avatar src={msg.sender?.avatar} name={msg.sender?.fullName} size={28}/>}
              <div style={{display:"flex",flexDirection:"column",alignItems:isOwn?"flex-end":"flex-start",maxWidth:"72%",gap:2}}>
                {isDeleted?(
                  <div style={{fontSize:12,color:"#94A3B8",fontStyle:"italic",padding:"6px 12px",
                    background:"#F8FAFC",borderRadius:12}}>Message deleted</div>
                ):isEditing?(
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <input value={editText} onChange={e=>setEditText(e.target.value)}
                      style={{padding:"6px 10px",borderRadius:8,border:"1px solid #3B82F6",fontSize:12,outline:"none"}}/>
                    <button onClick={()=>handleEdit(msg._id)} style={{...emojiBtn,color:"#2563EB"}}>✓</button>
                    <button onClick={()=>{setEditingId(null);setEditText("");}} style={emojiBtn}>✗</button>
                  </div>
                ):(
                  <div style={{padding:"8px 12px",borderRadius:isOwn?"14px 14px 4px 14px":"14px 14px 14px 4px",
                    background:isOwn?"#3B82F6":"#F1F5F9",color:isOwn?"#fff":"#1E293B",fontSize:13,lineHeight:1.5}}>
                    {msg.content||msg.text}
                  </div>
                )}
                <span style={{fontSize:10,color:"#94A3B8"}}>{new Date(msg.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                {isHovered&&!isDeleted&&!isEditing&&(
                  <div style={{display:"flex",gap:2,justifyContent:isOwn?"flex-end":"flex-start"}}>
                    {["👍","❤️","😂"].map(e=><button key={e} onClick={()=>{}} style={emojiBtn}>{e}</button>)}
                    <button onClick={()=>setReplyTo(msg)} style={emojiBtn}>↩</button>
                    {isOwn&&<>
                      <button onClick={()=>{setEditingId(msg._id);setEditText(msg.content||msg.text||"");}} style={emojiBtn}>✏️</button>
                      <button onClick={()=>handleDelete(msg._id)} style={{...emojiBtn,color:"#EF4444"}}>🗑</button>
                    </>}
                  </div>
                )}
              </div>
              {isOwn&&<Avatar src={null} name={msg.sender?.fullName} size={28}/>}
            </div>
          );
        })}
        <div ref={messagesEndRef}/>
      </div>

      {isChatAllowed&&!loading&&!error&&(
        <div style={{padding:"10px 16px",borderTop:"1px solid #E2E8F0",background:"#fff",flexShrink:0}}>
          {replyTo&&(
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              background:"#EFF6FF",borderLeft:"3px solid #3B82F6",borderRadius:6,
              padding:"4px 10px",marginBottom:6,fontSize:12}}>
              <div><span style={{fontWeight:600,color:"#2563EB",marginRight:4}}>{replyTo.sender?.fullName}</span>
                <span style={{color:"#64748B"}}>{(replyTo.content||"").slice(0,60)}</span></div>
              <button onClick={()=>setReplyTo(null)} style={{background:"none",border:"none",cursor:"pointer",color:"#94A3B8",fontSize:16}}>×</button>
            </div>
          )}
          <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
            <textarea value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();handleSend();}}}
              placeholder="Type a message… (Ctrl+Enter to send)" disabled={sending} rows={2}
              style={{flex:1,fontSize:13,padding:"8px 12px",border:"1px solid #E2E8F0",
                borderRadius:10,resize:"none",outline:"none",fontFamily:"inherit",background:"#F8FAFC"}}/>
            <button onClick={handleSend} disabled={!input.trim()||sending}
              style={{width:38,height:38,borderRadius:10,border:"none",flexShrink:0,
                background:input.trim()&&!sending?"#3B82F6":"#E2E8F0",
                color:input.trim()&&!sending?"#fff":"#94A3B8",
                cursor:input.trim()&&!sending?"pointer":"not-allowed",fontSize:16,
                display:"flex",alignItems:"center",justifyContent:"center"}}>
              {sending?"…":"➤"}
            </button>
          </div>
          <div style={{fontSize:10,color:"#94A3B8",marginTop:4,textAlign:"right"}}>Ctrl+Enter to send</div>
        </div>
      )}
    </div>
  );
}

// ─── Star Rating Input ────────────────────────────────────────────────────────
function StarInput({ value, onChange, size = 28 }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          style={{
            fontSize: size, background: "none", border: "none", cursor: "pointer", padding: "0 2px",
            color: s <= (hovered || value) ? "#F59E0B" : "#D1D5DB",
            transform: s <= (hovered || value) ? "scale(1.2)" : "scale(1)",
            transition: "color 0.1s, transform 0.1s",
          }}>★</button>
      ))}
    </div>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────
function ReviewModal({ job, onClose, onReviewed }) {
  const [rating,  setRating]  = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState(null);
  const [done,    setDone]    = useState(false);

  const userRole     = getUserRole();
  const isClientUser = userRole === "customer";

  const subjectName   = isClientUser
    ? (job.assignedWorker?.fullName || "the provider")
    : (job.client?.fullName         || "the client");
  const subjectAvatar = isClientUser
    ? job.assignedWorker?.avatar
    : job.client?.avatar;

  const LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  const handleSubmit = async () => {
    if (rating === 0) return setErr("Please select a star rating.");
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`${API_BASE}/reviews`, {
        method:  "POST",
        headers: authHeaders(),
        body:    JSON.stringify({ jobId: job._id, rating, comment: comment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit review");
      setDone(true);
      toast(isClientUser ? "Provider reviewed! ⭐" : "Client reviewed! ⭐", "success");
      setTimeout(() => { onReviewed(); onClose(); }, 1400);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth: 440,
        boxShadow: "0 24px 64px rgba(0,0,0,0.22)", overflow: "hidden",
      }}>
        <div style={{
          background: "linear-gradient(135deg,#FFF7ED,#FFFBEB)",
          padding: "1.25rem 1.5rem", borderBottom: "1px solid #FDE68A",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0F172A" }}>
              {isClientUser ? "⭐ Review the Provider" : "⭐ Review the Client"}
            </div>
            <div style={{ fontSize: 12, color: "#78716C", marginTop: 2 }}>{job.title}</div>
          </div>
          {!done && (
            <button onClick={onClose}
              style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94A3B8", lineHeight: 1 }}>×</button>
          )}
        </div>

        <div style={{ padding: "1.5rem" }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "1.75rem 0" }}>
              <div style={{
                width: 60, height: 60, borderRadius: "50%", background: "#FEF3C7",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 30, margin: "0 auto 14px",
              }}>⭐</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>
                Review Submitted!
              </div>
              <div style={{ fontSize: 13, color: "#64748B" }}>Thank you for your feedback.</div>
            </div>
          ) : (
            <>
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                background: "#F8FAFC", borderRadius: 12, padding: "12px 14px", marginBottom: "1.25rem",
              }}>
                <Avatar src={subjectAvatar} name={subjectName} size={40}/>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{subjectName}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8" }}>
                    {isClientUser ? "Provider on this job" : "Client on this job"}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                  How would you rate your experience?
                </div>
                <StarInput value={rating} onChange={setRating}/>
                {rating > 0 && (
                  <div style={{ fontSize: 13, color: "#F59E0B", marginTop: 6, fontWeight: 600 }}>
                    {LABELS[rating]}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                  Comment <span style={{ color: "#94A3B8", fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  value={comment} onChange={e => setComment(e.target.value)}
                  placeholder={
                    isClientUser
                      ? "Describe the quality of work, professionalism, punctuality…"
                      : "Describe how well the client communicated, paid on time, etc…"
                  }
                  rows={3} maxLength={1000}
                  style={{
                    width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10,
                    border: "1px solid #E2E8F0", fontSize: 13, resize: "vertical",
                    fontFamily: "inherit", outline: "none", lineHeight: 1.5,
                  }}
                />
                <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "right", marginTop: 2 }}>
                  {comment.length}/1000
                </div>
              </div>

              {err && (
                <div style={{
                  fontSize: 13, color: "#DC2626", background: "#FEF2F2",
                  padding: "8px 12px", borderRadius: 8, marginBottom: 12,
                }}>{err}</div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={onClose} disabled={loading}
                  style={{
                    flex: 1, padding: "11px", borderRadius: 10, border: "1px solid #E2E8F0",
                    background: "#fff", color: "#64748B", fontSize: 13, fontWeight: 500, cursor: "pointer",
                  }}>Cancel</button>
                <button onClick={handleSubmit} disabled={loading || rating === 0}
                  style={{
                    flex: 2, padding: "11px", borderRadius: 10, border: "none",
                    background: loading || rating === 0 ? "#CBD5E1" : "#F59E0B",
                    color: "#fff", fontSize: 13, fontWeight: 700,
                    cursor: loading || rating === 0 ? "not-allowed" : "pointer",
                    transition: "background 0.15s",
                  }}>
                  {loading ? "Submitting…" : "Submit Review"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── JobCard ──────────────────────────────────────────────────────────────────
function JobCard({ job: initialJob, onJobUpdated, userRole }) {
  const [job, setJob]           = useState(initialJob);
  const [expanded, setExpanded] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [modal, setModal]       = useState(null);
  const [reviewedByMe, setReviewedByMe] = useState(null);

  useEffect(() => { setJob(initialJob); }, [initialJob]);

  useEffect(() => {
    if (initialJob.status !== "completed") return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/reviews/check/${initialJob._id}`, { headers: authHeaders() });
        const data = await res.json();
        if (res.ok) setReviewedByMe(data.reviewed);
      } catch { /* non-critical */ }
    })();
  }, [initialJob._id, initialJob.status]);

  const handleJobChange = (updatedJob) => {
    const merged = { ...job, ...updatedJob };
    setJob(merged);
    onJobUpdated?.(merged);
    setModal(null);
  };

  const status  = STATUS_STYLES[job.status]  || STATUS_STYLES.open;
  const urgency = URGENCY_STYLES[job.urgency] || URGENCY_STYLES.medium;
  const chatAllowed = CHAT_ALLOWED_STATUSES.includes(job.status);

  const preferredDate = job.preferredDate ? formatDate(job.preferredDate) : "—";
  const createdAt     = job.createdAt     ? new Date(job.createdAt).toLocaleDateString("en-GB",{day:"numeric",month:"short"}) : "—";

  // ── KEY FIX: hide fund_escrow button once escrow is funded OR status is escrow_funded ──
  const actions = (job.availableActions || []).filter(
    a => !(a === "fund_escrow" && (job.escrow?.funded || job.status === "escrow_funded"))
  );

  const showReviewBtn = job.status === "completed" && reviewedByMe === false;

  const ACTION_CONFIG = {
    fund_escrow:  { label:"🔒 Fund Escrow",  bg:"#1D4ED8", color:"#fff",    border: undefined },
    update:       { label:"✏️ Edit",          bg:"#fff",    color:"#475569", border:"#E2E8F0"  },
    complete_job: { label:"✅ Complete",      bg:"#166534", color:"#fff",    border: undefined },
    cancel:       { label:"🚫 Cancel",        bg:"#fff",    color:"#DC2626", border:"#FECACA"  },
    submit_review:{ label:"⭐ Review",        bg:"#F59E0B", color:"#fff",    border: undefined },
  };

  const handleActionClick = (action) => {
    if (action === "fund_escrow")   return setModal("fund_escrow");
    if (action === "update")        return setModal("edit");
    if (action === "complete_job")  return setModal("complete");
    if (action === "cancel")        return setModal("cancel");
    if (action === "submit_review") return setModal("review");
  };

  return (
    <>
      {modal === "edit" && (
        <EditJobModal job={job} onClose={()=>setModal(null)} onSave={handleJobChange} />
      )}
      {modal === "fund_escrow" && (
        <FundEscrowModal job={job} onClose={()=>setModal(null)} onFunded={() => {
          // Immediately update local state so button disappears without waiting for re-fetch
          handleJobChange({
            status: "escrow_funded",
            escrow: { ...job.escrow, funded: true },
            availableActions: (job.availableActions || []).filter(a => a !== "fund_escrow"),
          });
        }} />
      )}
      {modal === "complete" && (
        <CompleteJobModal job={job} userRole={userRole} onClose={()=>setModal(null)} onCompleted={handleJobChange} />
      )}
      {modal === "cancel" && (
        <CancelJobModal job={job} onClose={()=>setModal(null)} onCancelled={handleJobChange} />
      )}
      {modal === "review" && (
        <ReviewModal
          job={job}
          onClose={() => setModal(null)}
          onReviewed={() => setReviewedByMe(true)}
        />
      )}

      <div style={{background:"#fff",borderRadius:16,border:"1px solid #E2E8F0",overflow:"hidden",
        transition:"box-shadow 0.2s",
        boxShadow:chatOpen?"0 4px 16px rgba(59,130,246,0.12)":"0 1px 3px rgba(0,0,0,0.06)"}}>

        {/* Header */}
        <div style={{padding:"1.25rem 1.5rem",borderBottom:"1px solid #F1F5F9"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:6}}>
                <span style={{fontSize:16,fontWeight:700,color:"#0F172A"}}>{job.title}</span>
                <span style={{fontSize:11,fontWeight:600,padding:"2px 10px",borderRadius:20,
                  background:status.bg,color:status.color}}>{status.label}</span>
                <span style={{fontSize:11,fontWeight:500,padding:"2px 10px",borderRadius:20,
                  background:urgency.bg,color:urgency.color}}>{job.urgency} urgency</span>
                {job.escrow?.funded && (
                  <span style={{fontSize:11,fontWeight:600,padding:"2px 10px",borderRadius:20,
                    background:"#F0FDF4",color:"#166534"}}>💰 Escrow Funded</span>
                )}
              </div>
              <p style={{margin:0,fontSize:13,color:"#64748B",lineHeight:1.5}}>{job.description}</p>
              <div style={{marginTop:6,fontSize:12,color:"#94A3B8"}}>
                📍 {job.location?.address}{job.location?.city?`, ${job.location.city}`:""} &nbsp;·&nbsp; Posted {createdAt}
              </div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:22,fontWeight:800,color:"#0F172A"}}>Rs {(job.budget||0).toLocaleString()}</div>
              <div style={{fontSize:11,color:"#94A3B8",fontWeight:500}}>Budget</div>
            </div>
          </div>
        </div>

        {/* Meta grid */}
        <div style={{padding:"1rem 1.5rem",display:"grid",
          gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:"0.75rem"}}>
          {[
            { label:"Category",       value:job.category },
            { label:"Preferred Date", value:preferredDate },
            { label:"Duration",       value:job.estimatedDuration?.value?`${job.estimatedDuration.value} ${job.estimatedDuration.unit}`:"—" },
            { label:"Views",          value:job.views||0 },
            { label:"Applicants",     value:job.applications?.length||0 },
            {
              label:"Escrow",
              value:`Rs ${(job.escrow?.amount||0).toLocaleString()}`,
              sub: job.escrow?.funded?"Funded ✓":"Not funded",
              subColor: job.escrow?.funded?"#166534":"#B45309",
            },
          ].map(({label,value,sub,subColor})=>(
            <div key={label}>
              <div style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em",color:"#94A3B8",marginBottom:2}}>{label}</div>
              <div style={{fontSize:13,fontWeight:600,color:"#1E293B"}}>{value}</div>
              {sub&&<div style={{fontSize:11,color:subColor||"#64748B",marginTop:1}}>{sub}</div>}
            </div>
          ))}
        </div>

        {/* Worker + action buttons */}
        <div style={{padding:"1rem 1.5rem",borderTop:"1px solid #F1F5F9",
          display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          {job.assignedWorker ? (
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <Avatar src={job.assignedWorker.avatar} name={job.assignedWorker.fullName}/>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:"#1E293B"}}>{job.assignedWorker.fullName}</div>
                <div style={{fontSize:11,color:"#94A3B8"}}>Assigned worker</div>
              </div>
            </div>
          ) : (
            <div style={{fontSize:13,color:"#94A3B8"}}>No worker assigned yet</div>
          )}

          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            {job.applications?.length > 0 && (
              <button onClick={()=>setExpanded(p=>!p)}
                style={{fontSize:12,color:"#3B82F6",background:"transparent",border:"none",
                  cursor:"pointer",padding:"5px 0",fontWeight:500}}>
                {expanded?"Hide":"View"} {job.applications.length} applicant{job.applications.length!==1?"s":""}
              </button>
            )}

            <button onClick={()=>setChatOpen(p=>!p)}
              title={chatAllowed?"Open job chat":"Chat not available for this status"}
              style={{fontSize:12,fontWeight:600,padding:"5px 14px",
                border:`1px solid ${chatOpen?"#2563EB":chatAllowed?"#3B82F6":"#CBD5E1"}`,
                borderRadius:8,cursor:chatAllowed?"pointer":"not-allowed",
                background:chatOpen?"#3B82F6":"transparent",
                color:chatOpen?"#fff":chatAllowed?"#3B82F6":"#94A3B8",
                transition:"all 0.15s",display:"flex",alignItems:"center",gap:5}}>
              <span>💬</span>{chatOpen?"Close Chat":"Chat"}
            </button>

            {actions.map(action => {
              const cfg = ACTION_CONFIG[action];
              if (!cfg) return null;
              return (
                <button key={action} onClick={()=>handleActionClick(action)}
                  style={{fontSize:12,fontWeight:600,padding:"5px 14px",borderRadius:8,
                    background:cfg.bg,color:cfg.color,cursor:"pointer",
                    border:cfg.border?`1px solid ${cfg.border}`:"none",
                    transition:"background 0.15s"}}>
                  {cfg.label}
                </button>
              );
            })}

            {/* {showReviewBtn && (
              <button onClick={() => setModal("review")}
                style={{fontSize:12,fontWeight:600,padding:"5px 14px",borderRadius:8,
                  background:"#F59E0B",color:"#fff",cursor:"pointer",border:"none",
                  transition:"background 0.15s"}}>
                ⭐ {getUserRole() === "customer" ? "Review Provider" : "Review Client"}
              </button>
            )} */}

            {reviewedByMe === true && job.status === "completed" && (
              <span style={{fontSize:12,fontWeight:500,padding:"5px 10px",borderRadius:8,
                background:"#F0FDF4",color:"#166534",border:"1px solid #BBF7D0"}}>
                ✓ Reviewed
              </span>
            )}
          </div>
        </div>

        {/* Applicants panel */}
        {expanded && job.applications?.length > 0 && (
          <div style={{borderTop:"1px solid #F1F5F9",padding:"1rem 1.5rem",background:"#FAFAFA"}}>
            <div style={{fontSize:12,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em",
              color:"#94A3B8",marginBottom:12}}>Applicants</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {job.applications.map(app=>(
                <div key={app._id} style={{display:"flex",alignItems:"center",
                  justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <Avatar src={app.worker?.avatar} name={app.worker?.fullName} size={30}/>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:"#1E293B"}}>{app.worker?.fullName}</div>
                      <div style={{fontSize:11,color:"#94A3B8"}}>{app.worker?.providerDetails?.headline||"Freelancer"}</div>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:14,fontWeight:700,color:"#0F172A"}}>Rs {(app.proposedPrice||0).toLocaleString()}</div>
                    <div style={{fontSize:11,color:"#94A3B8"}}>{app.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inline Chat */}
        {chatOpen && <JobChatPanel job={job} onClose={()=>setChatOpen(false)}/>}
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ActiveJobsPage() {
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const userRole = getUserRole();

  const fetchJobs = useCallback(async () => {
    try {
      const endpoint = userRole === "provider"
        ? `${API_BASE}/jobs/assigned`
        : `${API_BASE}/jobs/my`;
      const res = await fetch(endpoint, { headers: authHeaders() });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch(err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleJobUpdated = useCallback((updatedJob) => {
    setJobs(prev => prev.map(j => j._id === updatedJob._id ? { ...j, ...updatedJob } : j));
  }, []);

  const totalBudget     = jobs.reduce((s,j)=>s+(j.budget||0),0);
  const inProgress      = jobs.filter(j=>j.status==="in_progress").length;
  const escrowFunded    = jobs.filter(j=>j.status==="escrow_funded").length;
  const totalApplicants = jobs.reduce((s,j)=>s+(j.applications?.length||0),0);

  const pageTitle    = userRole === "provider" ? "My Assigned Jobs" : "My Jobs";
  const pageSubtitle = userRole === "provider"
    ? "Jobs you're currently working on"
    : "Jobs you've posted as a client";

  if (loading) return (
    <div style={{padding:"4rem",textAlign:"center",color:"#94A3B8",fontFamily:"system-ui,sans-serif"}}>
      <div style={{fontSize:32,marginBottom:12}}>⏳</div>
      <div style={{fontSize:15}}>Loading your jobs…</div>
    </div>
  );

  if (error) return (
    <div style={{padding:"4rem",textAlign:"center",fontFamily:"system-ui,sans-serif"}}>
      <div style={{fontSize:32,marginBottom:12}}>⚠️</div>
      <div style={{fontSize:15,color:"#DC2626"}}>Failed to load jobs: {error}</div>
      <button onClick={()=>{setError(null);setLoading(true);fetchJobs();}}
        style={{marginTop:16,padding:"8px 20px",borderRadius:8,border:"1px solid #E2E8F0",
          background:"#fff",cursor:"pointer",fontSize:13}}>Retry</button>
    </div>
  );

  return (
    <div style={{maxWidth:860,margin:"0 auto",padding:"2rem 1rem",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <ToastContainer/>

      <div style={{marginBottom:"1.75rem"}}>
        <h1 style={{margin:0,fontSize:26,fontWeight:800,color:"#0F172A",letterSpacing:"-0.02em"}}>{pageTitle}</h1>
        <p style={{margin:"4px 0 0",fontSize:14,color:"#64748B"}}>{pageSubtitle}</p>
      </div>

      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:"1.75rem"}}>
        <StatCard label="Total Jobs"    value={jobs.length}                           accent="#3B82F6"/>
        <StatCard label="In Progress"   value={inProgress}                            accent="#F59E0B"/>
        <StatCard label="Escrow Funded" value={escrowFunded}                          accent="#10B981"/>
        {userRole!=="provider"&&<>
          <StatCard label="Total Budget"  value={`Rs ${totalBudget.toLocaleString()}`}  accent="#8B5CF6"/>
          <StatCard label="Applicants"    value={totalApplicants}                       accent="#EC4899"/>
        </>}
      </div>

      {jobs.length === 0 ? (
        <div style={{textAlign:"center",padding:"4rem",color:"#94A3B8",background:"#F8FAFC",borderRadius:16}}>
          <div style={{fontSize:40,marginBottom:12}}>📋</div>
          <div style={{fontSize:16,fontWeight:600,color:"#64748B"}}>No jobs yet</div>
          <div style={{fontSize:13,marginTop:4}}>
            {userRole==="provider"?"Jobs assigned to you will appear here.":"Jobs you create will appear here."}
          </div>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
          {jobs.map(job=>(
            <JobCard key={job._id} job={job} userRole={userRole} onJobUpdated={handleJobUpdated}/>
          ))}
        </div>
      )}
    </div>
  );
}