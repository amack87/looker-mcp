import { LookerNodeSDK, NodeSettingsIniFile, NodeSettings } from '@looker/sdk-node'
import { IDashboardElement, IUser, IGroup } from '@looker/sdk'
import type {
  LookerMCPConfig,
  LookerMCPContext,
  LookerQuery,
  LookerDashboard,
  LookerLook,
  LookerUser,
  LookerFolder,
  LookerRole,
  LookerPermission,
  CreateDashboardFilterParams,
  LookerDashboardFilter
} from './types'

export class LookerMCP {
  private context: LookerMCPContext

  constructor(config: LookerMCPConfig) {
    console.error('Initializing LookerMCP with config:', { baseUrl: config.baseUrl });
    
    const settings = {
      base_url: config.baseUrl,
      verify_ssl: true,
      timeout: 120,
      agentTag: 'Looker MCP',
      headers: {},
      isConfigured: () => true,
      readConfig: () => ({
        base_url: config.baseUrl,
        verify_ssl: true,
        timeout: 120,
        headers: {},
        client_id: config.clientId,
        client_secret: config.clientSecret
      })
    };

    console.error('Settings configured:', {
      base_url: config.baseUrl,
      client_id: config.clientId,
      client_secret: config.clientSecret?.substring(0, 4) + '...'
    });

    this.context = {
      sdk: LookerNodeSDK.init40(settings as any),
      config
    };
  }

  // Helper: clone a query with overrides (queries are immutable in Looker)
  private async cloneQueryWithOverrides(queryId: string, overrides: Record<string, any>) {
    const existing = await this.context.sdk.ok(
      this.context.sdk.query(queryId)
    )
    return this.context.sdk.ok(
      this.context.sdk.create_query({
        model: existing.model!,
        view: existing.view!,
        fields: existing.fields as string[] ?? null,
        pivots: existing.pivots as string[] ?? null,
        fill_fields: existing.fill_fields as string[] ?? null,
        filters: existing.filters ?? null,
        filter_expression: existing.filter_expression ?? null,
        sorts: existing.sorts as string[] ?? null,
        limit: existing.limit ?? null,
        column_limit: existing.column_limit ?? null,
        total: existing.total ?? null,
        row_total: existing.row_total ?? null,
        subtotals: existing.subtotals as string[] ?? null,
        vis_config: existing.vis_config ?? null,
        filter_config: existing.filter_config ?? null,
        dynamic_fields: existing.dynamic_fields ?? null,
        query_timezone: existing.query_timezone ?? null,
        ...overrides,
      })
    )
  }

  // Helper: get query ID from a dashboard element
  private async getElementQueryId(elementId: string): Promise<string> {
    const current = await this.context.sdk.ok(
      this.context.sdk.dashboard_element(elementId)
    )
    const queryId = current.query_id ?? current.query?.id
    if (!queryId) {
      throw new Error('Element has no query — this operation only works on query-based tiles')
    }
    return queryId.toString()
  }

  // Query Methods
  async runQuery(query: LookerQuery) {
    try {
      const result = await this.context.sdk.ok(
        this.context.sdk.create_query({
          model: query.model,
          view: query.view,
          fields: query.fields,
          filters: query.filters,
          limit: query.limit?.toString(),
          sorts: query.sorts
        })
      )

      const queryResult = await this.context.sdk.ok(
        this.context.sdk.run_query({
          query_id: result.id!,
          result_format: 'json'
        })
      )

      return queryResult
    } catch (error) {
      throw new Error(`Failed to run query: ${error}`)
    }
  }

  // Dashboard Methods
  async getDashboard(id: string): Promise<LookerDashboard> {
    try {
      const dashboard = await this.context.sdk.ok(
        this.context.sdk.dashboard(id)
      )

      return {
        id: dashboard.id!,
        title: dashboard.title!,
        description: dashboard.description ?? undefined,
        folder: dashboard.folder ? {
          id: dashboard.folder.id!,
          name: dashboard.folder.name!
        } : undefined,
        tiles: dashboard.dashboard_elements!.map((element: IDashboardElement) => ({
          id: element.id!,
          title: element.title ?? undefined,
          type: element.type! as 'look' | 'text' | 'query',
          lookId: element.look_id ?? undefined,
          queryId: element.query_id ?? undefined,
          query: element.query ? {
            model: element.query.model!,
            view: element.query.view!,
            fields: element.query.fields! as string[],
            filters: element.query.filters ?? undefined,
            sorts: element.query.sorts as string[]
          } : undefined
        }))
      }
    } catch (error) {
      throw new Error(`Failed to get dashboard: ${error}`)
    }
  }

