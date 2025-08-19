import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
import { readdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import type { Command } from "./types/global";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection<string, Command>();

// Use only the current runtime extension (".ts" in dev, ".js" after build)
const RUNTIME_EXT = path.extname(__filename) || ".js";
const isLoadable = (f: string) => f.endsWith(RUNTIME_EXT) && !f.endsWith(".d.ts");

// Load commands dynamically
(async () => {
  const commandsPath = path.join(__dirname, "commands");
  if (!existsSync(commandsPath)) {
    console.error("❌ Commands folder not found at:", commandsPath);
    process.exit(1);
  }

  let loaded = 0;

  for (const dirent of await readdir(commandsPath, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const subdir = path.join(commandsPath, dirent.name);

    for (const file of await readdir(subdir)) {
      if (!isLoadable(file)) continue;

      const filePath = path.join(subdir, file);
      try {
        const mod = await import(filePath);
        const { data, execute } = mod;

        if (!data || typeof data.name !== "string" || typeof execute !== "function") {
          console.warn(`⚠️ Skipping invalid command file: ${file}`);
          continue;
        }

        client.commands.set(data.name, { data, execute });
        loaded++;
      } catch (err) {
        console.error(`❌ Failed to load command ${file}:`, err);
      }
    }
  }

  console.log(`✅ Loaded ${loaded} commands (${RUNTIME_EXT})`);
})();

// Load events dynamically
(async () => {
  const eventsPath = path.join(__dirname, "events");
  if (!existsSync(eventsPath)) {
    console.error("❌ Events folder not found at:", eventsPath);
    process.exit(1);
  }

  let count = 0;

  for (const file of await readdir(eventsPath)) {
    if (!isLoadable(file)) continue;

    const filePath = path.join(eventsPath, file);
    try {
      const mod = await import(filePath);
      const { name, once, execute } = mod;

      if (typeof name !== "string" || typeof execute !== "function") {
        console.warn(`⚠️ Skipping invalid event file: ${file}`);
        continue;
      }

      once ? client.once(name, execute) : client.on(name, execute);
      count++;
    } catch (err) {
      console.error(`❌ Failed to load event ${file}:`, err);
    }
  }

  console.log(`✅ Loaded ${count} events (${RUNTIME_EXT})`);
})();

client.once(Events.ClientReady, () => {
  console.log(`🟢 Logged in as ${client.user?.tag}`);
});

export default client;
