// controllers/payment.controller.js
"use strict";

const mongoose = require("mongoose");
const Stripe = require("stripe");
const axios = require("axios");
const { Wallet, Transaction } = require("../models/wallet.model");
const Job = require("../models/job.model");
const User = require("../models/user.model");

// ============================================================================
// ⚙️  CONFIG
// ============================================================================

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const PLATFORM_FEE_RATE = parseFloat(process.env.PLATFORM_FEE_RATE ?? "0.10"); // 10 %
const MIN_TOPUP_NPR = parseFloat(process.env.MIN_TOPUP_NPR ?? "100");
const MAX_TOPUP_NPR = parseFloat(process.env.MAX_TOPUP_NPR ?? "500000");
const MIN_WITHDRAW_NPR = parseFloat(process.env.MIN_WITHDRAW_NPR ?? "100");
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";
const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY;

// ─── Startup env-var warnings ─────────────────────────────────────────────────
if (!process.env.STRIPE_SECRET_KEY) console.warn("⚠️  STRIPE_SECRET_KEY not set");
if (!process.env.STRIPE_WEBHOOK_SECRET) console.warn("⚠️  STRIPE_WEBHOOK_SECRET not set — webhook verification will fail");
if (!EXCHANGE_RATE_API_KEY) console.warn("⚠️  EXCHANGE_RATE_API_KEY not set — top-ups will use fallback rate of 135 NPR/USD");

// ============================================================================
// 💱 CURRENCY UTILITIES
// ============================================================================

// Internal storage: paisa (1 NPR = 100 paisa)
const rsToPaisa = (rs) => Math.round(parseFloat(rs) * 100);
const paisaToRs = (paisa) => +(paisa / 100).toFixed(2);

// Stripe charges in USD cents
const usdToCents = (usd) => Math.round(parseFloat(usd) * 100);

/**
 * getUsdNprRate()
 * Fetches live USD → NPR rate from exchangerate-api.com.
 * Cached for 10 minutes in memory to avoid hitting the free tier limit.
 *
 * Free tier: 1,500 req/month.
 * Get your free key at https://www.exchangerate-api.com
 */
let _rateCache = null; // { rate: Number, fetchedAt: Number }
const RATE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const getUsdNprRate = async () => {
  if (_rateCache && (Date.now() - _rateCache.fetchedAt) < RATE_CACHE_TTL_MS) {
    return _rateCache.rate;
  }

  try {
    const url = `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/pair/USD/NPR`;
    const resp = await axios.get(url, { timeout: 8000 });

    if (resp.data?.result !== "success") {
      throw new Error(`Exchange API error: ${resp.data?.["error-type"] ?? "unknown"}`);
    }

    const rate = resp.data.conversion_rate;
    _rateCache = { rate, fetchedAt: Date.now() };
    console.log(`💱 USD/NPR rate refreshed: 1 USD = ${rate} NPR`);
    return rate;
  } catch (err) {
    if (_rateCache) {
      console.warn("⚠️  Exchange API failed, using stale cached rate:", _rateCache.rate);
      return _rateCache.rate;
    }
    console.error("❌ Exchange rate fetch failed, using fallback 135:", err.message);
    return 135;
  }
};

// ─── getOrCreateWallet ────────────────────────────────────────────────────────
const getOrCreateWallet = async (userId, session = null) => {
  const opts = session ? { session } : {};
  let wallet = await Wallet.findOne({ user: userId }, null, opts);
  if (!wallet) {
    const [created] = await Wallet.create([{ user: userId }], opts);
    wallet = created;
  }
  return wallet;
};

// ─── recordTransaction ────────────────────────────────────────────────────────
const recordTransaction = async (params, session = null) => {
  const opts = session ? { session } : {};
  const [txn] = await Transaction.create([params], opts);
  return txn;
};

// ─── Response helpers ─────────────────────────────────────────────────────────
const fail = (res, status, message, details = undefined) =>
  res.status(status).json({ success: false, message, ...(details ? { details } : {}) });

const ok = (res, status, payload) =>
  res.status(status).json({ success: true, ...payload });

// ─── Format transaction for API output ────────────────────────────────────────
const formatTxn = (txn) => ({
  id: txn._id,
  type: txn.type,
  direction: txn.direction,
  amountNpr: paisaToRs(txn.amount),
  balanceAfterNpr: paisaToRs(txn.balanceAfter),
  status: txn.status,
  note: txn.note,
  job: txn.job ?? null,
  stripe: txn.stripe?.sessionId ? {
    sessionId: txn.stripe.sessionId,
    paymentIntentId: txn.stripe.paymentIntentId,
    chargedUsd: txn.stripe.chargedUsd,
    rateUsed: txn.stripe.rateUsed,
  } : undefined,
  withdrawal: txn.withdrawal?.status ? {
    method: txn.withdrawal.method,
    status: txn.withdrawal.status,
    completedAt: txn.withdrawal.completedAt,
    adminNote: txn.withdrawal.adminNote,
  } : undefined,
  createdAt: txn.createdAt,
});

