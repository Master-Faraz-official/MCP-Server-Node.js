// Description: Entry point for the application.
import { createMCPServer } from "./mcpServer";
import { config as appConfig } from "./config";

const server = createMCPServer();
const PORT = appConfig.server.port;

server.listen(PORT, () => {
  console.log(
    `[Index] MCP Server listening on http://localhost:${PORT}${appConfig.server.mcpEndpoint}`
  );
  console.log(
    `[Index] LM Studio API configured at: ${appConfig.lmStudio.apiUrl}`
  );
  console.log(
    `[Index] Default LM Studio Model: ${appConfig.lmStudio.modelName}`
  );
  console.log(
    `[Index] Ensure your LM Studio server is running and the model is loaded.`
  );
});
