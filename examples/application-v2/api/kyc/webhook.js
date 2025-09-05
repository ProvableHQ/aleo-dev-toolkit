import crypto from 'crypto';

function verifySumsubSignature(payload, signature, secret) {
  const hmac = crypto.createHmac("sha256", secret);
  const calculatedSignature = hmac.update(payload).digest("hex");
  return calculatedSignature === signature;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    const signature = req.headers['x-sumsub-signature'];

    // Verify webhook signature
    const isValid = verifySumsubSignature(
      JSON.stringify(payload),
      signature || "",
      process.env.SUMSUB_WEBHOOK_SECRET
    );

    if (!isValid) {
      return res.status(401).json({
        error: "Invalid webhook signature"
      });
    }

    const { type, payload: webhookPayload } = payload;
    console.log("webhookPayload", webhookPayload);

    // Handle different webhook events
    switch (type) {
      case "applicantReviewed":
        // Update your database with the verification status
        // You might want to trigger additional actions here
        console.log("Applicant reviewed:", webhookPayload);
        break;

      case "applicantCreated":
        // Handle new applicant creation
        console.log("Applicant created:", webhookPayload);
        break;

      default:
        console.log("Unhandled webhook event:", type);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to process webhook:", error);
    return res.status(500).json({
      error: "Failed to process webhook"
    });
  }
}