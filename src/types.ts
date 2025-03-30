import { ILooker40SDK } from '@looker/sdk'

export interface LookerMCPConfig {
  baseUrl: string
  clientId: string
  clientSecret: string
}

export interface LookerMCPContext {
  sdk: ILooker40SDK
  config: LookerMCPConfig
}

export interface LookerQuery {
  model: string
  view: string
  fields: string[]
  filters?: Record<string, string>
  limit?: number
  sorts?: string[]
}

export interface LookerDashboard {
  id: string
  title: string
  description?: string
  folder?: {
    id: string
    name: string
  }
  tiles: LookerDashboardTile[]
}

export interface LookerDashboardTile {
  id: string
  title?: string
  type: 'look' | 'text' | 'query'
  lookId?: string
  queryId?: string
  query?: LookerQuery
}

export interface LookerLook {
  id: string
  title: string
  query: LookerQuery
}

export interface LookerUser {
  id: string
  firstName?: string
  lastName?: string
  email: string
  isDisabled: boolean
  roles: string[]
}

export interface LookerFolder {
  id: string
  name: string
  parentId?: string
  children?: LookerFolder[]
}

export type LookerPermission = 
  | 'access_data'
  | 'see_lookml_dashboards'
  | 'see_looks'
  | 'see_user_dashboards'
  | 'explore'
  | 'create_table_calculations'
  | 'create_custom_fields'
  | 'save_content'
  | 'embed_browse_spaces'
  | 'schedule_look_emails'
  | 'schedule_external_look_emails'
  | 'create_alerts'
  | 'download_with_limit'
  | 'download_without_limit'
  | 'see_sql'
  | 'clear_cache_refresh'
  | 'see_drill_overlay'
  | 'manage_spaces'
  | 'manage_homepage'
  | 'manage_models'
  | 'manage_users'
  | 'manage_groups'
  | 'manage_roles'
  | 'manage_access_filters'
  | 'manage_themes'
  | 'manage_timezones'
  | 'manage_schedules'
  | 'manage_alerts'
  | 'manage_system_activity'
  | 'manage_support_access'
  | 'develop'
  | 'deploy'
  | 'use_api'

export interface LookerRole {
  id: string
  name: string
  permissions: LookerPermission[]
  modelSet?: {
    id: string
    name: string
    models: string[]
  }
  users?: LookerUser[]
  groups?: {
    id: string
    name: string
  }[]
} 