// ============================================================================
// 💱 EXCHANGE RATE ENDPOINT
// ============================================================================

/**
 * GET /payment/exchange-rate
 * Frontend calls this to show the live rate before the user initiates top-up.
 */
exports.getExchangeRate = async (req, res) => {
  try {
    const rate = await getUsdNprRate();
    return ok(res, 200, {
      usdToNpr: rate,
      cachedAt: _rateCache?.fetchedAt ?? null,
      note: `1 USD = Rs ${rate} NPR`,
    });
  } catch (err) {
    return fail(res, 500, "Failed to fetch exchange rate");
  }
};

// ============================================================================
// 💳 WALLET
// ============================================================================

/**
 * GET /payment/wallet
 * Returns NPR balance + paginated transaction history.
 */
exports.getWallet = async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.user.id);

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const type = req.query.type;

    const txFilter = { user: req.user.id };
    if (type) txFilter.type = type;

    const [transactions, total] = await Promise.all([
      Transaction.find(txFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("job", "title status"),
      Transaction.countDocuments(txFilter),
    ]);

    return ok(res, 200, {
      wallet: {
        id: wallet._id,
        balanceNpr: paisaToRs(wallet.balance),
        lockedNpr: paisaToRs(wallet.lockedBalance),
        totalEarnedNpr: paisaToRs(wallet.totalEarned),
        totalSpentNpr: paisaToRs(wallet.totalSpent),
        updatedAt: wallet.updatedAt,
      },
      transactions: transactions.map(formatTxn),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("❌ getWallet:", err);
    return fail(res, 500, "Failed to fetch wallet");
  }
};

// ============================================================================
// 🔝 TOP-UP via STRIPE CHECKOUT
// ============================================================================

/**
 * POST /payment/topup/initiate
 * Body: { amountNpr }  — user types NPR e.g. 1000
 *
 * Flow:
 *   1. Validate NPR amount
 *   2. Fetch live USD/NPR rate
 *   3. Convert NPR → USD for Stripe (min $0.50)
 *   4. Create Stripe Checkout Session charged in USD
 *   5. Store pending transaction with NPR paisa as source of truth
 *   6. Return checkoutUrl + conversion summary for the UI
 *
 * Wallet is credited in NPR paisa by the webhook when Stripe confirms.
 * The rate used at initiation is locked in metadata — no drift on verify.
 */
exports.initiateTopup = async (req, res) => {
  try {
    const { amountNpr } = req.body;

    const amountNprNum = parseFloat(amountNpr);
    if (isNaN(amountNprNum) || amountNprNum < MIN_TOPUP_NPR || amountNprNum > MAX_TOPUP_NPR) {
      return fail(res, 400, `Amount must be between Rs ${MIN_TOPUP_NPR} and Rs ${MAX_TOPUP_NPR.toLocaleString()}`);
    }

    const user = await User.findById(req.user.id).select("fullName email");
    if (!user) return fail(res, 404, "User not found");

    // Fetch live rate
    const usdNprRate = await getUsdNprRate();

    // Convert NPR → USD
    const amountUsd = +(amountNprNum / usdNprRate).toFixed(2);

    // Stripe minimum is $0.50
    if (amountUsd < 0.50) {
      const minNpr = Math.ceil(0.50 * usdNprRate);
      return fail(res, 400, `Amount too small. Minimum top-up is Rs ${minNpr} at current rate.`);
    }

    const amountPaisa = rsToPaisa(amountNprNum); // ← what gets credited to wallet
    const stripeCents = usdToCents(amountUsd);   // ← what Stripe charges

    const wallet = await getOrCreateWallet(req.user.id);

    // Create Stripe Checkout Session (embedded — user never leaves the page)
    const session = await stripe.checkout.sessions.create({

      mode: "payment",
      ui_mode: "embedded_page",                      // ← renders inside your app
      customer_email: user.email,
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: stripeCents,
          product_data: {
            name: "Wallet Top-up",
            description: `Add Rs ${amountNprNum.toLocaleString()} to your wallet`,
          },
        },
        quantity: 1,
      }],
      // ⚠️  amountPaisa in metadata is the source of truth for crediting.
      //     Never use Stripe's amount_total for crediting the wallet.
      metadata: {
        userId: req.user.id.toString(),
        walletId: wallet._id.toString(),
        amountPaisa: amountPaisa.toString(),
        amountNpr: amountNprNum.toString(),
        chargedUsd: amountUsd.toString(),
        rateUsed: usdNprRate.toString(),
        type: "topup",
      },
      // return_url replaces success_url / cancel_url for embedded mode.
      // Stripe appends ?session_id={CHECKOUT_SESSION_ID} automatically.
      return_url: `${FRONTEND_URL}/wallet?session_id={CHECKOUT_SESSION_ID}`,

    });

    // Store pending transaction — webhook patches it to "completed"
    await Transaction.create([{
      wallet: wallet._id,
      user: req.user.id,
      type: "topup",
      direction: "credit",
      amount: amountPaisa,
      balanceBefore: 0, // patched by webhook
      balanceAfter: 0, // patched by webhook
      status: "pending",
      stripe: {
        sessionId: session.id,
        chargedUsd: amountUsd,
        rateUsed: usdNprRate,
      },
      note: `Top-up Rs ${amountNprNum.toLocaleString()} (charged $${amountUsd} USD @ 1 USD = Rs ${usdNprRate})`,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    }]);

    return ok(res, 200, {
      // clientSecret is what @stripe/react-stripe-js EmbeddedCheckout needs.
      // sessionId is kept for the /topup/status polling endpoint.
      clientSecret: session.client_secret,
      sessionId: session.id,
      amountNpr: amountNprNum,
      chargedUsd: amountUsd,
      rateUsed: usdNprRate,
      summary: `Rs ${amountNprNum.toLocaleString()} ≈ $${amountUsd} USD (1 USD = Rs ${usdNprRate})`,
    });
  } catch (err) {
    console.error("❌ initiateTopup:", err?.message ?? err);
    const detail = err?.raw?.message ?? err?.message ?? "Unknown error";
    return fail(res, 500, "Failed to initiate top-up", detail);
  }
};

