import { Client, Collection, Events, GatewayIntentBits } from 'discord.js'
import { readdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import type { Command } from './types/global'

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
})

client.commands = new Collection<string, Command>()

// Load commands dynamically
;(async () => {
  const commandsPath = path.join(__dirname, 'commands')
  if (!existsSync(commandsPath)) {
    console.error('❌ Commands folder not found at:', commandsPath)
    process.exit(1)
  }

  for (const dirent of await readdir(commandsPath, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue
    const subdir = path.join(commandsPath, dirent.name)
    for (const file of await readdir(subdir)) {
      if (!file.endsWith('.ts') && !file.endsWith('.js')) continue

      const filePath = path.join(subdir, file)
      try {
        const commandModule = await import(filePath)
        const { data, execute } = commandModule

        if (!data || !data.name || typeof execute !== 'function') {
          console.warn(`⚠️ Skipping invalid command file: ${file}`)
          continue
        }

        client.commands.set(data.name, { data, execute })
      } catch (err) {
        console.error(`❌ Failed to load command ${file}:`, err)
      }
    }
  }

  console.log(`✅ Loaded ${client.commands.size} commands`)
})()

// Load events dynamically
;(async () => {
  const eventsPath = path.join(__dirname, 'events')
  if (!existsSync(eventsPath)) {
    console.error('❌ Events folder not found at:', eventsPath)
    process.exit(1)
  }

  let count = 0

  for (const file of await readdir(eventsPath)) {
    if (!file.endsWith('.ts') && !file.endsWith('.js')) continue

    const filePath = path.join(eventsPath, file)
    try {
      const { name, once, execute } = await import(filePath)
      if (typeof name !== 'string' || typeof execute !== 'function') {
        console.warn(`⚠️ Skipping invalid event file: ${file}`)
        continue
      }

      once ? client.once(name, execute) : client.on(name, execute)
      count++
    } catch (err) {
      console.error(`❌ Failed to load event ${file}:`, err)
    }
  }

  console.log(`✅ Loaded ${count} events`)
})()

client.once(Events.ClientReady, () => {
  console.log(`🟢 Logged in as ${client.user?.tag}`)
})

export default client
