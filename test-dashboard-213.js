// Test script to fetch dashboard 213
const { spawn } = require('child_process');

async function fetchDashboard213() {
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
      console.log('Dashboard 213:', JSON.stringify(response, null, 2));
    } catch (error) {
      console.log('Output:', data.toString());
    }
  });

  mcpProcess.stderr.on('data', (data) => {
    console.error('Error:', data.toString());
  });

  // Send request for dashboard 213
  const request = {
    tool: 'getDashboard',
    parameters: {
      id: '213'
    }
  };

  console.log('\nFetching dashboard 213...');
  mcpProcess.stdin.write(JSON.stringify(request) + '\n');
  mcpProcess.stdin.end();
}

fetchDashboard213().catch(console.error); 