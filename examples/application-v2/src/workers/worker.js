// Safe functional worker using the proven working pattern
console.log("🔧 WORKER: Starting safe functional worker...");

// Browser environment setup (this worked)
(function() {
  if (typeof globalThis === 'undefined') {
    self.globalThis = self;
  }
  
  if (typeof global === 'undefined') {
    globalThis.global = globalThis;
    self.global = self;
  }
  
  if (typeof require === 'undefined') {
    globalThis.require = function(id) {
      throw new Error(`Cannot require '${id}' in browser environment. Use ES6 imports instead.`);
    };
    self.require = globalThis.require;
  }
  
  if (typeof process === 'undefined') {
    globalThis.process = {
      env: {},
      browser: true,
      version: '',
      versions: { node: '0.0.0' }
    };
    self.process = globalThis.process;
  }
  
  globalThis.Buffer = undefined;
  self.Buffer = undefined;
})();

// Import comlink first
import { expose, proxy } from "comlink";
import { API_BASE_URL, API_ENDPOINTS } from "../utils/apiConstants.js";
console.log("✅ Comlink imported");

// Store SDK imports globally after dynamic import
let SDK = {};
let WASM = {};

// Use the same successful dynamic import pattern
async function loadSDK() {
  if (Object.keys(SDK).length > 0) return SDK;
  
  console.log("🔧 Loading SDK v0.9.3 with authorization features...");
  
  // Load all SDK components including new v0.9.3 features
  const {
    Account,
    ProgramManager,
    PrivateKey,
    initThreadPool,
    AleoKeyProvider,
    AleoNetworkClient,
    Program,
    NetworkRecordProvider,
    AleoKeyProviderParams,
    OfflineQuery,
    FunctionExecution,
    verifyFunctionExecution,
    ProvingRequest,
    Authorization,
    EncryptionToolkit
  } = await import("@provablehq/sdk");
  
  SDK = {
    Account,
    ProgramManager,
    PrivateKey,
    initThreadPool,
    AleoKeyProvider,
    AleoNetworkClient,
    Program,
    NetworkRecordProvider,
    AleoKeyProviderParams,
    OfflineQuery,
    FunctionExecution,
    verifyFunctionExecution,
    ProvingRequest,
    Authorization,
    EncryptionToolkit
  };
  
  console.log("✅ SDK v0.9.3 loaded successfully");
  console.log("Available SDK methods:", Object.keys(SDK));
  return SDK;
}

async function loadWASM() {
  if (Object.keys(WASM).length > 0) return WASM;
  
  try {
    console.log("🔧 Loading WASM...");
    const { Execution, VerifyingKey } = await import("@provablehq/wasm");
    WASM = { Execution, VerifyingKey };
    console.log("✅ WASM loaded successfully");
  } catch (error) {
    console.warn("⚠️ WASM load failed (continuing anyway):", error);
    WASM = { Execution: null, VerifyingKey: null };
  }
  return WASM;
}

// Initialize everything
let initialized = false;
let initPromise = null;

async function initializeWorker() {
  if (initialized) return;
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      console.log("🔧 Initializing worker...");
      
      // Load SDK first
      await loadSDK();
      await loadWASM();
      
      // Initialize the threadpool
      await SDK.initThreadPool();
      console.log("✅ Thread pool initialized");
      
      // Initialize components
      const keyProvider = new SDK.AleoKeyProvider();
      keyProvider.useCache(true);
      
      const programManager = new SDK.ProgramManager(API_BASE_URL, keyProvider, undefined);
      const account = new SDK.Account();
      programManager.setAccount(account);
      
      // Store these globally after successful initialization
      self.programManager = programManager;
      self.keyProvider = keyProvider;
      self.account = account;
      
      initialized = true;
      console.log("✅ Worker initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize worker:", error);
      throw error;
    }
  })();
  
  return initPromise;
}

// Function to fetch current network state from Aleo API
async function getCurrentNetworkState() {
  try {
    console.log("Fetching current network state from Aleo API...");
    
    // Fetch both height and state root in parallel
    const [heightResponse, stateRootResponse] = await Promise.all([
      fetch(API_ENDPOINTS.TESTNET_HEIGHT),
      fetch(API_ENDPOINTS.TESTNET_STATE_ROOT)
    ]);
    
    if (!heightResponse.ok || !stateRootResponse.ok) {
      throw new Error(`API request failed: height=${heightResponse.status}, stateRoot=${stateRootResponse.status}`);
    }
    
    const height = await heightResponse.json();
    const stateRoot = await stateRootResponse.json();
    
    const networkState = {
      height: height,
      stateRoot: stateRoot
    };
    
    console.log(`✅ Retrieved network state: height=${height}, stateRoot=${stateRoot}`);
    return networkState;
    
  } catch (error) {
    console.error("Failed to fetch network state:", error);
    
    // Fallback to recent values if API fails
    const fallbackState = {
      height: 9137231,
      stateRoot: "sr1csqdk230epsmtxpdqq38ug3fvm5qx3lylwhs3uwws2d7u9kruc8s5wtgw3"
    };
    
    console.warn("⚠️ Using fallback network state:", fallbackState);
    return fallbackState;
  }
}

