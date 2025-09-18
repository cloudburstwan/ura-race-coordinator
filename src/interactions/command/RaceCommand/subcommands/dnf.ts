import SubcommandInteraction from "../../../../types/SubcommandInteraction";
import {
    AutocompleteInteraction,
    ChannelType,
    ChatInputCommandInteraction,
    SlashCommandSubcommandBuilder
} from "discord.js";
import DiscordClient from "../../../../DiscordClient";

export default class RaceDNFSubcommand extends SubcommandInteraction {
    public info = new SlashCommandSubcommandBuilder()
        .setName("dnf")
        .setDescription("Mark a racer as Did Not Finish. Unlike `disqualify`, this is done silently")
        .addStringOption(option => option
            .setName("race")
            .setDescription("The race that you want to mark the racer as Did Not Finish in")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option => option
            .setName("character")
            .setDescription("The character you want mark as Did Not Finish")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option => option
            .setName("reason")
            .setDescription("The reason for not finishing")
            .setRequired(true)
            .addChoices([
                { name: "Injured", value: "injured" },
                { name: "Other", value: "not-specified" }
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