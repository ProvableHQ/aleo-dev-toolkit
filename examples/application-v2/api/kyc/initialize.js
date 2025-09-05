import axios from 'axios';
import crypto from 'crypto';

// Use sandbox API for development
const SUMSUB_API_URL = process.env.NODE_ENV === 'production' 
  ? "https://api.sumsub.com"
  : "https://api.sandbox.sumsub.com";

function generateSignature(ts, secret, method, endpoint, body) {
  const signString = `${ts}${method}${endpoint}${body}`;
  return crypto.createHmac("sha256", secret).update(signString).digest("hex");
}

function formatWalletAddress(walletAddress) {
  // Remove any special characters and convert to lowercase
  return walletAddress.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    if (!process.env.SUMSUB_APP_TOKEN || !process.env.SUMSUB_APP_SECRET) {
      console.error("Missing Sumsub credentials:", {
        hasAppToken: !!process.env.SUMSUB_APP_TOKEN,
        hasAppSecret: !!process.env.SUMSUB_APP_SECRET,
      });
      return res.status(500).json({
        success: false, 
        error: "Sumsub credentials not configured"
      });
    }

    const { walletAddress, signature } = req.body;
    const formattedWalletAddress = formatWalletAddress(walletAddress);
    console.log("Initializing KYC for wallet:", formattedWalletAddress);

    // Verify the signature (you should implement proper signature verification)
    const isValidSignature = true; // Replace with actual verification

    if (!isValidSignature) {
      console.error("Invalid signature for wallet:", formattedWalletAddress);
      return res.status(400).json({
        success: false, 
        error: "Invalid signature"
      });
    }

    console.log("Generating access token for wallet:", formattedWalletAddress);

    try {
      const endpoint = "/resources/accessTokens/sdk";
      const method = "POST";
      const requestBody = JSON.stringify({
        userId: formattedWalletAddress,
        ttlInSecs: 600, // Token valid for 10 minutes
        levelName: "basic-kyc-level" // Make sure this level exists in your Sumsub dashboard
      });
      const ts = Math.floor(Date.now() / 1000);
      const sig = generateSignature(
        ts,
        process.env.SUMSUB_APP_SECRET,
        method,
        endpoint,
        requestBody
      );

      // Generate access token for WebSDK
      const tokenResponse = await axios.post(
        `${SUMSUB_API_URL}${endpoint}`,
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
            "X-App-Token": process.env.SUMSUB_APP_TOKEN,
            "X-App-Access-Sig": sig,
            "X-App-Access-Ts": ts.toString(),
          },
        }
      );

      console.log(
        "Successfully generated token for wallet:",
        formattedWalletAddress
      );

      return res.status(200).json({
        success: true,
        token: tokenResponse.data.token,
      });
    } catch (tokenError) {
      console.error("Token generation failed:", {
        walletAddress: formattedWalletAddress,
        status: tokenError.response?.status,
        statusText: tokenError.response?.statusText,
        data: tokenError.response?.data,
        message: tokenError.message,
      });

      return res.status(tokenError.response?.status || 500).json({
        success: false,
        error: "Failed to generate access token",
        details: tokenError.response?.data || tokenError.message,
      });
    }
  } catch (error) {
    console.error("KYC initialization failed:", {
      error: error.message,
      stack: error.stack,
      response: error.response?.data,
    });

    return res.status(error.response?.status || 500).json({
      success: false,
      error: "Failed to initialize KYC process",
      details: error.response?.data || error.message,
    });
  }
}