/**
 * GET /payment/topup/status
 * Query: { session_id }
 *
 * Polled by the frontend on the success page while waiting for webhook.
 * Read-only — no side effects, safe to poll every 2 seconds.
 */
exports.topupStatus = async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return fail(res, 400, "session_id is required");

    const txn = await Transaction.findOne({
      user: req.user.id,
      "stripe.sessionId": session_id,
    });

    if (!txn) return fail(res, 404, "Payment record not found");

    return ok(res, 200, {
      status: txn.status,           // "pending" | "completed" | "failed"
      amountNpr: paisaToRs(txn.amount),
      chargedUsd: txn.stripe?.chargedUsd,
      rateUsed: txn.stripe?.rateUsed,
      credited: txn.status === "completed",
    });
  } catch (err) {
    console.error("❌ topupStatus:", err);
    return fail(res, 500, "Failed to check top-up status");
  }
};

// ============================================================================
// 🔔 STRIPE WEBHOOK
// ============================================================================

/**
 * POST /payment/webhook/stripe
 *
 * ⚠️  Must receive RAW body (Buffer). Registered with express.raw() in routes.
 *
 * Handled events:
 *   checkout.session.completed     → credit wallet in NPR paisa (from metadata)
 *   checkout.session.expired       → mark transaction failed
 *   payment_intent.payment_failed  → mark transaction failed (card decline, etc.)
 */
exports.stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("❌ Stripe webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ── checkout.session.completed ────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const stripeSession = event.data.object;

    if (stripeSession.metadata?.type !== "topup") {
      return res.json({ received: true });
    }

    const { userId, amountPaisa } = stripeSession.metadata;
    const creditAmount = parseInt(amountPaisa, 10); // NPR paisa — source of truth

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      // Idempotency — Stripe can fire webhooks more than once
      const alreadyDone = await Transaction.findOne({
        "stripe.sessionId": stripeSession.id,
        status: "completed",
      }).session(mongoSession);

      if (alreadyDone) {
        await mongoSession.abortTransaction();
        return res.json({ received: true });
      }

      // Credit wallet in NPR paisa
      const wallet = await getOrCreateWallet(userId, mongoSession);
      const balBefore = wallet.balance;

      wallet.balance += creditAmount;
      wallet.incrementVersion();
      await wallet.save({ session: mongoSession });

      // Patch pending transaction → completed
      await Transaction.findOneAndUpdate(
        { "stripe.sessionId": stripeSession.id, status: "pending" },
        {
          status: "completed",
          balanceBefore: balBefore,
          balanceAfter: wallet.balance,
          "stripe.paymentIntentId": stripeSession.payment_intent,
        },
        { session: mongoSession }
      );

      await mongoSession.commitTransaction();
      console.log(`✅ Wallet credited Rs ${paisaToRs(creditAmount)} for user ${userId}`);
    } catch (err) {
      await mongoSession.abortTransaction();
      console.error("❌ stripeWebhook credit failed:", err);
      return res.status(500).send("Webhook processing failed"); // Stripe will retry
    } finally {
      mongoSession.endSession();
    }
  }

  // ── checkout.session.expired ──────────────────────────────────────────────
  if (event.type === "checkout.session.expired") {
    const stripeSession = event.data.object;
    await Transaction.findOneAndUpdate(
      { "stripe.sessionId": stripeSession.id, status: "pending" },
      { status: "failed", note: "Stripe Checkout session expired" }
    ).catch(err => console.error("❌ Failed to mark expired session:", err));
  }

  // ── payment_intent.payment_failed ─────────────────────────────────────────
  // Fired when a card is declined or payment fails after the session opens.
  // Marks the pending transaction as failed so it doesn't stay stuck forever.
  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object;
    const failReason = pi.last_payment_error?.message ?? "Payment failed";

    await Transaction.findOneAndUpdate(
      { "stripe.paymentIntentId": pi.id, status: "pending" },
      { status: "failed", note: `Stripe payment failed: ${failReason}` }
    ).catch(err => console.error("❌ Failed to mark failed payment_intent:", err));

    // Also try matching by sessionId if paymentIntentId wasn't stored yet
    if (pi.metadata?.sessionId) {
      await Transaction.findOneAndUpdate(
        { "stripe.sessionId": pi.metadata.sessionId, status: "pending" },
        { status: "failed", note: `Stripe payment failed: ${failReason}` }
      ).catch(() => { }); // silent — may already be updated above
    }

    console.warn(`⚠️  Payment failed for PaymentIntent ${pi.id}: ${failReason}`);
  }

  return res.json({ received: true });
};

