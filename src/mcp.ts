#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { LookerMCP } from './client';
import type { LookerMCPConfig } from './types';

const config: LookerMCPConfig = {
  baseUrl: process.env.LOOKERSDK_BASE_URL!,
  clientId: process.env.LOOKERSDK_CLIENT_ID!,
  clientSecret: process.env.LOOKERSDK_CLIENT_SECRET!
};

const client = new LookerMCP(config);

const server = new McpServer({
  name: 'looker-extras',
  version: '1.0.0'
});

server.tool(
  'create_dashboard_filter',
  'Create a filter on a user-defined Looker dashboard. Requires dashboard_id, name, title, and type. For field-type filters, also provide model, explore, and dimension.',
  {
    dashboard_id: z.string().describe('The ID of the dashboard to add the filter to'),
    name: z.string().describe('The name of the filter (used as the filter key)'),
    title: z.string().describe('The display title of the filter'),
    type: z.enum(['date_filter', 'number_filter', 'string_filter', 'field_filter']).describe('The filter type: date_filter, number_filter, string_filter, or field_filter'),
    default_value: z.string().optional().describe('Default value for the filter'),
    model: z.string().optional().describe('Model name (required if type = field)'),
    explore: z.string().optional().describe('Explore name (required if type = field)'),
    dimension: z.string().optional().describe('Dimension name (required if type = field)')
  },
  async (params) => {
    const result = await client.createDashboardFilter({
      dashboard_id: params.dashboard_id,
      name: params.name,
      title: params.title,
      type: params.type,
      default_value: params.default_value,
      model: params.model,
      explore: params.explore,
      dimension: params.dimension
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'get_dashboard_elements',
  'List all tiles/elements on a Looker dashboard, including their IDs, titles, and current filter listener config. Use this to find element IDs before wiring filters.',
  {
    dashboard_id: z.string().describe('The ID of the dashboard')
  },
  async (params) => {
    const result = await client.getDashboardElements(params.dashboard_id);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'wire_dashboard_filter_to_tile',
  'Wire a dashboard filter to a tile so the tile listens to that filter. Provide the element_id, the dashboard_filter_name (the filter\'s name field, not title), and the field on the tile to filter (e.g. "studio_weekly_actions.action_date").',
  {
    element_id: z.string().describe('The dashboard element/tile ID'),
    dashboard_filter_name: z.string().describe('The name of the dashboard filter to listen to'),
    field: z.string().describe('The field on the tile to apply the filter to (e.g. "view_name.field_name")')
  },
  async (params) => {
    const result = await client.wireDashboardFilterToTile(
      params.element_id,
      params.dashboard_filter_name,
      params.field
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'update_dashboard',
  'Update a user-defined Looker dashboard. Can change title, description, or move it to a different folder by providing folder_id.',
  {
    dashboard_id: z.string().describe('The ID of the dashboard to update'),
    title: z.string().optional().describe('New title for the dashboard'),
    description: z.string().optional().describe('New description for the dashboard'),
    folder_id: z.string().optional().describe('ID of the folder to move the dashboard to')
  },
  async (params) => {
    const result = await client.updateDashboard(params.dashboard_id, {
      title: params.title,
      description: params.description,
      folder_id: params.folder_id
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'search_folders',
  'Search for Looker folders by name. Returns folder IDs, names, and parent folder info.',
  {
    name: z.string().describe('Folder name to search for (supports % wildcard)')
  },
  async (params) => {
    const result = await client.searchFolders(params.name);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'add_markdown_tile',
  'Add a markdown/text tile to a Looker dashboard. Supports markdown formatting in body_text.',
  {
    dashboard_id: z.string().describe('The ID of the dashboard'),
    body_text: z.string().describe('The markdown/text content for the tile'),
    title: z.string().optional().describe('Optional title for the tile'),
    subtitle_text: z.string().optional().describe('Optional subtitle for the tile'),
    title_hidden: z.boolean().optional().describe('Whether to hide the title (default false)')
  },
  async (params) => {
    const result = await client.createMarkdownTile(params.dashboard_id, {
      title: params.title,
      body_text: params.body_text,
      subtitle_text: params.subtitle_text,
      title_hidden: params.title_hidden
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'update_dashboard_element',
  'Edit a tile/element on a Looker dashboard. Can update title, subtitle, body text (for markdown tiles), notes, query_id, refresh interval, and vis_config. Use vis_config to change any chart/table visualization setting: show_value_labels, show_row_totals, show_col_totals, label_density, series_colors, y_axis_gridlines, show_y_axis_labels, chart type, legend position, etc.',
  {
    element_id: z.string().describe('The dashboard element/tile ID to update'),
    title: z.string().optional().describe('New title for the tile'),
    title_hidden: z.boolean().optional().describe('Whether to hide the title'),
    subtitle_text: z.string().optional().describe('New subtitle text'),
    body_text: z.string().optional().describe('New body text/markdown (for text tiles)'),
    note_text: z.string().optional().describe('Note text to display on the tile'),
    note_display: z.string().optional().describe('Note display style: "above", "below", or "hover"'),
    note_state: z.string().optional().describe('Note state: "expanded" or "collapsed"'),
    query_id: z.string().optional().describe('New query ID to assign to the tile'),
    refresh_interval: z.string().optional().describe('Auto-refresh interval (e.g. "5 minutes")'),
    vis_config: z.record(z.string(), z.any()).optional().describe('Visualization config object — supports any Looker vis setting. Examples: {"show_value_labels": true}, {"show_row_totals": true, "show_col_totals": true}, {"series_colors": {"field_name": "#FF0000"}}, {"y_axis_gridlines": 4}. Applied to result_maker.vis_config.')
  },
  async (params) => {
    const { element_id, ...updates } = params;
    const result = await client.updateDashboardElement(element_id, updates);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'add_pivot_to_tile',
  'Add pivot columns to a query-based dashboard tile. Merges with any existing pivots on the tile\'s query.',
  {
    element_id: z.string().describe('The dashboard element/tile ID'),
    pivot_fields: z.array(z.string()).describe('Field names to pivot on (e.g. ["view_name.field_name"])')
  },
  async (params) => {
    const result = await client.addPivotToTile(params.element_id, params.pivot_fields);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'move_resize_dashboard_tile',
  'Move or resize a tile on a Looker dashboard by updating its layout component. Coordinates use the dashboard grid system.',
  {
    dashboard_id: z.string().describe('The ID of the dashboard'),
    element_id: z.string().describe('The dashboard element/tile ID to move/resize'),
    row: z.number().optional().describe('New row position in the grid'),
    column: z.number().optional().describe('New column position in the grid'),
    width: z.number().optional().describe('New width in grid units'),
    height: z.number().optional().describe('New height in grid units')
  },
  async (params) => {
    const result = await client.moveDashboardTile(params.dashboard_id, params.element_id, {
      row: params.row,
      column: params.column,
      width: params.width,
      height: params.height
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'add_table_calculation',
  'Add a table calculation to a query-based dashboard tile. Table calculations are computed client-side in Looker using expressions like offset(), row(), pivot functions, etc. The calculation is added to the query\'s dynamic_fields.',
  {
    element_id: z.string().describe('The dashboard element/tile ID'),
    label: z.string().describe('Display label for the calculation (e.g. "% Diff From Baseline")'),
    expression: z.string().describe('Looker table calculation expression (e.g. "(${view.field} - offset(${view.field}, -(row()-1))) / offset(${view.field}, -(row()-1))")'),
    value_format: z.string().optional().describe('Value format string (e.g. "0.0%", "#,##0", "$#,##0.00")'),
    value_format_name: z.string().optional().describe('Named format: percent_0, percent_1, percent_2, decimal_0, decimal_1, decimal_2, usd_0, usd, gbp_0, eur_0'),
  },
  async (params) => {
    const result = await client.addTableCalculation(params.element_id, {
      label: params.label,
      expression: params.expression,
      value_format: params.value_format,
      value_format_name: params.value_format_name,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'add_custom_dimension',
  'Add a custom dimension to a query-based dashboard tile. Custom dimensions create new grouping/bucketing fields using Looker expressions.',
  {
    element_id: z.string().describe('The dashboard element/tile ID'),
    label: z.string().describe('Display label for the dimension (e.g. "Account Size Bucket")'),
    expression: z.string().describe('Looker expression (e.g. "if(${view.count} > 100, \\"Large\\", \\"Small\\")")'),
    value_format: z.string().optional().describe('Value format string'),
    value_format_name: z.string().optional().describe('Named format: percent_0, percent_1, decimal_0, decimal_1, usd_0, usd, etc.'),
  },
  async (params) => {
    const result = await client.addCustomDimension(params.element_id, {
      label: params.label,
      expression: params.expression,
      value_format: params.value_format,
      value_format_name: params.value_format_name,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'add_custom_measure',
  'Add a custom measure to a query-based dashboard tile. Custom measures aggregate an existing field with a specified function (count, sum, average, min, max, etc.).',
  {
    element_id: z.string().describe('The dashboard element/tile ID'),
    label: z.string().describe('Display label for the measure (e.g. "Active User Count")'),
    based_on: z.string().describe('The field to aggregate (e.g. "users.id")'),
    type: z.string().describe('Aggregation type: count, count_distinct, sum, average, min, max, median, list'),
    expression: z.string().optional().default('').describe('Optional filter expression for the measure'),
    value_format: z.string().optional().describe('Value format string'),
    value_format_name: z.string().optional().describe('Named format: percent_0, percent_1, decimal_0, decimal_1, usd_0, usd, etc.'),
  },
  async (params) => {
    const result = await client.addCustomMeasure(params.element_id, {
      label: params.label,
      expression: params.expression ?? '',
      based_on: params.based_on,
      type: params.type,
      value_format: params.value_format,
      value_format_name: params.value_format_name,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'create_query_tile',
  'Create a query-based dashboard tile with full control over the query, including dynamic_fields (table calculations, custom dimensions, custom measures), vis_config (hidden_fields, chart settings), totals, and pivots — all in a single call. Use this instead of looker-toolbox add_dashboard_element when you need dynamic_fields or row/column totals.',
  {
    dashboard_id: z.string().describe('The ID of the dashboard'),
    model: z.string().describe('The LookML model name'),
    explore: z.string().describe('The explore name'),
    fields: z.array(z.string()).describe('Fields to include in the query'),
    title: z.string().optional().describe('Tile title'),
    filters: z.record(z.string(), z.string()).optional().describe('Query filters (e.g. {"view.field": "value"})'),
    sorts: z.array(z.string()).optional().describe('Sort expressions (e.g. ["view.field desc"])'),
    pivots: z.array(z.string()).optional().describe('Fields to pivot on (must also be in fields)'),
    limit: z.string().optional().describe('Row limit (e.g. "500")'),
    total: z.boolean().optional().describe('Enable column totals'),
    row_total: z.string().optional().describe('Enable row totals (e.g. "right")'),
    dynamic_fields: z.array(z.record(z.string(), z.any())).optional().describe('Table calculations, custom dimensions, or custom measures. Each entry needs an identifier key: "table_calculation", "dimension", or "measure" with a unique ID, plus "label", "expression", and optionally "value_format" or "value_format_name".'),
    vis_config: z.record(z.string(), z.any()).optional().describe('Full visualization config including type, hidden_fields, show_value_labels, series_colors, conditional formatting, etc.'),
    query_timezone: z.string().optional().describe('Query timezone (e.g. "America/New_York")'),
  },
  async (params) => {
    const result = await client.createQueryTile(params.dashboard_id, {
      title: params.title,
      model: params.model,
      explore: params.explore,
      fields: params.fields,
      filters: params.filters,
      sorts: params.sorts,
      pivots: params.pivots,
      limit: params.limit,
      total: params.total,
      row_total: params.row_total,
      dynamic_fields: params.dynamic_fields,
      vis_config: params.vis_config,
      query_timezone: params.query_timezone,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'get_dashboard_layout',
  'Get the full layout of a Looker dashboard — returns every tile\'s position (row, column, width, height) and its element_id. Use this before batch_move_dashboard_tiles to understand current positions and plan a reflow.',
  {
    dashboard_id: z.string().describe('The ID of the dashboard')
  },
  async (params) => {
    const result = await client.getDashboardLayout(params.dashboard_id);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'batch_move_dashboard_tiles',
  'Move and/or resize multiple tiles on a Looker dashboard in a single call. Use get_dashboard_layout first to read current positions, then pass an array of moves. This is the tool to use for reordering sections or reflowing a dashboard.',
  {
    dashboard_id: z.string().describe('The ID of the dashboard'),
    moves: z.array(z.object({
      element_id: z.string().describe('The dashboard element/tile ID'),
      row: z.number().optional().describe('New row position'),
      column: z.number().optional().describe('New column position'),
      width: z.number().optional().describe('New width in grid units'),
      height: z.number().optional().describe('New height in grid units'),
    })).describe('Array of tile moves/resizes to apply')
  },
  async (params) => {
    const result = await client.batchMoveDashboardTiles(params.dashboard_id, params.moves);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'delete_dashboard_element',
  'Delete a tile/element from a Looker dashboard. This is irreversible.',
  {
    element_id: z.string().describe('The dashboard element/tile ID to delete')
  },
  async (params) => {
    const result = await client.deleteDashboardElement(params.element_id);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Metadata exploration tools (ported from looker-toolbox) ─────────

server.tool(
  'get_models',
  'List all LookML models with their explores.',
  {},
  async () => {
    const result = await client.getModels();
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'get_explores',
  'List explores in a LookML model.',
  {
    model: z.string().describe('The LookML model name'),
  },
  async (params) => {
    const result = await client.getExplores(params.model);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'get_dimensions',
  'Get all dimensions for an explore.',
  {
    model: z.string().describe('The LookML model name'),
    explore: z.string().describe('The explore name'),
  },
  async (params) => {
    const result = await client.getDimensions(params.model, params.explore);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'get_measures',
  'Get all measures for an explore.',
  {
    model: z.string().describe('The LookML model name'),
    explore: z.string().describe('The explore name'),
  },
  async (params) => {
    const result = await client.getMeasures(params.model, params.explore);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'get_filters',
  'Get all filter-only fields for an explore.',
  {
    model: z.string().describe('The LookML model name'),
    explore: z.string().describe('The explore name'),
  },
  async (params) => {
    const result = await client.getFilters(params.model, params.explore);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'get_parameters',
  'Get all parameters for an explore.',
  {
    model: z.string().describe('The LookML model name'),
    explore: z.string().describe('The explore name'),
  },
  async (params) => {
    const result = await client.getParameters(params.model, params.explore);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Content discovery tools (ported from looker-toolbox) ────────────

server.tool(
  'get_dashboards',
  'Search for dashboards by title or folder. Returns IDs, titles, descriptions, and folder info.',
  {
    title: z.string().optional().describe('Search by title (supports % wildcard)'),
    folder_id: z.string().optional().describe('Filter by folder ID'),
    limit: z.number().optional().describe('Max results (default 50)'),
  },
  async (params) => {
    const result = await client.searchDashboards(params);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'get_looks',
  'Search for saved Looks by title or folder.',
  {
    title: z.string().optional().describe('Search by title (supports % wildcard)'),
    folder_id: z.string().optional().describe('Filter by folder ID'),
    limit: z.number().optional().describe('Max results (default 50)'),
  },
  async (params) => {
    const result = await client.searchLooks(params);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Query execution tools (ported from looker-toolbox) ──────────────

server.tool(
  'query',
  'Run a Looker query and return results as JSON. Specify model, view, fields, and optional filters/sorts/limit.',
  {
    model: z.string().describe('The LookML model name'),
    view: z.string().describe('The explore/view name'),
    fields: z.array(z.string()).describe('Fields to query (e.g. ["view.dimension", "view.measure"])'),
    filters: z.record(z.string(), z.string()).optional().describe('Query filters (e.g. {"view.field": "value"})'),
    sorts: z.array(z.string()).optional().describe('Sort expressions (e.g. ["view.field desc"])'),
    limit: z.string().optional().describe('Row limit (e.g. "500")'),
    pivots: z.array(z.string()).optional().describe('Fields to pivot on'),
    total: z.boolean().optional().describe('Include column totals'),
    row_total: z.string().optional().describe('Include row totals (e.g. "right")'),
  },
  async (params) => {
    const result = await client.runInlineQuery(params);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'query_sql',
  'Generate the SQL for a Looker query without executing it. Useful for debugging or understanding what SQL Looker generates.',
  {
    model: z.string().describe('The LookML model name'),
    view: z.string().describe('The explore/view name'),
    fields: z.array(z.string()).describe('Fields to query'),
    filters: z.record(z.string(), z.string()).optional().describe('Query filters'),
    sorts: z.array(z.string()).optional().describe('Sort expressions'),
    limit: z.string().optional().describe('Row limit'),
  },
  async (params) => {
    const result = await client.getQuerySql(params);
    return { content: [{ type: 'text' as const, text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'query_url',
  'Generate a Looker explore URL for a query. Returns a shareable link to view the query in the Looker UI.',
  {
    model: z.string().describe('The LookML model name'),
    view: z.string().describe('The explore/view name'),
    fields: z.array(z.string()).describe('Fields to query'),
    filters: z.record(z.string(), z.string()).optional().describe('Query filters'),
    sorts: z.array(z.string()).optional().describe('Sort expressions'),
    limit: z.string().optional().describe('Row limit'),
  },
  async (params) => {
    const result = await client.getQueryUrl(params);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'run_look',
  'Execute a saved Look and return its results.',
  {
    look_id: z.string().describe('The ID of the saved Look'),
    result_format: z.string().optional().describe('Result format: json (default), csv, txt, html, md, xlsx, sql'),
  },
  async (params) => {
    const result = await client.runLook(params.look_id, params.result_format);
    return { content: [{ type: 'text' as const, text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }] };
  }
);

// ── Content creation tools (ported from looker-toolbox) ─────────────

server.tool(
  'make_dashboard',
  'Create a new Looker dashboard in a specified folder.',
  {
    title: z.string().describe('Dashboard title'),
    folder_id: z.string().describe('Folder ID to create the dashboard in'),
    description: z.string().optional().describe('Dashboard description'),
  },
  async (params) => {
    const result = await client.createDashboard(params);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'make_look',
  'Create a new saved Look with a query in a specified folder.',
  {
    title: z.string().describe('Look title'),
    folder_id: z.string().describe('Folder ID to create the Look in'),
    description: z.string().optional().describe('Look description'),
    model: z.string().describe('The LookML model name'),
    view: z.string().describe('The explore/view name'),
    fields: z.array(z.string()).describe('Fields for the query'),
    filters: z.record(z.string(), z.string()).optional().describe('Query filters'),
    sorts: z.array(z.string()).optional().describe('Sort expressions'),
    limit: z.string().optional().describe('Row limit'),
  },
  async (params) => {
    const result = await client.createLook(params);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'add_dashboard_element',
  'Add a tile to a Looker dashboard. Can add by look_id, query_id, or by specifying query parameters (model, view, fields) to create a new query inline.',
  {
    dashboard_id: z.string().describe('The ID of the dashboard'),
    title: z.string().optional().describe('Tile title'),
    look_id: z.string().optional().describe('ID of a saved Look to add as a tile'),
    query_id: z.string().optional().describe('ID of an existing query to add as a tile'),
    model: z.string().optional().describe('LookML model (for creating inline query)'),
    view: z.string().optional().describe('Explore/view name (for creating inline query)'),
    fields: z.array(z.string()).optional().describe('Fields (for creating inline query)'),
    filters: z.record(z.string(), z.string()).optional().describe('Filters (for creating inline query)'),
    sorts: z.array(z.string()).optional().describe('Sorts (for creating inline query)'),
    limit: z.string().optional().describe('Limit (for creating inline query)'),
  },
  async (params) => {
    const { dashboard_id, ...rest } = params;
    const result = await client.addDashboardElement(dashboard_id, rest);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