  // Look Methods
  async getLook(id: string): Promise<LookerLook> {
    try {
      const look = await this.context.sdk.ok(
        this.context.sdk.look(id)
      )

      return {
        id: look.id!,
        title: look.title!,
        query: {
          model: look.query!.model!,
          view: look.query!.view!,
          fields: look.query!.fields! as string[],
          filters: look.query!.filters ?? undefined,
          sorts: look.query!.sorts as string[]
        }
      }
    } catch (error) {
      throw new Error(`Failed to get look: ${error}`)
    }
  }

  // User Methods
  async getUser(id: string): Promise<LookerUser> {
    try {
      const user = await this.context.sdk.ok(
        this.context.sdk.user(id)
      )

      return {
        id: user.id!,
        firstName: user.first_name ?? undefined,
        lastName: user.last_name ?? undefined,
        email: user.email!,
        isDisabled: user.is_disabled!,
        roles: user.role_ids!
      }
    } catch (error) {
      throw new Error(`Failed to get user: ${error}`)
    }
  }

  // Folder Methods
  async getFolder(id: string): Promise<LookerFolder> {
    try {
      const folder = await this.context.sdk.ok(
        this.context.sdk.folder(id)
      )

      return {
        id: folder.id!,
        name: folder.name!,
        parentId: folder.parent_id ?? undefined
      }
    } catch (error) {
      throw new Error(`Failed to get folder: ${error}`)
    }
  }

  // Role Methods
  async getRole(id: string): Promise<LookerRole> {
    try {
      const role = await this.context.sdk.ok(
        this.context.sdk.role(id)
      )

      return {
        id: role.id!,
        name: role.name!,
        permissions: (role.permission_set!.permissions! as string[]).filter((p): p is LookerPermission => 
          ['access_data', 'see_lookml_dashboards', 'see_looks', 'see_user_dashboards', 'explore',
           'create_table_calculations', 'create_custom_fields', 'save_content', 'embed_browse_spaces',
           'schedule_look_emails', 'schedule_external_look_emails', 'create_alerts', 'download_with_limit',
           'download_without_limit', 'see_sql', 'clear_cache_refresh', 'see_drill_overlay', 'manage_spaces',
           'manage_homepage', 'manage_models', 'manage_users', 'manage_groups', 'manage_roles',
           'manage_access_filters', 'manage_themes', 'manage_timezones', 'manage_schedules',
           'manage_alerts', 'manage_system_activity', 'manage_support_access', 'develop', 'deploy',
           'use_api'].includes(p)
        ),
        modelSet: role.model_set ? {
          id: role.model_set.id!,
          name: role.model_set.name!,
          models: role.model_set.models!
        } : undefined
      }
    } catch (error) {
      throw new Error(`Failed to get role: ${error}`)
    }
  }

  // Dashboard Filter Methods
  async createDashboardFilter(params: CreateDashboardFilterParams): Promise<LookerDashboardFilter> {
    try {
      const body = {
        dashboard_id: params.dashboard_id,
        name: params.name,
        title: params.title,
        type: params.type,
        default_value: params.default_value ?? null,
        model: params.model ?? null,
        explore: params.explore ?? null,
        dimension: params.dimension ?? null,
        row: null as number | null,
        allow_multiple_values: true,
        required: false
      }
      console.error('Creating dashboard filter with body:', JSON.stringify(body))

      const response = await this.context.sdk.create_dashboard_filter(body)
      if (!response.ok) {
        console.error('API error response:', JSON.stringify(response))
        throw new Error(`Looker API error: ${JSON.stringify((response as any).value ?? response)}`)
      }
      const filter = response.value

      return {
        id: filter.id!,
        dashboard_id: filter.dashboard_id!,
        name: filter.name!,
        title: filter.title!,
        type: filter.type!,
        default_value: filter.default_value ?? undefined,
        model: filter.model ?? undefined,
        explore: filter.explore ?? undefined,
        dimension: filter.dimension ?? undefined
      }
    } catch (error: any) {
      const detail = error?.message || JSON.stringify(error)
      throw new Error(`Failed to create dashboard filter: ${detail}`)
    }
  }

  async getDashboardElements(dashboardId: string) {
    try {
      const elements = await this.context.sdk.ok(
        this.context.sdk.dashboard_dashboard_elements(dashboardId)
      )

      return elements.map(el => ({
        id: el.id!,
        title: el.title ?? el.title_text ?? null,
        type: el.type ?? null,
        query_id: el.query_id ?? null,
        body_text: el.body_text ?? null,
        vis_config: el.result_maker?.vis_config ?? el.query?.vis_config ?? null,
        result_maker: el.result_maker ? {
          filterables: (el.result_maker.filterables ?? []).map(f => ({
            model: f.model ?? null,
            view: f.view ?? null,
            name: f.name ?? null,
            listen: (f.listen ?? []).map(l => ({
              dashboard_filter_name: l.dashboard_filter_name ?? null,
              field: l.field ?? null
            }))
          }))
        } : null
      }))
    } catch (error: any) {
      const detail = error?.message || JSON.stringify(error)
      throw new Error(`Failed to get dashboard elements: ${detail}`)
    }
  }