// ============================================================================
// 🔒 ESCROW — FUND
// ============================================================================

/**
 * POST /payment/escrow/:jobId/fund
 * Client locks NPR funds for a job. job.escrow.amount is treated as NPR.
 *
 * Guards:
 *   - KYC must be verified
 *   - Caller must be the job client
 *   - Job must be in_progress or pending_provider_acceptance
 *   - Escrow must not already be funded
 *   - Client wallet must have sufficient balance
 */
exports.fundEscrow = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { jobId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(jobId)) return fail(res, 400, "Invalid job ID");

    // ── KYC gate ──────────────────────────────────────────────────────────────
    const caller = await User.findById(req.user.id).select("kycVerified").session(session);
    if (!caller?.kycVerified) {
      await session.abortTransaction();
      return fail(res, 403, "KYC verification required before funding escrow");
    }

    const job = await Job.findOne({ _id: jobId, isDeleted: { $ne: true } }).session(session);
    if (!job) { await session.abortTransaction(); return fail(res, 404, "Job not found"); }

    if (job.client.toString() !== req.user.id) {
      await session.abortTransaction();
      return fail(res, 403, "Only the job client can fund escrow");
    }
    if (!["in_progress", "pending_provider_acceptance"].includes(job.status)) {
      await session.abortTransaction();
      return fail(res, 400, `Cannot fund escrow when job status is '${job.status}'`);
    }
    if (job.escrow?.funded) {
      await session.abortTransaction();
      return ok(res, 200, { message: "Escrow already funded", job: { _id: job._id, status: job.status } });
    }

    const amountPaisa = rsToPaisa(job.escrow.amount);
    if (amountPaisa < 1) { await session.abortTransaction(); return fail(res, 400, "Escrow amount is invalid"); }

    const wallet = await Wallet.findOne({ user: req.user.id }).session(session);
    if (!wallet || wallet.balance < amountPaisa) {
      await session.abortTransaction();
      return fail(res, 400,
        `Insufficient balance. Required: Rs ${paisaToRs(amountPaisa)}, Available: Rs ${paisaToRs(wallet?.balance ?? 0)}`
      );
    }

    const balBefore = wallet.balance;
    wallet.balance -= amountPaisa;
    wallet.lockedBalance += amountPaisa;
    wallet.totalSpent += amountPaisa;
    wallet.incrementVersion();
    await wallet.save({ session });

    await recordTransaction({
      wallet: wallet._id,
      user: req.user.id,
      type: "escrow_lock",
      direction: "debit",
      amount: amountPaisa,
      balanceBefore: balBefore,
      balanceAfter: wallet.balance,
      job: job._id,
      note: `Escrow funded for job: ${job.title} (Rs ${paisaToRs(amountPaisa)})`,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    }, session);

    job.escrow.funded = true;
    job.escrow.fundedAt = new Date();
    job.status = "escrow_funded";
    await job.save({ session });

    // ── Credit admin wallet with platform fee ─────────────────────────────────
    const feePaisa = Math.floor(amountPaisa * PLATFORM_FEE_RATE);
    const adminUser = await User.findOne({ role: "admin" }).select("_id").session(session);
    if (adminUser && feePaisa > 0) {
      const adminWallet = await getOrCreateWallet(adminUser._id, session);
      const adminBalBefore = adminWallet.balance;
      adminWallet.balance += feePaisa;
      adminWallet.totalEarned += feePaisa;
      adminWallet.incrementVersion();
      await adminWallet.save({ session });

      await recordTransaction({
        wallet: adminWallet._id,
        user: adminUser._id,
        type: "platform_fee",
        direction: "credit",
        amount: feePaisa,
        balanceBefore: adminBalBefore,
        balanceAfter: adminWallet.balance,
        job: job._id,
        note: `Platform fee ${(PLATFORM_FEE_RATE * 100).toFixed(0)}% from escrow for job: ${job.title}`,
      }, session);
    }

    await session.commitTransaction();

    return ok(res, 200, {
      message: "Escrow funded successfully",
      amountNpr: paisaToRs(amountPaisa),
      balanceNpr: paisaToRs(wallet.balance),
      lockedNpr: paisaToRs(wallet.lockedBalance),
      job: {
        _id: job._id,
        status: job.status,
        escrow: { amountNpr: paisaToRs(amountPaisa), funded: true, fundedAt: job.escrow.fundedAt },
      },
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("❌ fundEscrow:", err);
    return fail(res, 500, "Failed to fund escrow");
  } finally {
    session.endSession();
  }
};

