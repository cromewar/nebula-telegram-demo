const TelegramBot = require("node-telegram-bot-api");
const token = "7652805658:AAHZ5nqVlzcdB3aCdnUSIQoQW7fKFIQBtGo"; // Replace with your actual bot token
const bot = new TelegramBot(token, { polling: true });

// Simple in-memory storage for user state (for demo purposes)
const userStates = {};

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
});
