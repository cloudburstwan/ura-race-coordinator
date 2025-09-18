import SubcommandInteraction from "../../../../types/SubcommandInteraction";
import {
    AutocompleteInteraction,
    ChannelType,
    ChatInputCommandInteraction,
    SlashCommandSubcommandBuilder
} from "discord.js";
import DiscordClient from "../../../../DiscordClient";

export default class RaceDisqualifySubcommand extends SubcommandInteraction {
    public info = new SlashCommandSubcommandBuilder()
        .setName("disqualify")
        .setDescription("Disqualify a racer from a race. Announces this to the public")
        .addStringOption(option => option
            .setName("race")
            .setDescription("The race that you want to set skills for")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option => option
            .setName("character")
            .setDescription("The character you want to set the skills used count for")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option => option
            .setName("reason")
            .setDescription("The reason for disqualification")
            .setRequired(true)
            .addChoices([
                // TODO: Reasons
            ])
        )
        .addStringOption(option => option
            .setName("message")
            .setDescription("Optional message to be passed to the user")
            .setRequired(false)
        )

    public async execute(interaction: ChatInputCommandInteraction, client: DiscordClient): Promise<void> {
        await interaction.reply("done!");
    }

    public async autocomplete(interaction: AutocompleteInteraction, client: DiscordClient) {

    }
}