// Updated buildProvingRequest function for SDK v0.9.3 using the correct Authorization API
async function buildProvingRequest(program_source, aleoFunction, inputs, privateKey, baseFee = 0.01, priorityFee = 0, broadcast = false) {
  await initializeWorker();
  
  console.log("🔧 Building proving request with SDK v0.9.3 authorization API...");
  
  try {
    const networkClient = new SDK.AleoNetworkClient(API_BASE_URL);
    const account = new SDK.Account({ privateKey: privateKey });
    const recordProvider = new SDK.NetworkRecordProvider(account, networkClient);
    const keyProvider = new SDK.AleoKeyProvider();
    keyProvider.useCache(true);
    
    const programManager = new SDK.ProgramManager(
      API_BASE_URL,
      keyProvider,
      recordProvider,
    );
    programManager.setAccount(account);
    
    const program = SDK.Program.fromString(program_source);
    const programNameMatch = program_source.match(/program\s+([a-zA-Z0-9_]+\.aleo)/);
    const programName = programNameMatch ? programNameMatch[1] : "unknown_program.aleo";
    
    const baseFeeFloat     = baseFee;
    const priorityFeeFloat = priorityFee;
    const baseFeeMicro     = Math.round(baseFeeFloat     * 1_000_000);
    const priorityFeeMicro = Math.round(priorityFeeFloat * 1_000_000);

    console.log("🔧 Using v0.9.3 buildAuthorization method...");
    
    // Build the execution authorization using the new v0.9.3 API
    const executionAuthorization = await programManager.buildAuthorization({
      programName: programName,
      functionName: aleoFunction,
      inputs: inputs,
      programSource: program_source,
      privateKey: SDK.PrivateKey.from_string(privateKey)
    });
    
    console.log("✅ Execution authorization created successfully");
    
    // Build the fee authorization - need the execution ID first
    // For delegated proving, we need to generate a placeholder execution ID
    // This is typically done by creating the execution first, then the fee authorization
    
    let feeAuthorization = null;
    
    // Try to build a fee authorization if we have fee requirements
    if (baseFeeFloat > 0 || priorityFeeFloat > 0) {
      try {
        const executionId = executionAuthorization.toExecutionId().toString();

        feeAuthorization = await programManager.buildFeeAuthorization({
          deploymentOrExecutionId: executionId,
          baseFeeCredits:     baseFeeFloat,
          priorityFeeCredits: priorityFeeFloat,
          privateKey: SDK.PrivateKey.from_string(privateKey),
        });

        console.log("✅ Fee authorization created successfully");
      } catch (feeError) {
        console.warn("⚠️ Could not create fee authorization:", feeError.message);
        // Continue without fee authorization
      }
    }
    
    // Convert authorizations to the format expected by the proving service
    const authorizationObj = executionAuthorization ? JSON.parse(executionAuthorization.toString()) : null;
    const feeAuthorizationObj = feeAuthorization ? JSON.parse(feeAuthorization.toString()) : null;
    
    return {
      authorization: authorizationObj,
      fee_authorization: feeAuthorizationObj,
      broadcast: broadcast
    };
    
  } catch (error) {
    console.error("❌ Error building proving request:", error);
    
    // If the new authorization API fails, provide detailed error information
    if (error.message.includes('buildAuthorization')) {
      throw new Error(`Failed to build authorization with v0.9.3 API: ${error.message}. Make sure you're using the correct SDK version.`);
    }
    
    throw new Error(`Failed to build proving request with SDK v0.9.3: ${error.message}`);
  }
}

