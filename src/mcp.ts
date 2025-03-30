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
  'getDashboard': 'getDashboard',
  'runQuery': 'runQuery',
  'getLook': 'getLook',
  'getUser': 'getUser',
  'getFolder': 'getFolder',
  'getRole': 'getRole'
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

async function main() {
  // Read input from stdin
  let input = '';
  process.stdin.setEncoding('utf8');
  
  process.stdin.on('data', (chunk) => {
    input += chunk;
  });

  process.stdin.on('end', async () => {
    try {
      // Parse the input JSON
      const request = JSON.parse(input);
      
      // Initialize LookerMCP with environment variables
      const lookerMcp = new LookerMCP({
        baseUrl: process.env.LOOKER_BASE_URL!,
        clientId: process.env.LOOKER_CLIENT_ID!,
        clientSecret: process.env.LOOKER_CLIENT_SECRET!
      });

      console.error('Received request:', request);

      // Handle different tool invocations
      switch (request.tool) {
        case 'getDashboard':
          const dashboard = await lookerMcp.getDashboard(request.parameters.id);
          console.log(JSON.stringify(dashboard));
          break;
          
        case 'getLook':
          const look = await lookerMcp.getLook(request.parameters.id);
          console.log(JSON.stringify(look));
          break;
          
        case 'runQuery':
          const result = await lookerMcp.runQuery(request.parameters);
          console.log(JSON.stringify(result));
          break;
          
        case 'getUser':
          const user = await lookerMcp.getUser(request.parameters.id);
          console.log(JSON.stringify(user));
          break;
          
        case 'getFolder':
          const folder = await lookerMcp.getFolder(request.parameters.id);
          console.log(JSON.stringify(folder));
          break;
          
        case 'getRole':
          const role = await lookerMcp.getRole(request.parameters.id);
          console.log(JSON.stringify(role));
          break;
          
        default:
          throw new Error(`Unknown tool: ${request.tool}`);
      }

      await lookerMcp.destroy();
      process.exit(0);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 