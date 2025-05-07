// Description: Service for interacting with your local LLM (LM Studio).
import axios from "axios";
import { config as appConfig } from "./config";

interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Queries the local LLM.
 * @param messages - The array of messages for the chat completion.
 * @param modelName - Optional model name to override the default.
 * @returns The content of the LLM's response.
 */

export async function queryLocalLLM(
  messages: LLMMessage[],
  modelName?: string
): Promise<string> {
  const apiUrl = appConfig.lmStudio.apiUrl;
  const effectiveModelName = modelName || appConfig.lmStudio.modelName;

  console.log(
    `[LLMService] Querying LLM at ${apiUrl} with model ${effectiveModelName}`
  );
  console.log(`[LLMService] Messages:`, JSON.stringify(messages, null, 2));

  try {
    const response = await axios.post(
      apiUrl,
      {
        model: effectiveModelName,
        messages: messages,
        temperature: 0.7,
        // stream: false, // MCP might have its own way to specify streaming if needed
        // For non-streaming, LM Studio usually expects 'stream: false' or omits it.
      },
      {
        headers: {
          "Content-Type": "application/json",
          // Add any authentication headers if your LM Studio setup requires them (e.g., 'Authorization': 'Bearer YOUR_API_KEY')
          // For a default LM Studio local server, an API key is often not needed or can be a placeholder.
        },
      }
    );

    if (
      response.data &&
      response.data.choices &&
      response.data.choices.length > 0 &&
      response.data.choices[0].message
    ) {
      console.log("[LLMService] Received response from LLM.");
      return response.data.choices[0].message.content;
    } else {
      console.error(
        "[LLMService] Unexpected LLM response format:",
        response.data
      );
      throw new Error("Invalid LLM response format from LM Studio");
    }
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error("[LLMService] Axios error querying LLM:", error.message);
      if (error.response) {
        console.error(
          "[LLMService] LLM Response Status:",
          error.response.status
        );
        console.error(
          "[LLMService] LLM Response Data:",
          JSON.stringify(error.response.data, null, 2)
        );
      }
    } else {
      console.error("[LLMService] Generic error querying LLM:", error.message);
    }
    // Re-throw the error so the caller (MCP method handler) can handle it
    throw new Error(`Failed to query LLM: ${error.message}`);
  }
}
