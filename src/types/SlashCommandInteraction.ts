// TODO: Base text interaction from which all text-based commands are built from

import {
    AutocompleteInteraction, ChatInputCommandInteraction,
    CommandInteraction,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandBuilder,
    SlashCommandSubcommandsOnlyBuilder
} from "discord.js";
import DiscordClient from "../DiscordClient";

export default class SlashCommandInteraction {
    public info: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;

    public async execute(interaction: ChatInputCommandInteraction, client: DiscordClient) {
        await interaction.reply("No configured response for this application command.");
        return;
    }

    public async autocomplete(interaction: AutocompleteInteraction, client: DiscordClient) {
        await interaction.respond([]);
        return;
    }
}