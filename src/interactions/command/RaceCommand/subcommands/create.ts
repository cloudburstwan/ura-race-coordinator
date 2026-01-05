import SubcommandInteraction from "../../../../types/SubcommandInteraction";
import {
    AutocompleteInteraction,
    ChannelType,
    ChatInputCommandInteraction,
    SlashCommandSubcommandBuilder
} from "discord.js";
import DiscordClient from "../../../../DiscordClient";
import Race, {
    RaceFlag,
    RaceFlagOptions, RaceStatus,
    RaceType,
    SurfaceType,
    TrackConditionType,
    WeatherType
} from "../../../../services/RaceService/types/Race";

export default class RaceCreateSubcommand extends SubcommandInteraction {
    public info = new SlashCommandSubcommandBuilder()
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
            .setName("start-at-unix")
            .setDescription("The time to start at. Uses a Unix Timestamp (search it up)")
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

    public async execute(interaction: ChatInputCommandInteraction, client: DiscordClient): Promise<void> {
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
        let start = new Date(interaction.options.getNumber("start-at-unix", true) * 1000);
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

        let channelId = await client.services.race.createRace(race, client);

        await interaction.reply(`Successfully created a race called "${outputRaceName}" with id of \`${race._id.toString()}\`! The announcement message is in <#${channelId}>. You will need to ping the role yourself because Discord is a small indie company.`);
    }

    public async autocomplete(interaction: AutocompleteInteraction, client: DiscordClient) {
        const focusedValue = interaction.options.getFocused(true);

        switch (focusedValue.name) {
            case "flag":
                await interaction.respond(RaceFlagOptions);
                break;
            default:
                await interaction.respond([]);
        }
    }
}