  async wireDashboardFilterToTile(
    elementId: string,
    dashboardFilterName: string,
    field: string
  ) {
    try {
      // First get the current element to preserve existing listeners
      const current = await this.context.sdk.ok(
        this.context.sdk.dashboard_element(elementId)
      )

      const filterables = current.result_maker?.filterables ?? []
      const newListenEntry = { dashboard_filter_name: dashboardFilterName, field }

      // Find the filterable that matches the field's view, or use the first one
      const fieldView = field.split('.')[0]
      let matched = false
      const updatedFilterables = filterables.map(f => {
        if (f.view === fieldView || f.name === fieldView) {
          matched = true
          const existingListens = f.listen ?? []
          // Don't duplicate if already wired
          const alreadyWired = existingListens.some(
            l => l.dashboard_filter_name === dashboardFilterName && l.field === field
          )
          return {
            ...f,
            listen: alreadyWired ? existingListens : [...existingListens, newListenEntry]
          }
        }
        return f
      })

      // If no filterable matched the view, add to the first filterable
      if (!matched && updatedFilterables.length > 0) {
        const first = updatedFilterables[0]
        const existingListens = first.listen ?? []
        updatedFilterables[0] = {
          ...first,
          listen: [...existingListens, newListenEntry]
        }
      }

      const response = await this.context.sdk.ok(
        this.context.sdk.update_dashboard_element(elementId, {
          result_maker: {
            filterables: updatedFilterables
          }
        })
      )

      return {
        id: response.id!,
        title: response.title ?? response.title_text ?? null,
        filterables: (response.result_maker?.filterables ?? []).map(f => ({
          model: f.model ?? null,
          view: f.view ?? null,
          name: f.name ?? null,
          listen: (f.listen ?? []).map(l => ({
            dashboard_filter_name: l.dashboard_filter_name ?? null,
            field: l.field ?? null
          }))
        }))
      }
    } catch (error: any) {
      const detail = error?.message || JSON.stringify(error)
      throw new Error(`Failed to wire filter to tile: ${detail}`)
    }
  }

  async updateDashboard(dashboardId: string, updates: {
    title?: string
    description?: string
    folder_id?: string
  }) {
    try {
      const body: Record<string, string> = {}
      if (updates.title !== undefined) body.title = updates.title
      if (updates.description !== undefined) body.description = updates.description
      if (updates.folder_id !== undefined) body.folder_id = updates.folder_id

      const response = await this.context.sdk.ok(
        this.context.sdk.update_dashboard(dashboardId, body)
      )

      return {
        id: response.id!,
        title: response.title!,
        description: response.description ?? null,
        folder: response.folder ? {
          id: response.folder.id!,
          name: response.folder.name!
        } : null
      }
    } catch (error: any) {
      const detail = error?.message || JSON.stringify(error)
      throw new Error(`Failed to update dashboard: ${detail}`)
    }
  }

  async searchFolders(name: string) {
    try {
      const folders = await this.context.sdk.ok(
        this.context.sdk.search_folders({ name })
      )

      return folders.map(f => ({
        id: f.id!,
        name: f.name!,
        parent_id: f.parent_id ?? null
      }))
    } catch (error: any) {
      const detail = error?.message || JSON.stringify(error)
      throw new Error(`Failed to search folders: ${detail}`)
    }
  }

  async createMarkdownTile(dashboardId: string, params: {
    title?: string
    body_text: string
    subtitle_text?: string
    title_hidden?: boolean
  }) {
    try {
      const response = await this.context.sdk.ok(
        this.context.sdk.create_dashboard_element({
          body: {
            dashboard_id: dashboardId,
            type: 'text',
            title: params.title ?? null,
            body_text: params.body_text,
            subtitle_text: params.subtitle_text ?? null,
            title_hidden: params.title_hidden ?? false,
          }
        })
      )

      return {
        id: response.id!,
        dashboard_id: response.dashboard_id!,
        title: response.title ?? null,
        body_text: response.body_text ?? null,
        type: response.type ?? null
      }
    } catch (error: any) {
      const detail = error?.message || JSON.stringify(error)
      throw new Error(`Failed to create markdown tile: ${detail}`)
    }
  }

