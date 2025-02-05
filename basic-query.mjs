// Basic Imports

import fetch from "node-fetch";

// Nebula Integration.

const API_BASE_URL = "https://nebula-api.thirdweb.com";
const SECRET_KEY =
  "";

// Basic API request to handle any of the endpoints of Nebula.

async function apiRequest(endpoint, method, body = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-secret-key": SECRET_KEY,
    },
    body: Object.keys(body).length ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("API Reseponse Error:", errorText);
    throw new Error(`Api Error: ${response.statusText}`);
  }

  return response.json();
}

// Create a new Session of Nebula.

async function createSession(title = "Celo Workshop Query") {
  const response = await apiRequest("/session", "POST", { title });
  const sessionId = response.result.id;
  return sessionId;
}

// Basic Question to Nebula

async function askNebula(chainId, sessionId, contractAddress) {
  const message = `Give me the details of this contract ${contractAddress} on the chain ${chainId}`;
  const requestBody = {
    message,
    session_id: sessionId,
    context_filters: {
      chain_ids: [chainId.toString()],
      contractAddress: [contractAddress],
    },
  };

  async function handleMessage(msg, chatId, sessionId, contractAddress) {
    const response = await apiRequest("/chat", "POST", {
      message: msg,
      session_id: sessionId,
      context_filters: {
        chain_ids: [chainId.toString()],
        contractAddress: [contractAddress],
      },
    });

    return response.message;
  }

  console.log("QueryContract Request Body", requestBody);
  const response = await apiRequest("/chat", "POST", requestBody);
  return response.message;
}

async function main() {
  const sessionId = await createSession();
  const chainId = 1;
  const response = await askNebula(chainId, sessionId);
  console.log(response);
}

main();
