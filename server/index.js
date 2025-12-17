import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 金額ライン
const AMOUNTS = {
  small: 50,
  mid: 20000,
  high: 50000,
  max: 100000
};

export default async function handler(req, res) {
  try {
    const level = req.query.level || "small";
    const amount = AMOUNTS[level] || 50;

    // PaymentIntent を作るが…
    const intent = await stripe.paymentIntents.create({
      amount,
      currency: "jpy",
      capture_method: "manual",
      payment_method_types: ["card"]
    });

    // リスク兆候を“観測だけ”
    const risk = intent.charges?.data?.[0]?.outcome?.risk_level;

    // 兆候が強そうなら「実行しない」
    if (risk === "elevated" || risk === "highest") {
      await stripe.paymentIntents.cancel(intent.id);

      return res.status(200).json({
        status: "skipped",
        message: "現在この取引は処理できませんでした。"
      });
    }

    // 通常は Hosted UI に渡す
    res.status(200).json({
      status: "ok",
      clientSecret: intent.client_secret
    });

  } catch (e) {
    res.status(500).json({ error: "BLACK protocol error" });
  }
}