  async updateDashboardElement(elementId: string, params: {
    title?: string
    title_hidden?: boolean
    subtitle_text?: string
    body_text?: string
    note_text?: string
    note_display?: string
    note_state?: string
    query_id?: string
    refresh_interval?: string
    vis_config?: Record<string, any>
  }) {
    try {
      const body: Record<string, any> = {}
      if (params.title !== undefined) body.title = params.title
      if (params.title_hidden !== undefined) body.title_hidden = params.title_hidden
      if (params.subtitle_text !== undefined) body.subtitle_text = params.subtitle_text
      if (params.body_text !== undefined) body.body_text = params.body_text
      if (params.note_text !== undefined) body.note_text = params.note_text
      if (params.note_display !== undefined) body.note_display = params.note_display
      if (params.note_state !== undefined) body.note_state = params.note_state
      if (params.query_id !== undefined) body.query_id = params.query_id
      if (params.refresh_interval !== undefined) body.refresh_interval = params.refresh_interval
      if (params.vis_config !== undefined) {
        const queryId = await this.getElementQueryId(elementId)
        const existingQuery = await this.context.sdk.ok(
          this.context.sdk.query(queryId)
        )
        const existingVisConfig = existingQuery.vis_config ?? {}
        const mergedVisConfig = { ...existingVisConfig, ...params.vis_config }

        // Sync query-level total fields when vis_config toggles them
        const overrides: Record<string, any> = { vis_config: mergedVisConfig }
        if (params.vis_config.show_col_totals === true) overrides.total = true
        if (params.vis_config.show_col_totals === false) overrides.total = false
        if (params.vis_config.show_row_totals === true) overrides.row_total = existingQuery.row_total || 'right'
        if (params.vis_config.show_row_totals === false) overrides.row_total = null

        const newQuery = await this.cloneQueryWithOverrides(queryId, overrides)
        body.query_id = newQuery.id!.toString()
      }

      const response = await this.context.sdk.ok(
        this.context.sdk.update_dashboard_element(elementId, body)
      )

      return {
        id: response.id!,
        dashboard_id: response.dashboard_id!,
        title: response.title ?? null,
        title_hidden: response.title_hidden ?? false,
        subtitle_text: response.subtitle_text ?? null,
        body_text: response.body_text ?? null,
        note_text: response.note_text ?? null,
        type: response.type ?? null,
        query_id: response.query_id ?? null,
        vis_config: response.result_maker?.vis_config ?? null
      }
    } catch (error: any) {
      const detail = error?.message || JSON.stringify(error)
      throw new Error(`Failed to update dashboard element: ${detail}`)
    }
  }

  async addPivotToTile(elementId: string, pivotFields: string[]) {
    try {
      const queryId = await this.getElementQueryId(elementId)
      const existingQuery = await this.context.sdk.ok(
        this.context.sdk.query(queryId)
      )
      const existingPivots = (existingQuery.pivots ?? []) as string[]
      const mergedPivots = [...new Set([...existingPivots, ...pivotFields])]

      const newQuery = await this.cloneQueryWithOverrides(queryId, { pivots: mergedPivots })

      const updated = await this.context.sdk.ok(
        this.context.sdk.update_dashboard_element(elementId, {
          query_id: newQuery.id!.toString()
        })
      )

      return {
        id: updated.id!,
        title: updated.title ?? null,
        query_id: updated.query_id ?? null,
        pivots: mergedPivots
      }
    } catch (error: any) {
      const detail = error?.message || JSON.stringify(error)
      throw new Error(`Failed to add pivot to tile: ${detail}`)
    }
  }

  async moveDashboardTile(dashboardId: string, elementId: string, layout: {
    row?: number
    column?: number
    width?: number
    height?: number
  }) {
    try {
      const layouts = await this.context.sdk.ok(
        this.context.sdk.dashboard_dashboard_layouts(dashboardId)
      )

      if (layouts.length === 0) {
        throw new Error('Dashboard has no layouts')
      }

      const dashboardLayout = layouts[0]
      const components = await this.context.sdk.ok(
        this.context.sdk.dashboard_layout_dashboard_layout_components(dashboardLayout.id!)
      )

      const component = components.find(c => c.dashboard_element_id === elementId)
      if (!component) {
        throw new Error(`No layout component found for element ${elementId}`)
      }

      const body: Record<string, any> = {}
      if (layout.row !== undefined) body.row = layout.row
      if (layout.column !== undefined) body.column = layout.column
      if (layout.width !== undefined) body.width = layout.width
      if (layout.height !== undefined) body.height = layout.height

      const updated = await this.context.sdk.ok(
        this.context.sdk.update_dashboard_layout_component(component.id!, body)
      )

      return {
        id: updated.id!,
        dashboard_element_id: updated.dashboard_element_id!,
        row: updated.row ?? null,
        column: updated.column ?? null,
        width: updated.width ?? null,
        height: updated.height ?? null
      }
    } catch (error: any) {
      const detail = error?.message || JSON.stringify(error)
      throw new Error(`Failed to move/resize dashboard tile: ${detail}`)
    }
  }

