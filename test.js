// Test script to simulate MCP tool invocations
const { spawn } = require('child_process');
const path = require('path');

// Sample tool invocations
const testCases = [
  {
    tool: 'getDashboard',
    parameters: {
      id: '1'
    }
  },
  {
    tool: 'runQuery',
    parameters: {
      model: 'appcues',
      view: 'users',
      fields: ['users.email', 'users.account_created_dt', 'users.account_name'],
      limit: 5
    }
  }
];

async function runTest() {
  const mcpProcess = spawn('node', ['dist/mcp.js'], {
    env: {
      ...process.env,
      LOOKER_BASE_URL: 'https://appcues.looker.com',
      LOOKER_CLIENT_ID: 'KWTr2Xjjq493qWgJcnPF',
      LOOKER_CLIENT_SECRET: 'YncDjTRSnPgTv6RrwvGjTN7N'
    }
  });

  mcpProcess.stdout.on('data', (data) => {
    try {
      const response = JSON.parse(data.toString().trim());
      console.log('MCP Response:', JSON.stringify(response, null, 2));
    } catch (error) {
      console.log('MCP Output:', data.toString());
    }
  });

  mcpProcess.stderr.on('data', (data) => {
    console.error('MCP Error:', data.toString());
  });

  // Send test invocations with a delay between them
  for (const testCase of testCases) {
    console.log(`\nTesting ${testCase.tool}...`);
    mcpProcess.stdin.write(JSON.stringify(testCase) + '\n');
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Close stdin after sending all test cases
  mcpProcess.stdin.end();
}

runTest().catch(console.error); 