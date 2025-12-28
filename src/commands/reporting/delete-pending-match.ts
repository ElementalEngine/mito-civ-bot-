import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { config } from "../../config";
import { EMOJI_CONFIRM, EMOJI_FAIL, EMOJI_REPORT } from "../../config/constants";
import { deletePendingMatch, getMatch } from "../../services/reporting.service";
import { getPlayerListMessage } from "../../utils/convert-match-to-str";

export const data = new SlashCommandBuilder()
  .setName("delete-match")
  .setDescription("Removes a match report from the database.")
  .addStringOption(option =>
    option.setName("match-id")
      .setDescription("ID of the match to remove")
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: `${EMOJI_FAIL} This command must be used in a server.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const matchId = interaction.options.getString("match-id", true) as string;

  const errors: string[] = [];

  if (errors.length) {
    await interaction.reply({
      content: `${EMOJI_FAIL} FAIL\n${errors.map(e => `• ${e}`).join("\n")}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    await interaction.editReply(`Deleting report...`);
    const getMatchRes = await getMatch(matchId);
    if (getMatchRes?.reporter_discord_id != interaction.user.id &&
        !interaction.member.roles.cache.has(config.discord.roles.moderator)) {
      console.log(`User trying to delete match: ${interaction.user.id}. Original reporter id ${getMatchRes?.reporter_discord_id}`);
      await interaction.editReply(`${EMOJI_FAIL} Only original reporter <@${getMatchRes?.reporter_discord_id}> or a moderator can delete a report`);
      return;
    }
    const header =
      `${EMOJI_REPORT} Removing match by <@${interaction.user.id}>\n` +
      `Match ID: **${matchId}**\n`;
    const playerListMessage = getPlayerListMessage(getMatchRes);
    const changingOrderMsg = header + playerListMessage;
    const interactionReply = await interaction.followUp({ content: changingOrderMsg });

    const res = await deletePendingMatch(matchId);

    const successMsg = `${EMOJI_CONFIRM} Match **${matchId}** removed successfully!\n` + playerListMessage;
    interactionReply.edit(successMsg);

    for (var msg in res.discord_messages_id_list) {
      try {
        const message = await interaction.channel?.messages.fetch(res.discord_messages_id_list[msg]);
        if (message) {
          await message.delete();
        }
      } catch (e) {
        console.log(`Failed to delete message id ${res.discord_messages_id_list[msg]} for match ${matchId}`);
      }
    }

  } catch (err: any) {
    const msg = err?.body ? `${err.message}: ${JSON.stringify(err.body)}` : (err?.message ?? "Unknown error");
    await interaction.editReply(`${EMOJI_FAIL} Upload failed: ${msg}`);
  }
}