  // Helper: read existing dynamic_fields, append a new entry, clone query, update tile
  private async addDynamicField(elementId: string, newField: Record<string, any>) {
    const queryId = await this.getElementQueryId(elementId)
    const existingQuery = await this.context.sdk.ok(
      this.context.sdk.query(queryId)
    )
    const existingFields: any[] = existingQuery.dynamic_fields
      ? JSON.parse(existingQuery.dynamic_fields)
      : []
    const updatedFields = [...existingFields, newField]

    const newQuery = await this.cloneQueryWithOverrides(queryId, {
      dynamic_fields: JSON.stringify(updatedFields),
    })

    const updated = await this.context.sdk.ok(
      this.context.sdk.update_dashboard_element(elementId, {
        query_id: newQuery.id!.toString()
      })
    )

    return { updated, dynamicFields: updatedFields }
  }

  async addTableCalculation(elementId: string, params: {
    label: string
    expression: string
    value_format?: string
    value_format_name?: string
  }) {
    try {
      const calcId = params.label.toLowerCase().replace(/[^a-z0-9]+/g, '_')
      const { updated, dynamicFields } = await this.addDynamicField(elementId, {
        table_calculation: calcId,
        label: params.label,
        expression: params.expression,
        value_format: params.value_format ?? null,
        value_format_name: params.value_format_name ?? null,
        _kind_hint: 'measure',
        _type_hint: 'number',
      })

      return {
        id: updated.id!,
        title: updated.title ?? null,
        query_id: updated.query_id ?? null,
        dynamic_fields: dynamicFields,
      }
    } catch (error: any) {
      const detail = error?.message || JSON.stringify(error)
      throw new Error(`Failed to add table calculation: ${detail}`)
    }
  }

  async addCustomDimension(elementId: string, params: {
    label: string
    expression: string
    value_format?: string
    value_format_name?: string
  }) {
    try {
      const dimId = params.label.toLowerCase().replace(/[^a-z0-9]+/g, '_')
      const { updated, dynamicFields } = await this.addDynamicField(elementId, {
        dimension: dimId,
        label: params.label,
        expression: params.expression,
        value_format: params.value_format ?? null,
        value_format_name: params.value_format_name ?? null,
        _kind_hint: 'dimension',
        _type_hint: 'string',
      })

      return {
        id: updated.id!,
        title: updated.title ?? null,
        query_id: updated.query_id ?? null,
        dynamic_fields: dynamicFields,
      }
    } catch (error: any) {
      const detail = error?.message || JSON.stringify(error)
      throw new Error(`Failed to add custom dimension: ${detail}`)
    }
  }

  async addCustomMeasure(elementId: string, params: {
    label: string
    expression: string
    based_on: string
    type: string
    value_format?: string
    value_format_name?: string
  }) {
    try {
      const measureId = params.label.toLowerCase().replace(/[^a-z0-9]+/g, '_')
      const { updated, dynamicFields } = await this.addDynamicField(elementId, {
        measure: measureId,
        label: params.label,
        expression: params.expression,
        based_on: params.based_on,
        type: params.type,
        value_format: params.value_format ?? null,
        value_format_name: params.value_format_name ?? null,
        _kind_hint: 'measure',
        _type_hint: 'number',
      })

      return {
        id: updated.id!,
        title: updated.title ?? null,
        query_id: updated.query_id ?? null,
        dynamic_fields: dynamicFields,
      }
    } catch (error: any) {
      const detail = error?.message || JSON.stringify(error)
      throw new Error(`Failed to add custom measure: ${detail}`)
    }
  }

  async createQueryTile(dashboardId: string, params: {
    title?: string
    model: string
    explore: string
    fields: string[]
    filters?: Record<string, string>
    sorts?: string[]
    pivots?: string[]
    limit?: string
    total?: boolean
    row_total?: string
    dynamic_fields?: Array<Record<string, any>>
    vis_config?: Record<string, any>
    query_timezone?: string
  }) {
    try {
      const query = await this.context.sdk.ok(
        this.context.sdk.create_query({
          model: params.model,
          view: params.explore,
          fields: params.fields,
          filters: params.filters ?? null,
          sorts: params.sorts ?? null,
          pivots: params.pivots ?? null,
          limit: params.limit ?? null,
          total: params.total ?? null,
          row_total: params.row_total ?? null,
          dynamic_fields: params.dynamic_fields
            ? JSON.stringify(params.dynamic_fields)
            : null,
          vis_config: params.vis_config ?? null,
          query_timezone: params.query_timezone ?? null,
        })
      )

      const element = await this.context.sdk.ok(
        this.context.sdk.create_dashboard_element({
          body: {
            dashboard_id: dashboardId,
            query_id: query.id!.toString(),
            title: params.title ?? null,
          }
        })
      )

      return {
        id: element.id!,
        dashboard_id: element.dashboard_id!,
        title: element.title ?? null,
        type: element.type ?? null,
        query_id: element.query_id ?? null,
      }
    } catch (error: any) {
      const detail = error?.message || JSON.stringify(error)
      throw new Error(`Failed to create query tile: ${detail}`)
    }
  }

