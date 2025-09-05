import axios from 'axios';
import crypto from 'crypto';

const SUMSUB_API_URL = "https://api.sumsub.com";

function generateSignature(ts, secret, method, endpoint, body) {
  const signString = `${ts}${method}${endpoint}${body}`;
  return crypto.createHmac("sha256", secret).update(signString).digest("hex");
}

function formatWalletAddress(walletAddress) {
  // Remove any special characters and convert to lowercase
  return walletAddress.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function getApplicantId(walletAddress) {
  console.log("getting applicant id for:", walletAddress);
  const endpoint = `/resources/applicants/-;externalUserId=${walletAddress}/one`;
  const method = "GET";
  const ts = Math.floor(Date.now() / 1000);
  const signature = generateSignature(
    ts,
    process.env.SUMSUB_APP_SECRET,
    method,
    endpoint,
    ""
  );

  const response = await axios.get(`${SUMSUB_API_URL}${endpoint}`, {
    headers: {
      Accept: "application/json",
      "X-App-Token": process.env.SUMSUB_APP_TOKEN,
      "X-App-Access-Sig": signature,
      "X-App-Access-Ts": ts.toString(),
    },
  });

  if (!response.data?.id) {
    throw new Error("Applicant not found");
  }

  return response.data.id;
}

export default async function handler(req, res) {
  console.log("getting kyc status");
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletAddress } = req.query || {};

    if (!walletAddress) {
      return res.status(400).json({
        error: "Wallet address is required"
      });
    }

    const formattedWalletAddress = formatWalletAddress(walletAddress);
    console.log("Checking KYC status for wallet:", formattedWalletAddress);

    // MOCK MODE - For development without real Sumsub API calls
    // Assume wallet is not verified initially
    const status = "not_started";
    
    console.log(`Mock KYC status for ${formattedWalletAddress}: ${status}`);

    return res.status(200).json({ 
      status,
      message: "Mock response - wallet not yet verified"
    });

    // TODO: When ready for production, uncomment the real Sumsub API implementation below
    /*
    if (!process.env.SUMSUB_APP_TOKEN || !process.env.SUMSUB_APP_SECRET) {
      console.error("Missing Sumsub credentials");
      return res.status(500).json({
        error: "Sumsub credentials not configured"
      });
    }

    // First get the applicant ID
    const applicantId = await getApplicantId(formattedWalletAddress);
    
    // Get applicant status from Sumsub
    const endpoint = `/resources/applicants/${applicantId}/status`;
    const method = "GET";
    const ts = Math.floor(Date.now() / 1000);
    const signature = generateSignature(
      ts,
      process.env.SUMSUB_APP_SECRET,
      method,
      endpoint,
      ""
    );

    const response = await axios.get(`${SUMSUB_API_URL}${endpoint}`, {
      headers: {
        Accept: "application/json",
        "X-App-Token": process.env.SUMSUB_APP_TOKEN,
        "X-App-Access-Sig": signature,
        "X-App-Access-Ts": ts.toString(),
      },
    });

    let status;
    if (response.data.reviewStatus === "completed") {
      status = response.data.reviewResult?.reviewAnswer === "GREEN" ? "completed" : "failed";
    } else if (response.data.reviewStatus === "pending") {
      status = "in_progress";
    } else {
      status = "not_started";
    }

    return res.status(200).json({ status });
    */
  } catch (error) {
    console.error("Failed to check KYC status:", error);
    return res.status(500).json({
      error: "Failed to check KYC status"
    });
  }
}