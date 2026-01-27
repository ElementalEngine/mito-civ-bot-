import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Command } from "./types/global.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Runtime is always compiled JavaScript under ./dist.
const RUNTIME_EXT = ".js";
const isLoadable = (f: string) =>
  f.endsWith(RUNTIME_EXT) && !f.endsWith(".d.ts") && !f.endsWith(".map");

async function loadCommands(): Promise<void> {
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
        const mod = (await import(pathToFileURL(filePath).href)) as unknown;
        if (typeof mod !== "object" || mod === null) {
          console.warn(`⚠️ Skipping invalid command module: ${file}`);
          continue;
        }

        const maybe = mod as {
          data?: { name?: unknown };
          execute?: unknown;
        };

        if (
          !maybe.data ||
          typeof maybe.data.name !== "string" ||
          typeof maybe.execute !== "function"
        ) {
          console.warn(`⚠️ Skipping invalid command file: ${file}`);
          continue;
        }

        client.commands.set(maybe.data.name, {
          data: maybe.data as Command["data"],
          execute: maybe.execute as Command["execute"],
        });

        loaded++;
      } catch (err) {
        console.error(`❌ Failed to load command ${file}:`, err);
      }
    }
  }

  console.log(`✅ Loaded ${loaded} commands (${RUNTIME_EXT})`);
}

async function loadEvents(): Promise<void> {
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
      const mod = (await import(pathToFileURL(filePath).href)) as unknown;
      if (typeof mod !== "object" || mod === null) {
        console.warn(`⚠️ Skipping invalid event module: ${file}`);
        continue;
      }

      const maybe = mod as {
        name?: unknown;
        once?: unknown;
        execute?: unknown;
      };

      if (typeof maybe.name !== "string" || typeof maybe.execute !== "function") {
        console.warn(`⚠️ Skipping invalid event file: ${file}`);
        continue;
      }

      const once = maybe.once === true;
      once
        ? client.once(maybe.name as never, maybe.execute as never)
        : client.on(maybe.name as never, maybe.execute as never);

      count++;
    } catch (err) {
      console.error(`❌ Failed to load event ${file}:`, err);
    }
  }

  console.log(`✅ Loaded ${count} events (${RUNTIME_EXT})`);
}

void loadCommands();
void loadEvents();

client.once(Events.ClientReady, () => {
  console.log(`🟢 Logged in as ${client.user?.tag}`);
});

export default client;