  async getDashboardLayout(dashboardId: string) {
    try {
      const layouts = await this.context.sdk.ok(
        this.context.sdk.dashboard_dashboard_layouts(dashboardId)
      )
      if (layouts.length === 0) {
        throw new Error('Dashboard has no layouts')
      }
      const layout = layouts[0]
      const components = await this.context.sdk.ok(
        this.context.sdk.dashboard_layout_dashboard_layout_components(layout.id!)
      )

      return {
        layout_id: layout.id!,
        dashboard_id: layout.dashboard_id!,
        type: layout.type ?? null,
        components: components.map(c => ({
          id: c.id!,
          dashboard_element_id: c.dashboard_element_id!,
          row: c.row ?? 0,
          column: c.column ?? 0,
          width: c.width ?? 0,
          height: c.height ?? 0,
        }))
      }
    } catch (error: any) {
      const detail = error?.message || JSON.stringify(error)
      throw new Error(`Failed to get dashboard layout: ${detail}`)
    }
  }

  async batchMoveDashboardTiles(dashboardId: string, moves: Array<{
    element_id: string
    row?: number
    column?: number
    width?: number
    height?: number
  }>) {
    try {
      const layouts = await this.context.sdk.ok(
        this.context.sdk.dashboard_dashboard_layouts(dashboardId)
      )
      if (layouts.length === 0) {
        throw new Error('Dashboard has no layouts')
      }
      const components = await this.context.sdk.ok(
        this.context.sdk.dashboard_layout_dashboard_layout_components(layouts[0].id!)
      )

      const componentMap = new Map(
        components.map(c => [c.dashboard_element_id!, c])
      )

      const results = await Promise.all(
        moves.map(async (move) => {
          const component = componentMap.get(move.element_id)
          if (!component) {
            return { element_id: move.element_id, error: 'No layout component found' }
          }
          const body: Record<string, any> = {}
          if (move.row !== undefined) body.row = move.row
          if (move.column !== undefined) body.column = move.column
          if (move.width !== undefined) body.width = move.width
          if (move.height !== undefined) body.height = move.height

          const updated = await this.context.sdk.ok(
            this.context.sdk.update_dashboard_layout_component(component.id!, body)
          )
          return {
            element_id: move.element_id,
            row: updated.row ?? null,
            column: updated.column ?? null,
            width: updated.width ?? null,
            height: updated.height ?? null,
          }
        })
      )

      return results
    } catch (error: any) {
      const detail = error?.message || JSON.stringify(error)
      throw new Error(`Failed to batch move dashboard tiles: ${detail}`)
    }
  }

  async deleteDashboardElement(elementId: string) {
    try {
      await this.context.sdk.ok(
        this.context.sdk.delete_dashboard_element(elementId)
      )
      return { deleted: true, element_id: elementId }
    } catch (error: any) {
      const detail = error?.message || JSON.stringify(error)
      throw new Error(`Failed to delete dashboard element: ${detail}`)
    }
  }

  // ── Metadata exploration (ported from looker-toolbox) ───────────────

  async getModels() {
    try {
      const models = await this.context.sdk.ok(
        this.context.sdk.all_lookml_models({})
      )
      return models.map(m => ({
        name: m.name!,
        label: m.label ?? null,
        project_name: m.project_name ?? null,
        explores: (m.explores ?? []).map(e => ({
          name: e.name!,
          label: e.label ?? null,
          description: e.description ?? null,
        })),
      }))
    } catch (error: any) {
      throw new Error(`Failed to get models: ${error?.message || error}`)
    }
  }

  async getExplores(modelName: string) {
    try {
      const model = await this.context.sdk.ok(
        this.context.sdk.lookml_model(modelName)
      )
      return (model.explores ?? []).map(e => ({
        name: e.name!,
        label: e.label ?? null,
        description: e.description ?? null,
        group_label: e.group_label ?? null,
      }))
    } catch (error: any) {
      throw new Error(`Failed to get explores: ${error?.message || error}`)
    }
  }

