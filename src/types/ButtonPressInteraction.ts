import {
    AutocompleteInteraction, ButtonBuilder,
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder,
    ButtonInteraction
} from "discord.js";
import DiscordClient from "../DiscordClient";

export default class ButtonPressInteraction {
    public id: string;

    public async execute(interaction: ButtonInteraction, client: DiscordClient) {
        await interaction.reply("No response configured for this interaction");
        return;
    }
}