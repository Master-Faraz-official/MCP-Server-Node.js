// File: src/mcpServer.ts
import express, { Request, Response, NextFunction } from "express";
import {
  JSONRPCServer,
  JSONRPCErrorException,
  JSONRPCErrorCode,
} from "json-rpc-2.0";
import { queryLocalLLM } from "./llmService";
import { config as appConfig } from "./config";

import axios from "axios";
import * as cheerio from "cheerio";

// Define shared LLMMessage type
type LLMMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

// Initialize JSON-RPC server
const rpcServer = new JSONRPCServer();

// ========== TOOL 1: AskLocalLLM ==========
const ASK_LOCAL_LLM_TOOL_NAME = "tool/execute/AskLocalLLM";
rpcServer.addMethod(ASK_LOCAL_LLM_TOOL_NAME, async (params: any) => {
  console.log(`[MCPServer] Received '${ASK_LOCAL_LLM_TOOL_NAME}'`, params);

  let messages: LLMMessage[];

  if (params.messages && Array.isArray(params.messages)) {
    messages = params.messages;
  } else if (params.prompt && typeof params.prompt === "string") {
    messages = [{ role: "user", content: params.prompt }];
  } else {
    throw new JSONRPCErrorException(
      "Invalid params: 'messages' array or 'prompt' string is required.",
      JSONRPCErrorCode.InvalidParams
    );
  }

  try {
    const response = await queryLocalLLM(messages, params.model);
    return {
      contentType: "text/plain",
      content: response,
    };
  } catch (error: any) {
    throw new JSONRPCErrorException(
      error.message || "LLM interaction failed.",
      JSONRPCErrorCode.InternalError
    );
  }
});

// ========== TOOL 2: SummarizeText ==========
const SUMMARIZE_TEXT_TOOL_NAME = "tool/execute/SummarizeText";
rpcServer.addMethod(
  SUMMARIZE_TEXT_TOOL_NAME,
  async (params: { text: string; model?: string }) => {
    const messages: LLMMessage[] = [
      { role: "user", content: `Summarize this:\n${params.text}` },
    ];

    const summary = await queryLocalLLM(messages, params.model);
    return {
      contentType: "text/summary",
      content: summary,
    };
  }
);

// ========== TOOL 3: ExtractCodeBlocks ==========
const EXTRACT_CODE_TOOL_NAME = "tool/execute/ExtractCodeBlocks";
rpcServer.addMethod(
  EXTRACT_CODE_TOOL_NAME,
  async (params: { text: string; model?: string }) => {
    const messages: LLMMessage[] = [
      {
        role: "user",
        content: `Extract code blocks from this text:\n${params.text}`,
      },
    ];

    const codeBlocks = await queryLocalLLM(messages, params.model);
    return {
      contentType: "text/code",
      content: codeBlocks,
    };
  }
);

// ========== TOOL 4: GenerateTitle ==========
const GENERATE_TITLE_TOOL_NAME = "tool/execute/GenerateTitle";
rpcServer.addMethod(
  GENERATE_TITLE_TOOL_NAME,
  async (params: { text: string; model?: string }) => {
    const messages: LLMMessage[] = [
      {
        role: "user",
        content: `Generate a concise title for:\n${params.text}`,
      },
    ];

    const title = await queryLocalLLM(messages, params.model);
    return {
      contentType: "text/title",
      content: title,
    };
  }
);

// ========== TOOL 5: CrawlWebsite ==========
interface CrawlWebsiteParams {
  url: string;
  model?: string;
  task?: "summarize" | "extract_faqs" | "generate_title";
}

const CRAWL_TOOL_NAME = "tool/execute/CrawlWebsite";