// ============================================================================
// 📊 ESCROW STATUS
// ============================================================================

exports.escrowStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(jobId)) return fail(res, 400, "Invalid job ID");

    const job = await Job.findOne({ _id: jobId, isDeleted: { $ne: true } })
      .populate("client", "fullName email")
      .populate("assignedWorker", "fullName email");
    if (!job) return fail(res, 404, "Job not found");

    const uid = req.user.id;
    const role = req.user.role;
    const isParticipant =
      role === "admin" ||
      job.client?._id?.toString() === uid ||
      job.assignedWorker?._id?.toString() === uid;
    if (!isParticipant) return fail(res, 403, "Access denied");

    const amountPaisa = rsToPaisa(job.escrow?.amount ?? 0);
    const transactions = await Transaction.find({ job: job._id })
      .sort({ createdAt: 1 })
      .select("type direction amount balanceAfter status note createdAt");

    return ok(res, 200, {
      job: {
        _id: job._id,
        title: job.title,
        status: job.status,
        client: { id: job.client._id, name: job.client.fullName },
        provider: job.assignedWorker
          ? { id: job.assignedWorker._id, name: job.assignedWorker.fullName }
          : null,
      },
      escrow: {
        amountNpr: paisaToRs(amountPaisa),
        funded: job.escrow?.funded ?? false,
        fundedAt: job.escrow?.fundedAt ?? null,
        releasedAt: job.escrow?.releasedAt ?? null,
        refundedAt: job.escrow?.refundedAt ?? null,
        platformFeeNpr: paisaToRs(Math.floor(amountPaisa * PLATFORM_FEE_RATE)),
        providerReceivesNpr: paisaToRs(Math.floor(amountPaisa * (1 - PLATFORM_FEE_RATE))),
      },
      auditTrail: transactions.map(t => ({
        type: t.type,
        direction: t.direction,
        amountNpr: paisaToRs(t.amount),
        balanceAfterNpr: paisaToRs(t.balanceAfter),
        status: t.status,
        note: t.note,
        at: t.createdAt,
      })),
    });
  } catch (err) {
    console.error("❌ escrowStatus:", err);
    return fail(res, 500, "Failed to fetch escrow status");
  }
};

// ============================================================================
// ✅ ESCROW RELEASE (Admin → Provider)
// ============================================================================

