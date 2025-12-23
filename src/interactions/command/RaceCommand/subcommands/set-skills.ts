import SubcommandInteraction from "../../../../types/SubcommandInteraction";
import {
    AutocompleteInteraction,
    ChannelType,
    ChatInputCommandInteraction,
    SlashCommandSubcommandBuilder
} from "discord.js";
import DiscordClient from "../../../../DiscordClient";

export default class RaceSetSkillsSubcommand extends SubcommandInteraction {
    public info = new SlashCommandSubcommandBuilder()
        .setName("add-skills")
        .setDescription("Add the skills used count for a racer in a race.")
        .addStringOption(option => option
            .setName("race")
            .setDescription("The race that you want to add skills for")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option => option
            .setName("character")
            .setDescription("The character you want to add the skills used count for")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addNumberOption(option => option
            .setName("skills")
            .setDescription("The amount of skills to add. Use negative numbers to subtract")
            .setRequired(true)
            .setMinValue(-1000)
            .setMaxValue(1000) // this isn't a challenge. just don't.
        )

    public async execute(interaction: ChatInputCommandInteraction, client: DiscordClient): Promise<void> {
        await interaction.reply("done!");
    }

    public async autocomplete(interaction: AutocompleteInteraction, client: DiscordClient) {

    }
}