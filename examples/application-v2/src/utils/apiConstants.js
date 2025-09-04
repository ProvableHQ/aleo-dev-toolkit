// API configuration constants
export const API_BASE_URL = "https://api.explorer.provable.com/v1";

// API endpoints
export const API_ENDPOINTS = {
  TESTNET_HEIGHT: `${API_BASE_URL}/testnet/latest/height`,
  TESTNET_STATE_ROOT: `${API_BASE_URL}/testnet/latest/stateRoot`,
  TRANSACTION_BROADCAST: `${API_BASE_URL}/testnet/transaction/broadcast`
};