  async getDimensions(modelName: string, exploreName: string) {
    try {
      const explore = await this.context.sdk.ok(
        this.context.sdk.lookml_model_explore({ lookml_model_name: modelName, explore_name: exploreName })
      )
      return (explore.fields?.dimensions ?? []).map(d => ({
        name: d.name!,
        label: d.label ?? null,
        type: d.type ?? null,
        description: d.description ?? null,
        sql: d.sql ?? null,
        view: d.view ?? null,
      }))
    } catch (error: any) {
      throw new Error(`Failed to get dimensions: ${error?.message || error}`)
    }
  }

  async getMeasures(modelName: string, exploreName: string) {
    try {
      const explore = await this.context.sdk.ok(
        this.context.sdk.lookml_model_explore({ lookml_model_name: modelName, explore_name: exploreName })
      )
      return (explore.fields?.measures ?? []).map(m => ({
        name: m.name!,
        label: m.label ?? null,
        type: m.type ?? null,
        description: m.description ?? null,
        sql: m.sql ?? null,
        view: m.view ?? null,
      }))
    } catch (error: any) {
      throw new Error(`Failed to get measures: ${error?.message || error}`)
    }
  }

  async getFilters(modelName: string, exploreName: string) {
    try {
      const explore = await this.context.sdk.ok(
        this.context.sdk.lookml_model_explore({ lookml_model_name: modelName, explore_name: exploreName })
      )
      return (explore.fields?.filters ?? []).map(f => ({
        name: f.name!,
        label: f.label ?? null,
        type: f.type ?? null,
        description: f.description ?? null,
        view: f.view ?? null,
      }))
    } catch (error: any) {
      throw new Error(`Failed to get filters: ${error?.message || error}`)
    }
  }

  async getParameters(modelName: string, exploreName: string) {
    try {
      const explore = await this.context.sdk.ok(
        this.context.sdk.lookml_model_explore({ lookml_model_name: modelName, explore_name: exploreName })
      )
      return (explore.fields?.parameters ?? []).map(p => ({
        name: p.name!,
        label: p.label ?? null,
        type: p.type ?? null,
        description: p.description ?? null,
        view: p.view ?? null,
      }))
    } catch (error: any) {
      throw new Error(`Failed to get parameters: ${error?.message || error}`)
    }
  }

  // ── Content discovery (ported from looker-toolbox) ────────────────

  async searchDashboards(params: { title?: string; folder_id?: string; limit?: number }) {
    try {
      const dashboards = await this.context.sdk.ok(
        this.context.sdk.search_dashboards({
          title: params.title ?? undefined,
          folder_id: params.folder_id ?? undefined,
          limit: params.limit ?? 50,
        })
      )
      return dashboards.map(d => ({
        id: d.id!,
        title: d.title ?? null,
        description: d.description ?? null,
        folder: d.folder ? { id: d.folder.id!, name: d.folder.name! } : null,
        view_count: d.view_count ?? null,
      }))
    } catch (error: any) {
      throw new Error(`Failed to search dashboards: ${error?.message || error}`)
    }
  }

  async searchLooks(params: { title?: string; folder_id?: string; limit?: number }) {
    try {
      const looks = await this.context.sdk.ok(
        this.context.sdk.search_looks({
          title: params.title ?? undefined,
          folder_id: params.folder_id ?? undefined,
          limit: params.limit ?? 50,
        })
      )
      return looks.map(l => ({
        id: l.id!,
        title: l.title ?? null,
        description: l.description ?? null,
        folder: l.folder ? { id: l.folder.id!, name: l.folder.name! } : null,
        view_count: l.view_count ?? null,
      }))
    } catch (error: any) {
      throw new Error(`Failed to search looks: ${error?.message || error}`)
    }
  }

  // ── Query execution (ported from looker-toolbox) ──────────────────

  async runInlineQuery(params: {
    model: string
    view: string
    fields: string[]
    filters?: Record<string, string>
    sorts?: string[]
    limit?: string
    pivots?: string[]
    total?: boolean
    row_total?: string
  }) {
    try {
      const query = await this.context.sdk.ok(
        this.context.sdk.create_query({
          model: params.model,
          view: params.view,
          fields: params.fields,
          filters: params.filters ?? null,
          sorts: params.sorts ?? null,
          limit: params.limit ?? null,
          pivots: params.pivots ?? null,
          total: params.total ?? null,
          row_total: params.row_total ?? null,
        })
      )
      const result = await this.context.sdk.ok(
        this.context.sdk.run_query({
          query_id: query.id!,
          result_format: 'json',
        })
      )
      return result
    } catch (error: any) {
      throw new Error(`Failed to run query: ${error?.message || error}`)
    }
  }