exports.releaseEscrow = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { jobId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(jobId)) return fail(res, 400, "Invalid job ID");

    const job = await Job.findOne({ _id: jobId, isDeleted: { $ne: true } }).session(session);
    if (!job) { await session.abortTransaction(); return fail(res, 404, "Job not found"); }

    if (!["escrow_funded", "completed"].includes(job.status)) {
      await session.abortTransaction();
      return fail(res, 400, `Job must be escrow_funded or completed. Current: ${job.status}`);
    }
    if (!job.escrow?.funded) { await session.abortTransaction(); return fail(res, 400, "Escrow not funded"); }
    if (job.escrow?.releasedAt) { await session.abortTransaction(); return ok(res, 200, { message: "Already released" }); }
    if (!job.assignedWorker) { await session.abortTransaction(); return fail(res, 400, "No assigned worker"); }

    const totalPaisa = rsToPaisa(job.escrow.amount);
    const feePaisa = Math.floor(totalPaisa * PLATFORM_FEE_RATE);
    const providerPaisa = totalPaisa - feePaisa;

    const clientWallet = await Wallet.findOne({ user: job.client }).session(session);
    if (!clientWallet || clientWallet.lockedBalance < totalPaisa) {
      await session.abortTransaction();
      return fail(res, 400, "Client locked balance insufficient");
    }

    clientWallet.lockedBalance -= totalPaisa;
    clientWallet.incrementVersion();
    await clientWallet.save({ session });

    await recordTransaction({
      wallet: clientWallet._id,
      user: job.client,
      type: "platform_fee",
      direction: "debit",
      amount: feePaisa,
      balanceBefore: clientWallet.balance,
      balanceAfter: clientWallet.balance,
      job: job._id,
      note: `Platform fee (${(PLATFORM_FEE_RATE * 100).toFixed(0)}%) for job: ${job.title}`,
    }, session);

    const providerWallet = await getOrCreateWallet(job.assignedWorker, session);
    const prvBalBefore = providerWallet.balance;
    providerWallet.balance += providerPaisa;
    providerWallet.totalEarned += providerPaisa;
    providerWallet.incrementVersion();
    await providerWallet.save({ session });

    await recordTransaction({
      wallet: providerWallet._id,
      user: job.assignedWorker,
      type: "escrow_release",
      direction: "credit",
      amount: providerPaisa,
      balanceBefore: prvBalBefore,
      balanceAfter: providerWallet.balance,
      job: job._id,
      note: `Payment for job: ${job.title} (after ${(PLATFORM_FEE_RATE * 100).toFixed(0)}% fee)`,
    }, session);

    job.escrow.releasedAt = new Date();
    if (job.status !== "completed") job.status = "completed";
    job.isLive = false;
    await job.save({ session });

    await session.commitTransaction();

    return ok(res, 200, {
      message: "Escrow released to provider",
      totalNpr: paisaToRs(totalPaisa),
      platformFeeNpr: paisaToRs(feePaisa),
      providerReceivesNpr: paisaToRs(providerPaisa),
      job: { _id: job._id, status: job.status },
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("❌ releaseEscrow:", err);
    return fail(res, 500, "Failed to release escrow");
  } finally {
    session.endSession();
  }
};

// ============================================================================
// 🔄 ESCROW REFUND (Admin → Client)
// ============================================================================

exports.refundEscrow = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { jobId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(jobId)) return fail(res, 400, "Invalid job ID");

    const job = await Job.findOne({ _id: jobId, isDeleted: { $ne: true } }).session(session);
    if (!job) { await session.abortTransaction(); return fail(res, 404, "Job not found"); }

    if (!["cancelled", "disputed", "resolved"].includes(job.status)) {
      await session.abortTransaction();
      return fail(res, 400, `Job must be cancelled/disputed to refund. Current: ${job.status}`);
    }
    if (!job.escrow?.funded) { await session.abortTransaction(); return fail(res, 400, "Escrow was never funded"); }
    if (job.escrow?.refundedAt) { await session.abortTransaction(); return ok(res, 200, { message: "Already refunded" }); }

    const amountPaisa = rsToPaisa(job.escrow.amount);
    const { note } = req.body;

    const clientWallet = await Wallet.findOne({ user: job.client }).session(session);
    if (!clientWallet) { await session.abortTransaction(); return fail(res, 404, "Client wallet not found"); }
    if (clientWallet.lockedBalance < amountPaisa) {
      await session.abortTransaction();
      return fail(res, 400, "Locked balance insufficient");
    }

    const balBefore = clientWallet.balance;
    clientWallet.lockedBalance -= amountPaisa;
    clientWallet.balance += amountPaisa;
    clientWallet.totalSpent -= amountPaisa;
    clientWallet.incrementVersion();
    await clientWallet.save({ session });

    await recordTransaction({
      wallet: clientWallet._id,
      user: job.client,
      type: "escrow_refund",
      direction: "credit",
      amount: amountPaisa,
      balanceBefore: balBefore,
      balanceAfter: clientWallet.balance,
      job: job._id,
      note: note ?? `Escrow refunded for cancelled job: ${job.title}`,
    }, session);

    job.escrow.refundedAt = new Date();
    await job.save({ session });

    await session.commitTransaction();

    return ok(res, 200, {
      message: "Escrow refunded to client",
      amountNpr: paisaToRs(amountPaisa),
      job: { _id: job._id, status: job.status },
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("❌ refundEscrow:", err);
    return fail(res, 500, "Failed to refund escrow");
  } finally {
    session.endSession();
  }
};

// ============================================================================
// 💸 WITHDRAWALS (Provider → External)
// ============================================================================

/**
 * POST /payment/withdraw
 * Body: { amountNpr, method, accountDetails }
 * Methods: bank | esewa | khalti | cash
 *
 * Guards:
 *   - KYC must be verified
 *   - Provider must have sufficient balance
 *
 * Withdrawals are manual — admin pays out externally, marks complete in dashboard.
 */
