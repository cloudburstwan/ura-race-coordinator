import SubcommandInteraction from "../../../../types/SubcommandInteraction";
import {
    AutocompleteInteraction,
    ChannelType,
    ChatInputCommandInteraction,
    SlashCommandSubcommandBuilder
} from "discord.js";
import DiscordClient from "../../../../DiscordClient";

export default class RaceDestroySubcommand extends SubcommandInteraction {
    public info = new SlashCommandSubcommandBuilder()
        .setName("destroy")
        .setDescription("Destroys a race (deletes the event without running it)")

    public async execute(interaction: ChatInputCommandInteraction, client: DiscordClient): Promise<void> {
        await interaction.reply("done!");
    }

    public async autocomplete(interaction: AutocompleteInteraction, client: DiscordClient) {

    }
}