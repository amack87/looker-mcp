import { LookerMCP } from '../src'
import dotenv from 'dotenv'
import { config } from 'dotenv'
import { env } from 'process'

// Load environment variables
config()

async function main() {
  // Initialize the client
  const client = new LookerMCP({
    baseUrl: env.LOOKER_BASE_URL || '',
    clientId: env.LOOKER_CLIENT_ID || '',
    clientSecret: env.LOOKER_CLIENT_SECRET || ''
  })

  try {
    // Run a simple query
    const queryResult = await client.runQuery({
      model: 'thelook',
      view: 'users',
      fields: ['users.id', 'users.name', 'users.email'],
      filters: {
        'users.created_date': 'last 7 days'
      },
      limit: 10
    })
    console.log('Query Result:', queryResult)

    // Get a dashboard
    const dashboard = await client.getDashboard('1')
    console.log('Dashboard:', dashboard)

    // Get a look
    const look = await client.getLook('1')
    console.log('Look:', look)

    // Get a user
    const user = await client.getUser('1')
    console.log('User:', user)

    // Get a folder
    const folder = await client.getFolder('1')
    console.log('Folder:', folder)

    // Get a role
    const role = await client.getRole('1')
    console.log('Role:', role)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    // Clean up
    await client.destroy()
  }
}

main() 