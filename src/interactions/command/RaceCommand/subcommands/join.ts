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
import RaceService from "../../../../services/RaceService";
import RaceStartSubcommand from "./start";

export default class RaceJoinSubcommand extends SubcommandInteraction {
    public info = new SlashCommandSubcommandBuilder()
        .setName("join")
        .setDescription("Joins a race, accepts optional member to have join. Bypasses some limits")
        .addStringOption(option => option
            .setName("race")
            .setDescription("The race to join")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option => option
            .setName("character")
            .setDescription("The character to join ass")
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(100)
        )
        .addUserOption(option => option
            .setName("member")
            .setDescription("The member to make join")
            .setRequired(false)
        )

    public async execute(interaction: ChatInputCommandInteraction, client: DiscordClient): Promise<void> {
        // Starts a race.
        const raceId = interaction.options.getString("race", true);
        let member = interaction.options.getUser("member") ?? interaction.user;
        const character = interaction.options.getString("character", true);

        await interaction.deferReply();

        let race = await client.services.race.get(raceId);

        if (!race) {
            await interaction.editReply(`Sorry, but the race selected does not exist.`);
            return;
        }

        try {
            let racerInfo = await race.addRacer(member.id, character, client, true);

            let moodEmojiCombo: string;
            if (racerInfo.joinedLate)
                switch (racerInfo.mood) {
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

            await interaction.editReply(member == interaction.user ?
                `You've joined the "${emojifyRaceName(race.name, client)}"! ${racerInfo.joinedLate ? `You have been assigned to gate ${racerInfo.gate}, with a mood of ${moodEmojiCombo}, and ${racerInfo.favoritePosition+1}${numberSuffix(racerInfo.favoritePosition+1)} favorite.` : ""}` :
                `Successfully added <@${member.id}> to the "${emojifyRaceName(race.name, client)}"! ${racerInfo.joinedLate ? `They have been assigned to gate ${racerInfo.gate}, with a mood of ${moodEmojiCombo}, and ${racerInfo.favoritePosition+1}${numberSuffix(racerInfo.favoritePosition+1)} favorite.` : ""}`);

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
                    return [RaceStatus.SignupOpen, RaceStatus.SignupClosed, RaceStatus.Started].includes(race.status);
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