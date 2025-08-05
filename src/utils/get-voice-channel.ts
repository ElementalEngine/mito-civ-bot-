import { Client, VoiceChannel } from 'discord.js';

export function getVoiceChannel(
  client: Client,
  channelId: string
): VoiceChannel | null {
  const channel = client.channels.cache.get(channelId);
  if (!channel) {
    console.error(`Voice channel with ID ${channelId} not found.`);
    return null;
  }
  if (!(channel instanceof VoiceChannel)) {
    console.error(`Channel with ID ${channelId} is not a guild voice channel.`);
    return null;
  }
  return channel;
}