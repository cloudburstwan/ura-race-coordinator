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


            await interaction.reply(`Starting the race in <#${race.channelId}>`);

            const channel = await client.guild.channels.fetch(race.channelId) as TextChannel | PublicThreadChannel;

            let raceName = race.name
                .replaceAll(/[\[(]G1[\])]/gi, client.getEmojiString("racegrade_g1"))
                .replaceAll(/[\[(]G2[\])]/gi, client.getEmojiString("racegrade_g2"))
                .replaceAll(/[\[(]G3[\])]/gi, client.getEmojiString("racegrade_g3"))
                .replaceAll(/[\[(]OPEN[\])]/gi, client.getEmojiString("racegrade_open"))
                .replaceAll(/[\[(]PRE-OPEN[\])]/gi, client.getEmojiString("racegrade_preopen"))
                .replaceAll(/[\[(]MAIDEN[\])]/gi, client.getEmojiString("racegrade_maiden"))
                .replaceAll(/[\[(]DEBUT[\])]/gi, client.getEmojiString("racegrade_debut"))
                .replaceAll(/[\[(]EX[\])]/gi, client.getEmojiString("racegrade_exhibition"));

            let condition: string;
            switch (race.trackCondition) {
                case TrackConditionType.Firm:
                    condition = "Firm";
                    break;
                case TrackConditionType.Good:
                    condition = "Good";
                    break;
                case TrackConditionType.Soft:
                    condition = "Soft";
                    break;
                case TrackConditionType.Heavy:
                    condition = "Heavy";
                    break;
            }
            let distanceName: string;
            switch (race.distance) {
                case DistanceType.Sprint:
                    distanceName = "Sprint";
                    break;
                case DistanceType.Mile:
                    distanceName = "Mile";
                    break;
                case DistanceType.Medium:
                    distanceName = "Medium";
                    break;
                case DistanceType.Long:
                    distanceName = "Long";
                    break;
            }
            let weather: string;
            switch (race.weather) {
                case WeatherType.Sunny:
                    weather = "Sunny";
                    break;
                case WeatherType.Cloudy:
                    weather = "Cloudy";
                    break;
                case WeatherType.Rainy:
                    weather = "Rainy";
                    break;
                case WeatherType.Snowy:
                    weather = "Snowy";
                    break;
            }

            const component = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${race.name}\nIt's time for the race to begin. We will be racing on **${race.surface == SurfaceType.Turf ? "Turf" : "Dirt"}** (condition: **${condition}**) for a distance of **${race.distanceMetres} meters (${distanceName})**. It is **${weather}**.\n\n### Our contestants today are...`),
                );

            let mentions: string[] = []

            for (let index in race.racers) {
                let moodEmojiCombo: string;
                switch (race.racers[index].mood) {
                    case RacerMood.Awful:
                        moodEmojiCombo = client.getEmojiString("mood_awful_large");
                        break;
                    case RacerMood.Bad:
                        moodEmojiCombo = client.getEmojiString("mood_bad_large");
                        break;
                    case RacerMood.Normal:
                        moodEmojiCombo = client.getEmojiString("mood_normal_large");
                        break;
                    case RacerMood.Good:
                        moodEmojiCombo = client.getEmojiString("mood_good_large");
                        break;
                    case RacerMood.Great:
                        moodEmojiCombo = client.getEmojiString("mood_great_large");
                        break;
                }

                component.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`[#${parseInt(index)+1}] **${race.racers[index].characterName}** ${moodEmojiCombo}`),
                );

                mentions.push(`<@${race.racers[index].memberId}>`);
            }

            component
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("Press the button below to verify that you are present!\n\n**Development Note:** The button does nothing right now, but it's here to get you familiar with it."),
                )
                .addActionRowComponents(
                    new ActionRowBuilder<MessageActionRowComponentBuilder>()
                        .addComponents(
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Success)
                                .setLabel("Confirm Attendance for Race")
                                .setDisabled(true)
                                .setCustomId("race-confirm-attendance"),
                        ),
                );

            let raceAnnounce = await channel.send({
                components: [ component ],
                flags: MessageFlagsBitField.Flags.IsComponentsV2
            });

            await raceAnnounce.reply({
                content: `${mentions.join(" ")}`
            });
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
                    return {name: race.name, value: race._id.toString()}
                }).filter(race => {
                    return race.name.includes(focusedValue.value);
                }));
                break;
            default:
                await interaction.respond([]);
        }
    }
}