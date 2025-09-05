import axios from 'axios';
import crypto from 'crypto';
import FormData from 'form-data';

// Use production API (sandbox doesn't exist as separate domain)
const SUMSUB_API_URL = "https://api.sumsub.com";

// Mock mode for development - set to true to skip real API calls
const USE_MOCK_UPLOAD = true;

function generateSignature(ts, secret, method, endpoint, body) {
  const signString = `${ts}${method}${endpoint}${body}`;
  return crypto.createHmac("sha256", secret).update(signString).digest("hex");
}

function formatWalletAddress(walletAddress) {
  return walletAddress.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletAddress, imageDataUrl, documentType = 'PASSPORT' } = req.body;

    if (!walletAddress || !imageDataUrl) {
      return res.status(400).json({
        error: "Wallet address and image data are required"
      });
    }

    const formattedWalletAddress = formatWalletAddress(walletAddress);
    console.log("🔄 Uploading document for wallet:", formattedWalletAddress);

    // MOCK MODE - For development testing
    console.log("🔍 Checking mock mode, USE_MOCK_UPLOAD =", USE_MOCK_UPLOAD);
    if (USE_MOCK_UPLOAD) {
      console.log("🧪 Mock mode: Simulating successful document upload");
      return res.status(200).json({
        success: true,
        applicantId: `mock_applicant_${formattedWalletAddress}`,
        message: "Document uploaded successfully (mock mode)"
      });
    }

    // REAL SUMSUB API - Only when USE_MOCK_UPLOAD is false
    if (!process.env.SUMSUB_APP_TOKEN || !process.env.SUMSUB_APP_SECRET) {
      return res.status(500).json({
        error: "Sumsub credentials not configured"
      });
    }

    // Step 1: Create applicant if not exists
    const createApplicantEndpoint = "/resources/applicants";
    const createApplicantBody = JSON.stringify({
      externalUserId: formattedWalletAddress,
      info: {
        firstName: "User", // You might want to collect this
        lastName: formattedWalletAddress.substring(0, 8) // Or use wallet prefix
      }
    });
    
    let ts = Math.floor(Date.now() / 1000);
    let signature = generateSignature(
      ts,
      process.env.SUMSUB_APP_SECRET,
      "POST",
      createApplicantEndpoint,
      createApplicantBody
    );

    let applicantResponse;
    try {
      applicantResponse = await axios.post(
        `${SUMSUB_API_URL}${createApplicantEndpoint}`,
        createApplicantBody,
        {
          headers: {
            "Content-Type": "application/json",
            "X-App-Token": process.env.SUMSUB_APP_TOKEN,
            "X-App-Access-Sig": signature,
            "X-App-Access-Ts": ts.toString(),
          },
        }
      );
    } catch (error) {
      // Applicant might already exist, try to get existing one
      const getApplicantEndpoint = `/resources/applicants/-;externalUserId=${formattedWalletAddress}/one`;
      ts = Math.floor(Date.now() / 1000);
      signature = generateSignature(
        ts,
        process.env.SUMSUB_APP_SECRET,
        "GET",
        getApplicantEndpoint,
        ""
      );

      applicantResponse = await axios.get(`${SUMSUB_API_URL}${getApplicantEndpoint}`, {
        headers: {
          "Accept": "application/json",
          "X-App-Token": process.env.SUMSUB_APP_TOKEN,
          "X-App-Access-Sig": signature,
          "X-App-Access-Ts": ts.toString(),
        },
      });
    }

    const applicantId = applicantResponse.data.id;
    console.log("Applicant ID:", applicantId);

    // Step 2: Convert base64 image to buffer
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Step 3: Upload document
    const formData = new FormData();
    formData.append('content', imageBuffer, {
      filename: `passport_${formattedWalletAddress}.jpg`,
      contentType: 'image/jpeg'
    });

    const uploadEndpoint = `/resources/applicants/${applicantId}/info/idDoc`;
    const uploadBody = formData.getBuffer();
    
    ts = Math.floor(Date.now() / 1000);
    signature = generateSignature(
      ts,
      process.env.SUMSUB_APP_SECRET,
      "POST",
      uploadEndpoint,
      uploadBody.toString()
    );

    const uploadResponse = await axios.post(
      `${SUMSUB_API_URL}${uploadEndpoint}?type=${documentType}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "X-App-Token": process.env.SUMSUB_APP_TOKEN,
          "X-App-Access-Sig": signature,
          "X-App-Access-Ts": ts.toString(),
        },
      }
    );

    console.log("Document uploaded successfully:", uploadResponse.data);

    // Step 4: Start verification process
    const reviewEndpoint = `/resources/applicants/${applicantId}/status/pending`;
    ts = Math.floor(Date.now() / 1000);
    signature = generateSignature(
      ts,
      process.env.SUMSUB_APP_SECRET,
      "POST",
      reviewEndpoint,
      ""
    );

    await axios.post(`${SUMSUB_API_URL}${reviewEndpoint}`, {}, {
      headers: {
        "Content-Type": "application/json",
        "X-App-Token": process.env.SUMSUB_APP_TOKEN,
        "X-App-Access-Sig": signature,
        "X-App-Access-Ts": ts.toString(),
      },
    });

    return res.status(200).json({
      success: true,
      applicantId,
      message: "Document uploaded and verification started"
    });

  } catch (error) {
    console.error("Document upload failed:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to upload document",
      details: error.response?.data || error.message
    });
  }
}