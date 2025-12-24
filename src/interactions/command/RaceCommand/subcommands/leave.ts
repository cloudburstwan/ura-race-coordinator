import SubcommandInteraction from "../../../../types/SubcommandInteraction";
import {
    ActionRowBuilder,
    AutocompleteInteraction,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    ChatInputCommandInteraction, ContainerBuilder,
    MessageActionRowComponentBuilder,
    MessageFlagsBitField, PublicThreadChannel,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SlashCommandSubcommandBuilder, TextChannel,
    TextDisplayBuilder
} from "discord.js";
import DiscordClient from "../../../../DiscordClient";
import {
    DistanceType,
    RaceFlagOptions,
    RaceStatus,
    SurfaceType, TrackConditionType,
    WeatherType
} from "../../../../services/RaceService/types/Race";
import {RacerMood} from "../../../../services/RaceService/types/Racer";
import createRaceStartComponent from "../../../../components/RaceStartComponent";
import {emojifyRaceName, numberSuffix, truncate} from "../../../../utils";

export default class RaceLeaveSubcommand extends SubcommandInteraction {
    public info = new SlashCommandSubcommandBuilder()
        .setName("leave")
        .setDescription("Leaves a race, accepts optional member to have leave")
        .addStringOption(option => option
            .setName("race")
            .setDescription("The race to leave")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addUserOption(option => option
            .setName("member")
            .setDescription("The member to make leave")
            .setRequired(false)
        )

    public async execute(interaction: ChatInputCommandInteraction, client: DiscordClient): Promise<void> {
        // Starts a race.
        const raceId = interaction.options.getString("race", true);
        let member = interaction.options.getUser("member") ?? interaction.user;

        await interaction.deferReply();

        let race = await client.services.race.get(raceId);

        if (!race) {
            await interaction.editReply(`Sorry, but the race selected does not exist.`);
            return;
        }

        try {
            await race.removeRacer(member.id, client, true);

            await interaction.editReply(member == interaction.user ?
                `You've left the "${emojifyRaceName(race.name, client)}".` :
                `Successfully removed <@${member.id}> from the "${emojifyRaceName(race.name, client)}".`);
        } catch (e) {
            // TODO: Add proper error handling.
            console.error("your fault for speedcoding this grass");
            console.error(e);
            await interaction.editReply(`Something went wrong when trying to start the race. Please promptly yell at Grass Wonder.`);
        }
    }

    public async autocomplete(interaction: AutocompleteInteraction, client: DiscordClient) {
        const focusedValue = interaction.options.getFocused(true);

        switch (focusedValue.name) {
            case "race":
                await interaction.respond((await client.services.race.list()).filter(race => {
                    return ![RaceStatus.Ended, RaceStatus.Cancelled].includes(race.status);
                }).map(race => {
                    return {name: truncate(race.name, 99, true), value: race._id.toString()}
                }).filter(race => {
                    return race.name.includes(focusedValue.value);
                }));
                break;
            default:
                await interaction.respond([]);
        }
    }
}