async function sendToDelegatedProver(requestData, provingServiceUrl = "/api/prove") {
  console.log("🔧 Sending to delegated prover...");
  console.log("Request data:", requestData);
  
  const response = await fetch(provingServiceUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Proving service returned ${response.status}: ${errorText}`);
  }
  
  const result = await response.json();
  if (result.error) {
    throw new Error(`Proving service error: ${result.error}`);
  }
  
  console.log("✅ Delegated prover response received");
  return result;
}

// local proving that also builds a fee-paying transaction
//      returns: [outputs, txString, txObject]
async function localProgramExecutionWithFee(
  program_source,
  aleoFunction,
  inputs,
  privateKey,
  baseFee        = 0.01,   // ALEO
  priorityFee    = 0,      // ALEO
  broadcast      = true    // whether to broadcast to network
) {
  await initializeWorker();

  // prepare managers bound to the caller's key
  const networkClient   = new SDK.AleoNetworkClient(API_BASE_URL);
  const account         = new SDK.Account({ privateKey });
  const recordProvider  = new SDK.NetworkRecordProvider(account, networkClient);
  const keyProvider     = new SDK.AleoKeyProvider();  keyProvider.useCache(true);
  const programManager  = new SDK.ProgramManager(API_BASE_URL, keyProvider, recordProvider);
  programManager.setAccount(account);

  // helpers
  const program         = SDK.Program.fromString(program_source);
  const programName     = program.id();
  const keySearchParams = new SDK.AleoKeyProviderParams({ cacheKey: `${programName}/${aleoFunction}` });

  // current chain height & state root
  const { height, stateRoot } = await getCurrentNetworkState();
  const offlineQuery = new SDK.OfflineQuery(height, stateRoot);

  // build and locally prove the full transaction (main + fee)
  const tx = await programManager.buildExecutionTransaction({
    programName,
    functionName : aleoFunction,
    inputs,
    keySearchParams,
    fee          : baseFee,
    priorityFee,
    privateFee   : false,
    offlineQuery
  });

  const txString = tx.toString();

  // pull outputs from the first transition (main execution)
  let outputs = [];
  try   { outputs = JSON.parse(txString).transitions?.[0]?.outputs ?? []; }
  catch { /* noop – leave outputs as [] */ }

  // broadcast to network if requested
  let broadcastResult = null;
  if (broadcast) {
    broadcastResult = await broadcastTransactionToNetwork(txString);
  }

  return [outputs, txString, tx, broadcastResult];
}

async function broadcastTransactionToNetwork(txString) {
  const url = API_ENDPOINTS.TRANSACTION_BROADCAST;
  
  console.log("📡 Broadcasting transaction to network...");
  console.log("URL:", url);
  console.log("Transaction payload:", JSON.stringify(JSON.parse(txString), null, 2));
  console.log("Transaction string length:", txString.length);
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: txString,
    });

    if (!response.ok) {
      // Handle specific status codes
      if (response.status === 529) {
        console.warn("⚠️ Broadcast service temporarily unavailable (529). Transaction generated but not broadcast.");
        return { success: false, error: "Service temporarily unavailable", status: 529 };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ Transaction successfully broadcast to network");
    return { success: true, result };
  } catch (error) {
    console.error("Failed to broadcast transaction:", error);
    return { success: false, error: error.message };
  }
}

async function buildDelegatedProvingRequest(program_source, aleoFunction, inputs, privateKey, broadcast = true) {
  console.log("🔧 Building delegated proving request with v0.9.3 authorization API...");
  
  const authStartTime = performance.now();
  const requestData = await buildProvingRequest(program_source, aleoFunction, inputs, privateKey, 0.01, 0, broadcast);
  const authEndTime = performance.now();
  const authDuration = (authEndTime - authStartTime) / 1000;
  console.log(`✅ Authorization built in ${authDuration.toFixed(2)} seconds`);
  
  return requestData;
}

async function executeDelegatedProvingRequest(requestData, provingServiceUrl, broadcast = true) {
  console.log("🔧 Executing delegated proving request...");
  
  const provingStartTime = performance.now();
  const result = await sendToDelegatedProver(requestData, provingServiceUrl);
  const provingEndTime = performance.now();
  const provingDuration = (provingEndTime - provingStartTime) / 1000;
  console.log(`✅ Delegated proving completed in ${provingDuration.toFixed(2)} seconds`);
  
  // Handle broadcast result if present
  if (broadcast && result.broadcast_result) {
    console.log("🌐 Transaction broadcast result:", result.broadcast_result);
  }
  
  let execution, outputs, fullTransaction;
  
  if (result.transaction) {
    execution = JSON.stringify(result.transaction);
    outputs = result.transaction.transitions?.[0]?.outputs || [];
    fullTransaction = result.transaction;
  } else if (result.execution) {
    execution = typeof result.execution === 'string' ? result.execution : JSON.stringify(result.execution);
    try {
      const executionObj = typeof result.execution === 'string' ? JSON.parse(result.execution) : result.execution;
      outputs = executionObj.transitions?.[0]?.outputs || [];
    } catch (parseError) {
      outputs = [];
    }
    fullTransaction = result; // fallback to full result
  } else {
    execution = JSON.stringify(result);
    outputs = result.transitions?.[0]?.outputs || [];
    fullTransaction = result;
  }
  
  console.log(`✅ Delegated proving request execution completed with v0.9.3 (broadcast=${broadcast})`);
  return [outputs, execution, fullTransaction, result.broadcast_result];
}


// Export all methods including version check
const workerMethods = { 
  buildDelegatedProvingRequest,
  executeDelegatedProvingRequest,
  buildProvingRequest,
  sendToDelegatedProver,
  initializeWorker, 
  localProgramExecutionWithFee,
  loadSDK,
  loadWASM
};

expose(workerMethods);
console.log("✅ Safe functional worker ready with SDK v0.9.3 Authorization API!");

// Auto-initialize
initializeWorker().catch(error => {
  console.error("❌ Auto-initialization failed:", error);
});