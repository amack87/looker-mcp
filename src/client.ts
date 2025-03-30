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
  LookerPermission
} from './types'

export class LookerMCP {
  private context: LookerMCPContext

  constructor(config: LookerMCPConfig) {
    console.error('Initializing LookerMCP with config:', config);
    
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

  // Cleanup
  async destroy() {
    await this.context.sdk.authSession.logout()
  }
} 