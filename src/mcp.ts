#!/usr/bin/env node

import { LookerMCP } from './client';
import { LookerMCPConfig } from './types';

// Read environment variables for configuration
const config: LookerMCPConfig = {
  baseUrl: process.env.LOOKER_BASE_URL!,
  clientId: process.env.LOOKER_CLIENT_ID!,
  clientSecret: process.env.LOOKER_CLIENT_SECRET!
};

let client: LookerMCP | null = null;

process.stdin.setEncoding('utf-8');

type JsonRpcRequest = {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params: unknown;
};

type JsonRpcResponse = {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

// Method mapping from MCP tool names to client methods
const methodMap: Record<string, keyof LookerMCP> = {
  'mcp_looker_get_dashboard': 'getDashboard',
  'mcp_looker_run_query': 'runQuery',
  'mcp_looker_get_look': 'getLook',
  'mcp_looker_get_user': 'getUser',
  'mcp_looker_get_folder': 'getFolder',
  'mcp_looker_get_role': 'getRole'
};

// Handle incoming messages
process.stdin.on('data', async (data) => {
  try {
    // Initialize client if not already created
    if (!client) {
      client = new LookerMCP(config);
    }

    const request = JSON.parse(data.toString()) as JsonRpcRequest;
    console.error('Received request:', request);

    if (request.jsonrpc !== '2.0') {
      throw new Error('Invalid JSON-RPC version');
    }

    const response: JsonRpcResponse = {
      jsonrpc: '2.0',
      id: request.id
    };

    try {
      const clientMethod = methodMap[request.method];
      if (!clientMethod) {
        throw new Error(`Unknown method: ${request.method}`);
      }

      // Call the appropriate method based on the tool name
      const result = await (client[clientMethod] as Function).call(client, request.params);
      response.result = result;
    } catch (error) {
      response.error = {
        code: -32000,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        data: error
      };
    }

    // Send the response back
    console.log(JSON.stringify(response));
  } catch (error) {
    // Handle JSON parse errors or other top-level errors
    const errorResponse: JsonRpcResponse = {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: error instanceof Error ? error.message : 'Parse error',
        data: error
      }
    };
    console.log(JSON.stringify(errorResponse));
  }
});

// Clean up on exit
process.on('exit', async () => {
  if (client) {
    await client.destroy();
  }
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
}); 