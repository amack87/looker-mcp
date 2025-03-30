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
  }
];

async function runTest() {
  const mcpProcess = spawn('node', ['dist/mcp.js'], {
    env: {
      ...process.env
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