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
import {truncate} from "../../../../utils";

export default class RaceStartSubcommand extends SubcommandInteraction {
    public info = new SlashCommandSubcommandBuilder()
        .setName("start")
        .setDescription("Starts a race. This will ping all racers in the race channel")
        .addStringOption(option => option
            .setName("race")
            .setDescription("The race that you want to start")
            .setRequired(true)
            .setAutocomplete(true)
        )

    public async execute(interaction: ChatInputCommandInteraction, client: DiscordClient): Promise<void> {
        // Starts a race.
        const raceId = interaction.options.getString("race", true);
        try {
            const race = await client.services.race.startRace(raceId, client);

            if (!race) {
                await interaction.reply({
                    content: "No race by that name exists!",
                    flags: MessageFlagsBitField.Flags.Ephemeral
                });
                return;
            }

            const channel = await client.guild.channels.fetch(race.channelId) as TextChannel | PublicThreadChannel;

            const component = createRaceStartComponent(race, client);

            let raceAnnounce = await channel.send({
                components: [ component.component ],
                flags: MessageFlagsBitField.Flags.IsComponentsV2
            });

            await raceAnnounce.reply({
                content: `${component.mentions.join(" ")}`
            });

            await interaction.reply(`Started the race in <#${race.channelId}>`);
        } catch (e) {
            console.error("your fault for speedcoding this grass");
            console.error(e);
        }
    }

    public async autocomplete(interaction: AutocompleteInteraction, client: DiscordClient) {
        const focusedValue = interaction.options.getFocused(true);

        switch (focusedValue.name) {
            case "race":
                await interaction.respond(client.services.race.races.filter(race => {
                    return [RaceStatus.SignupOpen, RaceStatus.SignupClosed].includes(race.status);
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