// index.mjs

import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";

// Replace with your actual Telegram bot token.
const token = "7652805658:AAHZ5nqVlzcdB3aCdnUSIQoQW7fKFIQBtGo";
const bot = new TelegramBot(token, { polling: true });

// --------------------
// Nebula Integration
// --------------------

const API_BASE_URL = "https://nebula-api.thirdweb.com";
const SECRET_KEY = "";

/**
 * Basic API request to handle any of the endpoints of Nebula.
 */
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
    console.error("API Response Error:", errorText);
    throw new Error(`Api Error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create a new session in Nebula.
 */
async function createSession(title = "Celo Workshop Query") {
  const response = await apiRequest("/session", "POST", { title });
  const sessionId = response.result.id;
  return sessionId;
}

/**
 * Ask Nebula for contract details.
 */
async function askNebula(chainId, sessionId, contractAddress) {
  // const message = `Give me the details of this contract ${contractAddress} on the chain ${chainId}`;
  const message = `
    Give me the deatils of this contract and provide a structured list of all functions available in the smart contract deployed at address ${contractAddress} on chain ${chainId}. The response must strictly follow this format:

    ### Contract Details:
    - **Name:** <contractName>
    - **Address:** <contractAddress>
    - **Chain ID:** <chainId>
    - **Blockchain:** <blockchainName>

    ### Read-only Functions:
    1. **\`<functionName(parameters)\`**
       - **Returns:** <returnType> (e.g., uint256, string, bool, etc.)
       - **Description:** <brief description of what the function does>

    ### Write-able Functions:
    1. **\`<functionName(parameters)\`**
       - **Returns:** <returnType> (if applicable)
       - **Description:** <brief description of what the function does>
       - **Payable:** <true/false> (if the function can accept Ether).
       - **Parameters:** <parameterName> <parameterType> <parameterDescription>

    If no functions exist in a category, include the section with "None available." Ensure the response is accurate, concise, and excludes unrelated details. If the contract implements interfaces (e.g., ERC20, ERC721), include their functions as well.
  `.trim();
  const requestBody = {
    message,
    session_id: sessionId,
    context_filters: {
      chain_ids: [chainId.toString()],
      contractAddress: [contractAddress],
    },
  };

  console.log("askNebula Request Body:", requestBody);
  const response = await apiRequest("/chat", "POST", requestBody);
  return response.message;
}

/**
 * Handle follow-up messages.
 */
async function handleMessage(query, sessionId, chainId, contractAddress) {
  const requestBody = {
    message: query,
    session_id: sessionId,
    context_filters: {
      chain_ids: [chainId.toString()],
      contractAddress: [contractAddress],
    },
  };

  console.log("handleMessage Request Body:", requestBody);

  const response = await apiRequest("/chat", "POST", requestBody);
  return response.message;
}

// --------------------
// Telegram Bot Setup
// --------------------

// Mapping the chain selected by the user to a numeric chainId.
const chainMapping = {
  ethereum: 1,
  sepolia: 11155111,
  alfajores: 44787,
};

// A simple in-memory user state storage.
const userStates = {};

// /start command: Welcome the user and ask them to select a chain.
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  // Reset user state.
  userStates[chatId] = {};

  bot.sendMessage(chatId, "Welcome to the Bot! Please select a chain:", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Ethereum", callback_data: "chain_ethereum" },
          { text: "Sepolia", callback_data: "chain_sepolia" },
          { text: "Alfajores", callback_data: "chain_alfajores" },
        ],
      ],
    },
  });
});

// Handle chain selection button presses.
bot.on("callback_query", (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const data = callbackQuery.data;

  // Acknowledge the button press.
  bot.answerCallbackQuery(callbackQuery.id);

  if (data.startsWith("chain_")) {
    // Extract the chain (e.g., "ethereum").
    const selectedChain = data.replace("chain_", "");
    //TODO: USER STATES
    // Store the selected chain and mark that we expect a contract address.
    userStates[chatId] = {
      chain: selectedChain,
      waitingForContract: true,
      sessionId: null,
      contractAddress: null,
      conversationActive: false,
    };

    bot.sendMessage(
      chatId,
      `You selected ${selectedChain}. Please enter a contract address:`
    );
  }
});

// Handle incoming messages (contract address or follow-up questions).
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  // Ignore commands.
  if (msg.text && msg.text.startsWith("/")) return;

  const state = userStates[chatId];
  if (!state) {
    bot.sendMessage(chatId, "Please start by sending /start");
    return;
  }

  // Case 1: Waiting for the contract address.
  if (state.waitingForContract) {
    const contractAddress = msg.text.trim();
    // Update the state.
    state.contractAddress = contractAddress;
    state.waitingForContract = false;

    bot.sendMessage(chatId, "Creating session and fetching data...");

    try {
      // Create a new Nebula session.
      const sessionId = await createSession();
      state.sessionId = sessionId;

      // Convert the chain name to a chainId.
      const chainId = chainMapping[state.chain] || 1;

      // Ask Nebula for contract details.
      const responseMessage = await askNebula(
        chainId,
        sessionId,
        contractAddress
      );

      // Mark that the conversation is now active (for follow-ups).
      state.conversationActive = true;

      bot.sendMessage(chatId, responseMessage, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("Error in askNebula:", err);
      bot.sendMessage(
        chatId,
        "Error fetching data from Nebula. Please try again later."
      );
    }
  }
  // Case 2: Conversation is active: handle follow-up queries.
  else if (state.conversationActive) {
    const query = msg.text.trim();
    try {
      const chainId = chainMapping[state.chain] || 1;
      const responseMessage = await handleMessage(
        query,
        state.sessionId,
        chainId,
        state.contractAddress
      );
      bot.sendMessage(chatId, responseMessage, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("Error in handleMessage:", err);
      bot.sendMessage(chatId, "Error processing your query. Please try again.");
    }
  }
});
