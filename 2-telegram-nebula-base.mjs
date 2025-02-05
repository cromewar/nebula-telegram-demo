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
  const message = `Give me the details of this contract ${contractAddress} on the chain ${chainId}`;
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

// Listen for the /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  // Reset the user's state on start
  userStates[chatId] = {};

  // Send a welcome message with inline keyboard buttons for chain selection
  bot.sendMessage(chatId, "Welcome to the Bot! Please select a chain:", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Ethereum", callback_data: "1" },
          { text: "Sepolia", callback_data: "11155111" },
          { text: "Alfajores", callback_data: "chain_alfajores" },
        ],
      ],
    },
  });
});

// --------------------
// Telegram Bot Setup
// --------------------

// Simple in-memory storage for user state (for demo purposes)
const userStates = {};

// Mapping the chain selected by the user to a numeric chainId.
const chainMapping = {
  ethereum: 1,
  sepolia: 11155111,
  alfajores: 44787,
};

// Handle button presses (callback queries)
bot.on("callback_query", (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const data = callbackQuery.data;

  // Acknowledge the callback query (so the loading icon goes away)
  bot.answerCallbackQuery(callbackQuery.id);

  // Check if the callback data indicates a chain selection
  if (data.startsWith("chain_")) {
    // Extract the selected chain (e.g., "ethereum")
    const selectedChain = data.replace("chain_", "");

    // Save the selected chain and set a flag to expect the contract address next
    userStates[chatId] = { chain: selectedChain, waitingForContract: true };
    // TODO: add chain, waitingForContract, sessionId, contractAddress, conversationActive

    // Ask the user to enter a contract address
    bot.sendMessage(
      chatId,
      `You selected ${selectedChain}. Please enter a contract address:`
    );
  }
});

// Listen for any text messages (which might be the contract address)
bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  // If the user is expected to provide a contract address and the message isn't a command...
  if (
    userStates[chatId] &&
    userStates[chatId].waitingForContract &&
    msg.text &&
    !msg.text.startsWith("/")
  ) {
    const contractAddress = msg.text;

    // Optionally: Add contract address validation here

    // Respond with the received contract address and selected chain
    bot.sendMessage(
      chatId,
      `Received contract address: ${contractAddress} on chain: ${userStates[chatId].chain}`
    );

    // Reset the waiting state
    userStates[chatId].waitingForContract = false;
  }

  // TODO: Ignore commands if (msg.text && msg.text.startsWith("/")) return;
  // if (msg.text && msg.text.startsWith("/")) return;

  // const state = userStates[chatId];
  // if (!state) {
  //   bot.sendMessage(chatId, "Please start by sending /start");
  //   return;
  // }

  // TODO: Case 1 - Waiting for contract address.
  // if (state.waitingForContract) {
  //   try {
  //   } catch (err) {
  //     console.error("Error in askNebula:", err);
  //     bot.sendMessage(
  //       chatId,
  //       "There was an error fetching the contract details. Please try again later."
  //     );
  //   }
  // }

  // TODO: Case 2 - Conversation is active: handle follow-up messages.
  // else if (state.conversationActive) {
  //   try {
  //   } catch (err) {
  //     console.error("Error in handleMessage:", err);
  //     bot.sendMessage(chatId, "Error processing your query. Please try again.");
  //   }
  // }
});