  async getQuerySql(params: {
    model: string
    view: string
    fields: string[]
    filters?: Record<string, string>
    sorts?: string[]
    limit?: string
  }) {
    try {
      const query = await this.context.sdk.ok(
        this.context.sdk.create_query({
          model: params.model,
          view: params.view,
          fields: params.fields,
          filters: params.filters ?? null,
          sorts: params.sorts ?? null,
          limit: params.limit ?? null,
        })
      )
      const sql = await this.context.sdk.ok(
        this.context.sdk.run_query({
          query_id: query.id!,
          result_format: 'sql',
        })
      )
      return sql
    } catch (error: any) {
      throw new Error(`Failed to get query SQL: ${error?.message || error}`)
    }
  }

  async getQueryUrl(params: {
    model: string
    view: string
    fields: string[]
    filters?: Record<string, string>
    sorts?: string[]
    limit?: string
  }) {
    try {
      const query = await this.context.sdk.ok(
        this.context.sdk.create_query({
          model: params.model,
          view: params.view,
          fields: params.fields,
          filters: params.filters ?? null,
          sorts: params.sorts ?? null,
          limit: params.limit ?? null,
        })
      )
      return {
        query_id: query.id!,
        share_url: query.share_url ?? null,
        url: `${this.context.config.baseUrl}/explore/${params.model}/${params.view}?qid=${query.client_id}`,
      }
    } catch (error: any) {
      throw new Error(`Failed to get query URL: ${error?.message || error}`)
    }
  }

  async runLook(lookId: string, resultFormat: string = 'json') {
    try {
      const result = await this.context.sdk.ok(
        this.context.sdk.run_look({
          look_id: lookId,
          result_format: resultFormat,
        })
      )
      return result
    } catch (error: any) {
      throw new Error(`Failed to run look: ${error?.message || error}`)
    }
  }

  // ── Content creation (ported from looker-toolbox) ─────────────────

  async createDashboard(params: { title: string; folder_id: string; description?: string }) {
    try {
      const dashboard = await this.context.sdk.ok(
        this.context.sdk.create_dashboard({
          title: params.title,
          folder_id: params.folder_id,
          description: params.description ?? null,
        })
      )
      return {
        id: dashboard.id!,
        title: dashboard.title!,
        description: dashboard.description ?? null,
        folder: dashboard.folder ? { id: dashboard.folder.id!, name: dashboard.folder.name! } : null,
      }
    } catch (error: any) {
      throw new Error(`Failed to create dashboard: ${error?.message || error}`)
    }
  }

  async createLook(params: {
    title: string
    folder_id: string
    description?: string
    model: string
    view: string
    fields: string[]
    filters?: Record<string, string>
    sorts?: string[]
    limit?: string
  }) {
    try {
      const query = await this.context.sdk.ok(
        this.context.sdk.create_query({
          model: params.model,
          view: params.view,
          fields: params.fields,
          filters: params.filters ?? null,
          sorts: params.sorts ?? null,
          limit: params.limit ?? null,
        })
      )
      const look = await this.context.sdk.ok(
        this.context.sdk.create_look({
          title: params.title,
          folder_id: params.folder_id,
          description: params.description ?? null,
          query_id: query.id!,
        })
      )
      return {
        id: look.id!,
        title: look.title!,
        description: look.description ?? null,
        folder: look.folder ? { id: look.folder.id!, name: look.folder.name! } : null,
        query_id: look.query_id ?? null,
      }
    } catch (error: any) {
      throw new Error(`Failed to create look: ${error?.message || error}`)
    }
  }

  async addDashboardElement(dashboardId: string, params: {
    title?: string
    look_id?: string
    query_id?: string
    model?: string
    view?: string
    fields?: string[]
    filters?: Record<string, string>
    sorts?: string[]
    limit?: string
  }) {
    try {
      let queryId = params.query_id
      if (!queryId && params.model && params.view && params.fields) {
        const query = await this.context.sdk.ok(
          this.context.sdk.create_query({
            model: params.model,
            view: params.view,
            fields: params.fields,
            filters: params.filters ?? null,
            sorts: params.sorts ?? null,
            limit: params.limit ?? null,
          })
        )
        queryId = query.id!.toString()
      }

      const body: Record<string, any> = {
        dashboard_id: dashboardId,
        title: params.title ?? null,
      }
      if (params.look_id) body.look_id = params.look_id
      if (queryId) body.query_id = queryId

      const element = await this.context.sdk.ok(
        this.context.sdk.create_dashboard_element({ body })
      )
      return {
        id: element.id!,
        dashboard_id: element.dashboard_id!,
        title: element.title ?? null,
        type: element.type ?? null,
        query_id: element.query_id ?? null,
        look_id: element.look_id ?? null,
      }
    } catch (error: any) {
      throw new Error(`Failed to add dashboard element: ${error?.message || error}`)
    }
  }

  // Cleanup
  async destroy() {
    await this.context.sdk.authSession.logout()
  }
} 