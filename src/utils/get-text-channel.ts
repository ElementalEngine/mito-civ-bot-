import { Client, TextChannel } from 'discord.js';

export function getTextChannel(
  client: Client,
  channelId: string
): TextChannel | null {
  const channel = client.channels.cache.get(channelId);
  if (!channel) {
    console.error(`Text channel with ID ${channelId} not found.`);
    return null;
  }
  if (!(channel instanceof TextChannel)) {
    console.error(`Channel with ID ${channelId} is not a guild text channel.`);
    return null;
  }
  // Ensure the bot can send messages in this channel
  if (!channel.isSendable()) {
    console.error(`Channel with ID ${channelId} is not sendable.`);
    return null;
  }
  return channel;
}
