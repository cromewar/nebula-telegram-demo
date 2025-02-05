// Basic Imports

import fetch from "node-fetch";

// Nebula Integration.

const API_BASE_URL = "https://nebula-api.thirdweb.com";
const SECRET_KEY = "";

// Basic API request to handle any of the endpoints of Nebula.

async function apiRequest(endpoint, method, body = {}) {}

// Create a new Session of Nebula.

async function createSession(title = "Celo Workshop Query") {}

// Basic Question to Nebula

async function askNebula(chainId, sessionId) {}

async function main() {
  const sessionId = await createSession();
  const chainId = 1;
  const response = await askNebula(chainId, sessionId);
  console.log(response);
}

main();
