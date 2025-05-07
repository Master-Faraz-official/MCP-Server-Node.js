// Description: Configuration for the server, like LM Studio URL.
export const config = {
  lmStudio: {
    apiUrl:
      process.env.LM_STUDIO_API_URL ||
      "http://localhost:11434/v1/chat/completions",
    modelName: process.env.LM_STUDIO_MODEL_NAME || "llama-3.2-1b-instruct", // Replace with your actual model identifier from LM Studio
  },
  server: {
    port: process.env.MCP_SERVER_PORT
      ? parseInt(process.env.MCP_SERVER_PORT, 10)
      : 3001,
    mcpEndpoint: "/mcp",
  },
};