rpcServer.addMethod(CRAWL_TOOL_NAME, async (params: CrawlWebsiteParams) => {
  const { url, model = "llama3", task = "summarize" } = params;

  if (!url || typeof url !== "string") {
    throw new JSONRPCErrorException(
      "Invalid params: 'url' must be a string.",
      JSONRPCErrorCode.InvalidParams
    );
  }

  console.log(`[MCPServer] Crawling URL: ${url}`);

  try {
    const res = await axios.get(url);
    const html = res.data;

    const $ = cheerio.load(html);
    const text = $("body")
      .find("*")
      .not("script, style, noscript")
      .map((_, el) => $(el).text())
      .get()
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    const prompt =
      task === "summarize"
        ? `Summarize the following webpage content:\n\n${text.slice(0, 8000)}`
        : task === "extract_faqs"
        ? `Extract important FAQs from this webpage content:\n\n${text.slice(
            0,
            8000
          )}`
        : `Generate a suitable title for the following webpage content:\n\n${text.slice(
            0,
            8000
          )}`;

    const messages: LLMMessage[] = [{ role: "user", content: prompt }];
    const result = await queryLocalLLM(messages, model);

    return {
      contentType: "text/plain",
      content: result,
    };
  } catch (err: any) {
    console.error("[MCPServer] CrawlWebsite failed:", err);
    throw new JSONRPCErrorException(
      "Failed to crawl and process the website.",
      JSONRPCErrorCode.InternalError,
      err.stack
    );
  }
});

// ========== Discovery ==========
const MCP_INITIALIZE_METHOD = "mcp/initialize";
rpcServer.addMethod(MCP_INITIALIZE_METHOD, async () => {
  return {
    protocolVersion: "0.1.0",
    serverInfo: {
      name: "MyNodeMCPLLMServer",
      version: "1.0.0",
    },
    capabilities: {
      tools: [
        {
          name: ASK_LOCAL_LLM_TOOL_NAME,
          description: "Queries a local LLM with provided messages or prompt.",
          inputSchema: {
            type: "object",
            properties: {
              messages: { type: "array" },
              prompt: { type: "string" },
              model: { type: "string" },
            },
          },
          outputSchema: {
            type: "object",
            properties: {
              contentType: { type: "string" },
              content: { type: "string" },
            },
          },
        },
        {
          name: SUMMARIZE_TEXT_TOOL_NAME,
          description: "Summarizes the given text.",
          inputSchema: {
            type: "object",
            properties: {
              text: { type: "string" },
              model: { type: "string" },
            },
          },
          outputSchema: {
            type: "object",
            properties: {
              contentType: { type: "string" },
              content: { type: "string" },
            },
          },
        },
        {
          name: EXTRACT_CODE_TOOL_NAME,
          description: "Extracts code blocks from given text.",
          inputSchema: {
            type: "object",
            properties: {
              text: { type: "string" },
              model: { type: "string" },
            },
          },
          outputSchema: {
            type: "object",
            properties: {
              contentType: { type: "string" },
              content: { type: "string" },
            },
          },
        },
        {
          name: GENERATE_TITLE_TOOL_NAME,
          description: "Generates a title for given content.",
          inputSchema: {
            type: "object",
            properties: {
              text: { type: "string" },
              model: { type: "string" },
            },
          },
          outputSchema: {
            type: "object",
            properties: {
              contentType: { type: "string" },
              content: { type: "string" },
            },
          },
        },
        {
          name: CRAWL_TOOL_NAME,
          description:
            "Crawls a public webpage and uses the LLM to summarize or extract info.",
          inputSchema: {
            type: "object",
            properties: {
              url: { type: "string" },
              model: { type: "string" },
              task: {
                type: "string",
                enum: ["summarize", "extract_faqs", "generate_title"],
              },
            },
            required: ["url"],
          },
          outputSchema: {
            type: "object",
            properties: {
              contentType: { type: "string" },
              content: { type: "string" },
            },
          },
        },
      ],
      resources: [],
      prompts: [],
    },
  };
});

// ========== Export Server ==========
export function createMCPServer(): express.Express {
  const server = express();
  server.use(express.json());

  server.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[MCPServer] ${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length > 0) {
      console.log(`[MCPServer] Body:`, JSON.stringify(req.body, null, 2));
    }
    next();
  });

  server.post(
    appConfig.server.mcpEndpoint,
    async (req: Request, res: Response) => {
      const jsonRPCRequest = req.body;
      const jsonRPCResponse = await rpcServer.receive(jsonRPCRequest);
      if (jsonRPCResponse) {
        res.json(jsonRPCResponse);
      } else {
        res.sendStatus(204);
      }
    }
  );

  return server;
}
