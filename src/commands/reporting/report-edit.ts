import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType
} from 'discord.js'


export const command = {
  data: new SlashCommandBuilder()
    .setName('report-edit')
    .setDescription('Edit your submitted match report')
    .addStringOption(option =>
      option.setName('matchid')
        .setDescription('Match ID returned from /report-game')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Choose what to edit')
        .setRequired(true)
        .addChoices(
          { name: 'Change Placements', value: 'change-placements' },
          { name: 'Flag Quit', value: 'flag-quit' },
          { name: 'Flag Sub', value: 'flag-sub' }
        )
    ),
  }