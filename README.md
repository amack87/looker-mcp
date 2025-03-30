# Looker MCP (Model Context Protocol)

A Model Context Protocol implementation for Looker that provides a standardized way to interact with Looker's API. This implementation wraps the official Looker SDK and provides a simplified, type-safe interface for common Looker operations.

## Features

- Type-safe API interactions
- Simplified interface for common Looker operations
- Built on top of the official Looker SDK
- Support for:
  - Running queries
  - Managing dashboards
  - Managing looks
  - User management
  - Folder operations
  - Role management

## Installation

```bash
npm install looker-mcp
```

## Usage

```typescript
import { LookerMCP } from 'looker-mcp'

// Initialize the client
const client = new LookerMCP({
  baseUrl: 'https://your-looker-instance.com',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret'
})

// Run a query
const queryResult = await client.runQuery({
  model: 'your_model',
  view: 'your_view',
  fields: ['field1', 'field2'],
  filters: {
    date: 'last 7 days'
  },
  limit: 100
})

// Get a dashboard
const dashboard = await client.getDashboard('dashboard_id')

// Get a look
const look = await client.getLook('look_id')

// Get a user
const user = await client.getUser('user_id')

// Get a folder
const folder = await client.getFolder('folder_id')

// Get a role
const role = await client.getRole('role_id')

// Clean up
await client.destroy()
```

## Configuration

The LookerMCP client requires the following configuration:

- `baseUrl`: The URL of your Looker instance
- `clientId`: Your Looker API client ID
- `clientSecret`: Your Looker API client secret

You can obtain API credentials from your Looker instance's Admin > Users page.

## API Reference

### Query Operations

#### `runQuery(query: LookerQuery)`
Runs a Looker query and returns the results.

### Dashboard Operations

#### `getDashboard(id: string)`
Retrieves a dashboard by ID.

### Look Operations

#### `getLook(id: string)`
Retrieves a look by ID.

### User Operations

#### `getUser(id: string)`
Retrieves a user by ID.

### Folder Operations

#### `getFolder(id: string)`
Retrieves a folder by ID.

### Role Operations

#### `getRole(id: string)`
Retrieves a role by ID.

## Types

The package includes TypeScript type definitions for all entities:

- `LookerQuery`
- `LookerDashboard`
- `LookerDashboardTile`
- `LookerLook`
- `LookerUser`
- `LookerFolder`
- `LookerRole`
- `LookerPermission`

## Error Handling

All methods throw errors with descriptive messages when operations fail. It's recommended to wrap API calls in try-catch blocks.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT 