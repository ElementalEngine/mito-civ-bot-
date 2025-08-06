import { CorsOptions } from 'cors'
import { config as env } from 'dotenv'
import path from 'path'

export * from './config/constants'

const nodeEnv = process.env.NODE_ENV ?? 'development'
env({
  path: path.resolve(`.env.${nodeEnv}`),
})

const cors: CorsOptions = {
  origin: process.env.CORS ?? '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  credentials: true,
  exposedHeaders: ['x-auth-token'],
}

const discord = {
  clientId: process.env.BOT_CLIENT_ID ?? '',
  clientSecret: process.env.BOT_CLIENT_SECRET ?? '',
  guildId: process.env.DISCORD_GUILD_ID ?? '',
  token: process.env.BOT_TOKEN ?? '',
  channels: {
    gamesReport: process.env.CHANNEL_GAMEREPORTING_ID,
    botTesting: process.env.CHANNEL_BOT_COMMANDS_ID!,
  },
  roles: {
    moderator: process.env.ROLE_MODERATOR!,
    developer: process.env.ROLE_DEVELOPER!,
    civ6Rank: process.env.ROLE_CIV6!,
    civ7Rank: process.env.ROLE_CIV7!,
  },
}

const trueskill = {
  MU: 1250,
  SIGMA: 150,
  BETA: 400,
  TAU: 10,
}

export const config = {
  oauth: `https://discord.com/api/oauth2/authorize?client_id=${
    discord.clientId
  }&redirect_uri=http%3A%2F%2F${process.env.HOST!}:${process.env
    .PORT!}&response_type=code&scope=identify%20connections&state=`,
  cors,
  discord,
  host: process.env.HOST!,
  port: Number(process.env.PORT!),
  trueskill,
  mongoDb: process.env.MONGODB_URL!,
  backend: {
    /** Python-reporting API */
    url: process.env.BACKEND_URL || 'http://localhost:8000',
  },
  env: (process.env.NODE_ENV as 'development' | 'production') ?? 'development',
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
  },
}