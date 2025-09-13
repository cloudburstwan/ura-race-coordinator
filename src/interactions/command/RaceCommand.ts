import SlashCommandInteraction from "../../types/SlashCommandInteraction";
import {
    ActionRowBuilder,
    AttachmentBuilder,
    AutocompleteInteraction,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChannelType,
    ChatInputCommandInteraction,
    ComponentType,
    ContainerBuilder,
    MessageActionRowComponentBuilder,
    MessageFlagsBitField,
    PublicThreadChannel,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SlashCommandBuilder,
    TextChannel,
    TextDisplayBuilder,
    TextInputStyle
} from "discord.js";
import DiscordClient from "../../DiscordClient";
import Race, {
    DistanceType,
    MarginType,
    Placement,
    RaceFlag,
    RaceFlagOptions,
    RaceStatus,
    RaceType,
    SurfaceType,
    TrackConditionType,
    WeatherType
} from "../../services/RaceService/types/Race";
import {numberSuffix, randomInt} from "../../utils";
import {RacerMood} from "../../services/RaceService/types/Racer";
import ImageService, {ScoreStatus} from "../../services/ImageService";

export default class CharacterCommand extends SlashCommandInteraction {
    public info = new SlashCommandBuilder()
        .setName("race")
        .setDescription("Manage races")
        .addSubcommand(subcommand => subcommand
            .setName("create")
            .setDescription("Create a character that can participate in races.")
            .addStringOption(option => option
                .setName("race-name")
                .setDescription("What do you want to call this race?")
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName("type")
                .setDescription("What is this race meant to be?")
                .setRequired(true)
                .addChoices([
                    { name: "Non-graded", value: "non-graded" },
                    { name: "Graded (JP)", value: "graded-domestic" },
                    { name: "Graded (Non-JP)", value: "graded-international" }
                ])
            )
            .addChannelOption(option => option
                .setName("race-channel")
                .setDescription("The channel the race will occur in. Can be a thread.")
                .addChannelTypes([ ChannelType.GuildText, ChannelType.PublicThread ])
                .setRequired(true)
            )
            .addNumberOption(option => option
                .setName("start-at-seconds")
                .setDescription("The time to start at. Uses the numbers in Discords timestamp system")
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName("surface")
                .setDescription("The surface for this race")
                .setRequired(true)
                .addChoices([
                    { name: "Turf", value: "turf" },
                    { name: "Dirt", value: "dirt" }
                ])
            )
            .addNumberOption(option => option
                .setName("distance")
                .setDescription("The distance of the race in metres.")
                .setMinValue(1)
                .setMaxValue(9999)
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName("weather")
                .setDescription("The weather on the day of the race")
                .setRequired(true)
                .addChoices([
                    { name: "Sunny", value: "sunny" },
                    { name: "Cloudy", value: "cloudy" },
                    { name: "Rainy", value: "rainy" },
                    { name: "Snowy", value: "snowy" }
                ])
            )
            .addStringOption(option => option
                .setName("track-condition")
                .setDescription("The track conditions on the day of the race.")
                .setRequired(true)
                .addChoices([
                    { name: "Firm", value: "firm" },
                    { name: "Good", value: "good" },
                    { name: "Soft", value: "soft" },
                    { name: "Heavy", value: "heavy" }
                ])
            )
            .addNumberOption(option => option
                .setName("max-racers")
                .setDescription("The maximum amount of racers that can sign up.")
                .setMinValue(1)
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName("flag")
                .setDescription("Optional flag to change race behaviour")
                .setRequired(false)
                .setAutocomplete(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName("destroy")
            .setDescription("Destroys a race (deletes the event without running it)")
        )
        .addSubcommand(subcommand => subcommand
            .setName("start")
            .setDescription("Starts a race. This will ping all racers in the race channel")
            .addStringOption(option => option
                .setName("race")
                .setDescription("The race that you want to start")
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName("set-skills")
            .setDescription("Set the skills used count for a racer")
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
            .addNumberOption(option => option
                .setName("skills")
                .setDescription("The amount of skills used")
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(1000) // this isn't a challenge. just don't.
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName("end")
            .setDescription("Ends a race. This will generate and send the results in the channel the race is held in")
            .addStringOption(option => option
                .setName("race")
                .setDescription("The race that you want to end")
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand(subcommand => subcommand
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
        )
        .addSubcommand(subcommand => subcommand
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
        )
    ;

    async execute(interaction: ChatInputCommandInteraction, client: DiscordClient) {
        let subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case "create":
                await this.subcommand_create(interaction, client);
                break;
            case "destroy":
                await this.subcommand_destroy(interaction, client);
                break;
            case "set-skills":
                await this.subcommand_setskills(interaction, client);
                break;
            case "start":
                await this.subcommand_start(interaction, client);
                break;
            case "end":
                await this.subcommand_end(interaction, client);
                break;
            case "disqualify":
                break;
        }
    }

    private async subcommand_create(interaction: ChatInputCommandInteraction, client: DiscordClient) {
        let raceName = interaction.options.getString("race-name", true);
        let raceType: RaceType;
        switch (interaction.options.getString("type", true)) {
            case "graded-domestic":
                raceType = RaceType.GradedDomestic;
                break;
            case "graded-international":
                raceType = RaceType.GradedInternational;
                break;
            case "non-graded":
            default:
                raceType = RaceType.NonGraded;
        }
        let channel = interaction.options.getChannel("race-channel", true);
        let start = new Date(interaction.options.getNumber("start-at-seconds", true) * 1000);
        let surface: SurfaceType;
        switch (interaction.options.getString("surface", true)) {
            case "turf":
                surface = SurfaceType.Turf;
                break;
            case "dirt":
            default:
                surface = SurfaceType.Dirt;
        }
        let distance = interaction.options.getNumber("distance", true);
        let weather: WeatherType;
        switch (interaction.options.getString("weather", true)) {
            case "cloudy":
                weather = WeatherType.Cloudy;
                break;
            case "rainy":
                weather = WeatherType.Rainy;
                break;
            case "snowy":
                weather = WeatherType.Snowy;
                break;
            case "sunny":
            default:
                weather = WeatherType.Sunny;
        }
        let trackCondition: TrackConditionType;
        switch (interaction.options.getString("track-condition", true)) {
            case "good":
                trackCondition = TrackConditionType.Good;
                break;
            case "soft":
                trackCondition = TrackConditionType.Soft;
                break;
            case "heavy":
                trackCondition = TrackConditionType.Heavy;
                break;
            case "firm":
            default:
                trackCondition = TrackConditionType.Firm;
        }
        let maxRacers = interaction.options.getNumber("max-racers", true);
        let flag = interaction.options.getString("flag", false);

        if (flag != undefined && !RaceFlagOptions.some(option => option.value == flag)) {
            flag = undefined
        }

        let race = new Race(raceName, raceType, channel.id, start, surface, distance, weather, trackCondition, maxRacers, flag as RaceFlag | undefined);

        let outputRaceName = raceName
            .replaceAll(/[\[(]G1[\])]/gi, client.getEmojiString("racegrade_g1"))
            .replaceAll(/[\[(]G2[\])]/gi, client.getEmojiString("racegrade_g2"))
            .replaceAll(/[\[(]G3[\])]/gi, client.getEmojiString("racegrade_g3"))
            .replaceAll(/[\[(]OPEN[\])]/gi, client.getEmojiString("racegrade_open"))
            .replaceAll(/[\[(]PRE-OPEN[\])]/gi, client.getEmojiString("racegrade_preopen"))
            .replaceAll(/[\[(]MAIDEN[\])]/gi, client.getEmojiString("racegrade_maiden"))
            .replaceAll(/[\[(]DEBUT[\])]/gi, client.getEmojiString("racegrade_debut"))
            .replaceAll(/[\[(]EX[\])]/gi, client.getEmojiString("racegrade_exhibition"));

        await client.services.race.createRace(race, client);

        await interaction.reply(`Successfully created a race called "${outputRaceName}"! The announcement message is in <${channel.id}>. You will need to ping the role yourself because Discord is a small indie company.`);
    }

    private async subcommand_destroy(interaction: ChatInputCommandInteraction, client: DiscordClient) {

    }

    private async subcommand_setskills(interaction: ChatInputCommandInteraction, client: DiscordClient) {

    }

    private async subcommand_start(interaction: ChatInputCommandInteraction, client: DiscordClient) {
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

    private async subcommand_end(interaction: ChatInputCommandInteraction, client: DiscordClient) {
        const raceId = interaction.options.getString("race", true);
        const race = client.services.race.races.find(race => race._id.toString() == raceId);

        if (!race) {
            await interaction.reply({
                content: "No race by that name exists!",
                flags: MessageFlagsBitField.Flags.Ephemeral
            });
            return;
        }

        let results = await client.services.race.getResults(raceId);

        function generateComponent(locked: boolean) {
            const component = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("## Generated Race Results"),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("This is the race results that have been generated.\nDon't like them? Press the reroll button!\nLike them? Press the publish button and the results will begin to be published to the racers."),
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                );

            results.forEach(placement => {
                let margin: string;
                switch (placement.marginType) {
                    case MarginType.Distance:
                        margin = "[DISTANCE]";
                        break;
                    case MarginType.Number:
                        margin = `${placement.marginNumber}L`;
                        break;
                    case MarginType.Neck:
                        margin = "[NECK]";
                        break;
                    case MarginType.Head:
                        margin = "[HEAD]";
                        break;
                    case MarginType.Nose:
                        margin = "[NOSE]";
                        break;
                    case MarginType.DeadHeat:
                        margin = "[DEAD HEAT]";
                        break;
                    default:
                        margin = "";
                }

                let emoji: string;
                switch (placement.racer.mood) {
                    case RacerMood.Awful:
                        emoji = "mood_awful_small";
                        break;
                    case RacerMood.Bad:
                        emoji = "mood_bad_small";
                        break;
                    case RacerMood.Normal:
                        emoji = "mood_normal_small";
                        break;
                    case RacerMood.Good:
                        emoji = "mood_good_small";
                        break;
                    case RacerMood.Great:
                    default:
                        emoji = "mood_great_small";
                }

                component.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**${placement.position}${numberSuffix(placement.position)}** ${placement.racer.characterName} ${client.getEmojiString(emoji)} (<@${placement.racer.memberId}>) ${margin.length == 0 ? "" : `**${margin}**`}`),
                )
            })

            component.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
            )
            .addActionRowComponents(
                new ActionRowBuilder<MessageActionRowComponentBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Success)
                            .setLabel("Publish")
                            .setCustomId("race-end-publish")
                            .setDisabled(locked),
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel("Reroll")
                            .setCustomId("race-end-reroll")
                            .setDisabled(locked),
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Danger)
                            .setLabel("Cancel ending")
                            .setCustomId("race-end-cancel")
                            .setDisabled(locked),
                    ),
            );

            if (race.flag == "URARA_MEMORIAM")
                component.setAccentColor(16745656);

            return component;
        }

        let component = generateComponent(false);
        let message = await interaction.reply({
            //components: [ component ],
            //flags: MessageFlagsBitField.Flags.IsComponentsV2
            content: "Successfully internally ended the race. Please generate a race using the following information I have for this race."
        });

        await (await message.fetch()).reply({
            content: `${race.racers.map(racer => `${racer.characterName}${race.type != RaceType.NonGraded ? ` - ${racer.skillRolls.length}` : ""}`).join("\n")}`
        });

        function listenForButtonPress() {
            message.awaitMessageComponent({
                filter: (i) => {
                    return i.user.id == interaction.user.id
                }, componentType: ComponentType.Button, time: 60_000
            })
            .then(async buttonPress => {
                let buttonName = buttonPress.customId;

                if (buttonName == "race-end-publish") {
                    // Publish!
                    // TODO: Publish the scoreboard
                    console.log("publish!");
                    await sendResultsToPublic(buttonPress, race, results, client);
                    await client.services.race.endRace(raceId, client);
                }
                if (buttonName == "race-end-reroll") {
                    results = await client.services.race.getResults(raceId);
                    let component = generateComponent(false);
                    await message.edit({
                        components: [component],
                        flags: MessageFlagsBitField.Flags.IsComponentsV2
                    });
                    listenForButtonPress();
                    await buttonPress.deferUpdate();
                }
                if (buttonName == "race-end-cancel") {
                    let component = generateComponent(true);
                    await message.edit({
                        components: [component],
                        flags: MessageFlagsBitField.Flags.IsComponentsV2
                    });
                    await buttonPress.reply("Cancelled.");
                }
            })
            .catch(() => {
                let component = generateComponent(true);
                message.edit({
                    components: [component],
                    flags: MessageFlagsBitField.Flags.IsComponentsV2
                });
            })
        }

        async function sendResultsToPublic(interaction: ButtonInteraction, race: Race, placements: Placement[], client: DiscordClient) {
            const channel = await client.guild.channels.fetch(race.channelId) as TextChannel | PublicThreadChannel;
            let needToReview = placements.some((placement, index) => placement.position != index+1) ||
                               placements.some((placement) => placement.marginType == MarginType.Nose && (Math.floor(Math.random() * 2) == 0));

            await interaction.reply({
                content: `Successfully ended the race and beginning to publish the results in <#${race.channelId}>.${needToReview ? " Detected photo finish (50% chance on Nose, 100% chance on Dead Heat). Result publishing will be artificially delayed for dramatic purposes." : ""}`
            });

            await channel.send("*The racers look at the scoreboard as it begins to light up, displaying the final results of the race.*");

            async function showScores() {
                // TODO: Show result scoreboard.
                /*const scoreboard = await ImageService.drawScoreboard(ScoreStatus.Final, results.map(result => result.gate), SurfaceType.Turf, "haru_final");

                const attachment = new AttachmentBuilder(scoreboard)
                    .setName("scoreboard.png");

                let finalScoreboard = await channel.send({
                    files: [ attachment ]
                });*/

                const component = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("## Final Scores"),
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("These scores are final and will not change."),
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                    );

                results.forEach(placement => {
                    let margin: string;
                    switch (placement.marginType) {
                        case MarginType.Distance:
                            margin = "[DISTANCE]";
                            break;
                        case MarginType.Number:
                            margin = `${placement.marginNumber}L`;
                            break;
                        case MarginType.Neck:
                            margin = "[NECK]";
                            break;
                        case MarginType.Head:
                            margin = "[HEAD]";
                            break;
                        case MarginType.Nose:
                            margin = "[NOSE]";
                            break;
                        case MarginType.DeadHeat:
                            margin = "[DEAD HEAT]";
                            break;
                        default:
                            margin = "";
                    }

                    let emoji: string;
                    switch (placement.racer.mood) {
                        case RacerMood.Awful:
                            emoji = "mood_awful_small";
                            break;
                        case RacerMood.Bad:
                            emoji = "mood_bad_small";
                            break;
                        case RacerMood.Normal:
                            emoji = "mood_normal_small";
                            break;
                        case RacerMood.Good:
                            emoji = "mood_good_small";
                            break;
                        case RacerMood.Great:
                        default:
                            emoji = "mood_great_small";
                    }

                    component.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**${placement.position}${numberSuffix(placement.position)}** ${placement.racer.characterName} ${client.getEmojiString(emoji)} (<@${placement.racer.memberId}>) ${margin.length == 0 ? "" : `**${margin}**`}`),
                    )
                });

                if (race.flag == "URARA_MEMORIAM")
                    component.setAccentColor(16745656);

                setTimeout(async () => {
                    /*await finalScoreboard.reply({
                        components: [ component ],
                        flags: MessageFlagsBitField.Flags.IsComponentsV2
                    });*/
                }, 3000);
            }

            if (needToReview) {
                setTimeout(async () => {
                    await channel.send("https://s3.cloudburst.lgbt/race-assets/base_haru_review.png");
                }, 3000);
                // TODO: Show review scoreboard.
                setTimeout(async () => await showScores(), (randomInt(45000, 120000)));
            } else {
                setTimeout(async () => await showScores(), (randomInt(15000, 60000)));
            }
        }

        //listenForButtonPress();
    }

    async autocomplete(interaction: AutocompleteInteraction, client: DiscordClient): Promise<void> {
        const focusedValue = interaction.options.getFocused(true);

        switch (focusedValue.name) {
            case "flag":
                await interaction.respond(RaceFlagOptions);
                break;
            case "race":
                if (["start"].includes(interaction.options.getSubcommand())) {
                    await interaction.respond(client.services.race.races.filter(race => {
                        return [RaceStatus.SignupOpen, RaceStatus.SignupClosed].includes(race.status);
                    }).map(race => {
                        return {name: race.name, value: race._id.toString()}
                    }).filter(race => {
                        return race.name.includes(focusedValue.value);
                    }));
                } else if (["end", "set-skills", "disqualify"].includes(interaction.options.getSubcommand())) {
                    await interaction.respond(client.services.race.races.filter(race => {
                        return ![RaceStatus.SignupOpen, RaceStatus.SignupClosed, RaceStatus.Ended].includes(race.status);
                    }).map(race => {
                        return {name: race.name, value: race._id.toString()}
                    }).filter(race => {
                        return race.name.includes(focusedValue.value);
                    }));
                } else {
                    await interaction.respond(client.services.race.races.map(race => {
                        return {name: race.name, value: race._id.toString()}
                    }).filter(race => {
                        return race.name.includes(focusedValue.value);
                    }));
                }
                break;
            case "character":
                let raceId = interaction.options.getString("race", true);
                if (!raceId || !client.services.race.races.some(race => race._id.toString() == raceId)) {
                    await interaction.respond([ { name: "⚠️ No race selected! Command will fail!", value: "no-race-selected" } ]);
                } else {
                    let racers: {name: string, value: string}[] = [];

                    for (const racer of client.services.race.races.find(race => race._id.toString() == raceId).racers) {
                        racers.push({
                            name: `${racer.characterName} (${(await interaction.guild.members.fetch(racer.memberId)).displayName})`,
                            value: `${racer.memberId}/${racer.characterName}`
                        });
                    }

                    await interaction.respond(racers);
                }
                break;
            default:
                await interaction.respond([]);
        }
    }
}