# Looker MCP Server

An MCP (Model Context Protocol) server for interacting with Looker's API. Provides tools for running queries, building and managing dashboards, exploring LookML models, and creating content. Built on the official Looker SDK. Designed for use with Claude Code, Cursor, or any MCP-compatible client.

## Setup

### Prerequisites

- Node.js 18+
- npm

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LOOKER_BASE_URL` | Yes | Your Looker instance URL (e.g. `https://mycompany.looker.com`) |
| `LOOKER_CLIENT_ID` | Yes | Looker API client ID |
| `LOOKER_CLIENT_SECRET` | Yes | Looker API client secret |

Generate API credentials at **Looker > Admin > Users > Edit > API Keys**.

### Install and Run

```bash
# Install dependencies
npm install

# Build
npm run build

# Run the server (stdio transport)
node dist/mcp.js
```

### Claude Code Configuration

```bash
claude mcp add looker-extras -- node /path/to/looker-mcp/dist/mcp.js
```

Or add to your `.claude.json`:

```json
{
  "mcpServers": {
    "looker-extras": {
      "command": "node",
      "args": ["/path/to/looker-mcp/dist/mcp.js"],
      "env": {
        "LOOKER_BASE_URL": "...",
        "LOOKER_CLIENT_ID": "...",
        "LOOKER_CLIENT_SECRET": "..."
      }
    }
  }
}
```

## Available Tools

### Query Execution

| Tool | Description |
|------|-------------|
| `query` | Run a Looker query (model, view, fields, filters, sorts, pivots, totals) |
| `query_sql` | Generate the SQL for a query without executing it |
| `query_url` | Generate a shareable Looker explore URL for a query |
| `run_look` | Execute a saved Look (supports json, csv, txt, html, md, xlsx, sql output) |

### Dashboard Management

| Tool | Description |
|------|-------------|
| `get_dashboards` | Search for dashboards by title or folder |
| `make_dashboard` | Create a new dashboard in a folder |
| `update_dashboard` | Update title, description, or move to a different folder |
| `get_dashboard_elements` | List all tiles on a dashboard with IDs and config |
| `get_dashboard_layout` | Get full grid layout (row, column, width, height per tile) |
| `delete_dashboard_element` | Delete a tile from a dashboard |

### Dashboard Tiles

| Tool | Description |
|------|-------------|
| `add_dashboard_element` | Add a tile by look_id, query_id, or inline query |
| `create_query_tile` | Create a tile with full query control (dynamic_fields, vis_config, pivots, totals) |
| `add_markdown_tile` | Add a markdown/text tile |
| `update_dashboard_element` | Edit title, subtitle, body, notes, query_id, vis_config |
| `move_resize_dashboard_tile` | Move or resize a single tile on the grid |
| `batch_move_dashboard_tiles` | Move/resize multiple tiles in one call |
| `add_pivot_to_tile` | Add pivot columns to a query-based tile |
| `add_table_calculation` | Add a table calculation to a tile |
| `add_custom_dimension` | Add a custom dimension to a tile |
| `add_custom_measure` | Add a custom measure to a tile |

### Dashboard Filters

| Tool | Description |
|------|-------------|
| `create_dashboard_filter` | Create a filter (date, number, string, or field type) |
| `wire_dashboard_filter_to_tile` | Wire a filter to a tile so it listens to that filter |

### LookML Exploration

| Tool | Description |
|------|-------------|
| `get_models` | List all LookML models with their explores |
| `get_explores` | List explores in a model |
| `get_dimensions` | Get all dimensions for an explore |
| `get_measures` | Get all measures for an explore |
| `get_filters` | Get all filter-only fields for an explore |
| `get_parameters` | Get all parameters for an explore |

### Content

| Tool | Description |
|------|-------------|
| `get_looks` | Search for saved Looks by title or folder |
| `make_look` | Create a new saved Look with a query |
| `search_folders` | Search for folders by name |