exports.requestWithdrawal = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ── KYC gate ──────────────────────────────────────────────────────────────
    const caller = await User.findById(req.user.id).select("kycVerified").session(session);
    if (!caller?.kycVerified) {
      await session.abortTransaction();
      return fail(res, 403, "KYC verification required before requesting a withdrawal");
    }

    const { amountNpr, method, accountDetails } = req.body;

    // ⚠️  Must stay in sync with the withdrawal.method enum in wallet.model.js
    const VALID_METHODS = ["bank", "esewa", "khalti", "cash"];
    if (!VALID_METHODS.includes(method)) {
      await session.abortTransaction();
      return fail(res, 400, `Invalid method. Use: ${VALID_METHODS.join(", ")}`);
    }
    if (!accountDetails?.trim()) {
      await session.abortTransaction();
      return fail(res, 400, "accountDetails is required");
    }

    const amountNum = parseFloat(amountNpr);
    if (isNaN(amountNum) || amountNum < MIN_WITHDRAW_NPR) {
      await session.abortTransaction();
      return fail(res, 400, `Minimum withdrawal is Rs ${MIN_WITHDRAW_NPR}`);
    }

    const amountPaisa = rsToPaisa(amountNum);
    const wallet = await Wallet.findOne({ user: req.user.id }).session(session);

    if (!wallet || wallet.balance < amountPaisa) {
      await session.abortTransaction();
      return fail(res, 400,
        `Insufficient balance. Requested: Rs ${amountNum}, Available: Rs ${paisaToRs(wallet?.balance ?? 0)}`
      );
    }

    const balBefore = wallet.balance;
    wallet.balance -= amountPaisa;
    wallet.incrementVersion();
    await wallet.save({ session });

    const [txn] = await Transaction.create([{
      wallet: wallet._id,
      user: req.user.id,
      type: "withdrawal",
      direction: "debit",
      amount: amountPaisa,
      balanceBefore: balBefore,
      balanceAfter: wallet.balance,
      status: "pending",
      withdrawal: { method, accountDetails: accountDetails.trim(), status: "pending" },
      note: `Withdrawal of Rs ${amountNum} via ${method}`,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    }], { session });

    await session.commitTransaction();

    return ok(res, 201, {
      message: "Withdrawal request submitted. Admin will process it shortly.",
      withdrawalId: txn._id,
      amountNpr: amountNum,
      method,
      balanceNpr: paisaToRs(wallet.balance),
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("❌ requestWithdrawal:", err);
    return fail(res, 500, "Failed to request withdrawal");
  } finally {
    session.endSession();
  }
};

exports.getPendingWithdrawals = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { type: "withdrawal", "withdrawal.status": "pending" };
    const [txns, total] = await Promise.all([
      Transaction.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit)
        .populate("user", "fullName email phone role"),
      Transaction.countDocuments(filter),
    ]);

    return ok(res, 200, {
      withdrawals: txns.map(t => ({
        id: t._id,
        amountNpr: paisaToRs(t.amount),
        method: t.withdrawal.method,
        accountDetails: t.withdrawal.accountDetails,
        status: t.withdrawal.status,
        user: t.user,
        requestedAt: t.createdAt,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("❌ getPendingWithdrawals:", err);
    return fail(res, 500, "Failed to fetch withdrawals");
  }
};

/**
 * PATCH /payment/admin/withdrawals/:txnId/complete
 * Marks a withdrawal as completed inside a MongoDB transaction so the
 * status update is atomic and can be safely retried.
 */
exports.completeWithdrawal = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { txnId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(txnId)) {
      await session.abortTransaction();
      return fail(res, 400, "Invalid transaction ID");
    }

    const txn = await Transaction.findOne({ _id: txnId, type: "withdrawal" }).session(session);
    if (!txn) { await session.abortTransaction(); return fail(res, 404, "Withdrawal not found"); }
    if (txn.withdrawal.status !== "pending") {
      await session.abortTransaction();
      return fail(res, 400, `Cannot complete a ${txn.withdrawal.status} withdrawal`);
    }

    txn.withdrawal.status = "completed";
    txn.withdrawal.completedAt = new Date();
    txn.withdrawal.adminNote = req.body.adminNote ?? "";
    txn.status = "completed";
    await txn.save({ session });

    await session.commitTransaction();

    return ok(res, 200, {
      message: "Withdrawal marked as completed",
      txnId: txn._id,
      amountNpr: paisaToRs(txn.amount),
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("❌ completeWithdrawal:", err);
    return fail(res, 500, "Failed to complete withdrawal");
  } finally {
    session.endSession();
  }
};

exports.rejectWithdrawal = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { txnId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(txnId)) {
      await session.abortTransaction();
      return fail(res, 400, "Invalid transaction ID");
    }

    const txn = await Transaction.findOne({ _id: txnId, type: "withdrawal" }).session(session);
    if (!txn) { await session.abortTransaction(); return fail(res, 404, "Withdrawal not found"); }
    if (txn.withdrawal.status !== "pending") {
      await session.abortTransaction();
      return fail(res, 400, `Cannot reject a ${txn.withdrawal.status} withdrawal`);
    }

    const wallet = await Wallet.findOne({ user: txn.user }).session(session);
    if (wallet) {
      wallet.balance += txn.amount;
      wallet.incrementVersion();
      await wallet.save({ session });
    }

    txn.withdrawal.status = "rejected";
    txn.withdrawal.adminNote = req.body.adminNote ?? "";
    txn.status = "reversed";
    await txn.save({ session });

    await session.commitTransaction();

    return ok(res, 200, {
      message: "Withdrawal rejected and balance restored",
      txnId: txn._id,
      amountNpr: paisaToRs(txn.amount),
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("❌ rejectWithdrawal:", err);
    return fail(res, 500, "Failed to reject withdrawal");
  } finally {
    session.endSession();
  }
};

// ============================================================================
// 🎁 ADMIN BONUS
// ============================================================================

exports.adminBonus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, amountNpr, note } = req.body;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      await session.abortTransaction();
      return fail(res, 400, "Invalid userId");
    }

    const amountNum = parseFloat(amountNpr);
    if (isNaN(amountNum) || amountNum <= 0) {
      await session.abortTransaction();
      return fail(res, 400, "Amount must be positive");
    }

    const user = await User.findById(userId).session(session);
    if (!user) { await session.abortTransaction(); return fail(res, 404, "User not found"); }

    const amountPaisa = rsToPaisa(amountNum);
    const wallet = await getOrCreateWallet(userId, session);
    const balBefore = wallet.balance;

    wallet.balance += amountPaisa;
    wallet.incrementVersion();
    await wallet.save({ session });

    await recordTransaction({
      wallet: wallet._id,
      user: userId,
      type: "bonus",
      direction: "credit",
      amount: amountPaisa,
      balanceBefore: balBefore,
      balanceAfter: wallet.balance,
      note: note ?? `Admin bonus of Rs ${amountNum}`,
    }, session);

    await session.commitTransaction();

    return ok(res, 200, {
      message: `Bonus of Rs ${amountNum} credited to ${user.fullName}`,
      balanceNpr: paisaToRs(wallet.balance),
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("❌ adminBonus:", err);
    return fail(res, 500, "Failed to issue bonus");
  } finally {
    session.endSession();
  }
};

// ============================================================================
// 📈 ADMIN STATS
// ============================================================================

exports.adminStats = async (req, res) => {
  try {
    const [walletTotals, txnCounts, pendingWithdrawals, pendingTopups] = await Promise.all([
      Wallet.aggregate([{
        $group: {
          _id: null,
          totalBalance: { $sum: "$balance" },
          totalLocked: { $sum: "$lockedBalance" },
          totalEarned: { $sum: "$totalEarned" },
          totalSpent: { $sum: "$totalSpent" },
          walletCount: { $sum: 1 },
        }
      }]),
      Transaction.aggregate([{ $group: { _id: "$type", count: { $sum: 1 }, total: { $sum: "$amount" } } }]),
      Transaction.aggregate([
        { $match: { type: "withdrawal", "withdrawal.status": "pending" } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$amount" } } },
      ]),
      // Pending top-ups: Stripe sessions initiated but webhook not yet received
      Transaction.aggregate([
        { $match: { type: "topup", status: "pending" } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$amount" } } },
      ]),
    ]);

    const totals = walletTotals[0] ?? {};
    const byType = Object.fromEntries(txnCounts.map(t => [t._id, { count: t.count, totalNpr: paisaToRs(t.total) }]));
    const pending = pendingWithdrawals[0] ?? { count: 0, total: 0 };
    const topups = pendingTopups[0] ?? { count: 0, total: 0 };

    return ok(res, 200, {
      wallets: {
        count: totals.walletCount ?? 0,
        totalNpr: paisaToRs(totals.totalBalance ?? 0),
        totalLockedNpr: paisaToRs(totals.totalLocked ?? 0),
      },
      transactions: byType,
      platformRevenueNpr: byType["platform_fee"]?.totalNpr ?? 0,
      pendingWithdrawals: { count: pending.count, totalNpr: paisaToRs(pending.total) },
      pendingTopups: { count: topups.count, totalNpr: paisaToRs(topups.total) },
    });
  } catch (err) {
    console.error("❌ adminStats:", err);
    return fail(res, 500, "Failed to fetch stats");
  }
};