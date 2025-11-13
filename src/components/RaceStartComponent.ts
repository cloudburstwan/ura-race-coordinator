import Race, {DistanceType, SurfaceType, TrackConditionType, WeatherType} from "../services/RaceService/types/Race";
import {
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ContainerBuilder, MessageActionRowComponentBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder
} from "discord.js";
import {RacerMood} from "../services/RaceService/types/Racer";
import DiscordClient from "../DiscordClient";
import {randomInt} from "node:crypto";
import {emojifyRaceName, numberSuffix} from "../utils";

export default function createRaceStartComponent(race: Race, client: DiscordClient) {
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
            new TextDisplayBuilder().setContent(`## ${emojifyRaceName(race.name, client)}\nIt's time for the race to begin. We will be racing on **${race.surface == SurfaceType.Turf ? "Turf" : "Dirt"}** (condition: **${condition}**) for a distance of **${race.distanceMetres} meters (${distanceName})**. It is **${weather}**.\n\n### Our contestants today are...`),
        );

    if (race.flag == "LEGEND_RACE")
        component.setAccentColor(16750592);

    let mentions: string[] = [];

    let takenFavoritePositions = [];

    // Populate with existing overridden favorite positions
    for (let identifier in client.config.overrides.favorite) {
        let position = 0;
        switch (client.config.overrides.favorite[identifier]) {
            case "L": // Always last place
                position = race.racers.length;
                break;
            default:
                position = client.config.overrides.favorite[identifier];
        }

        takenFavoritePositions.push(position);
    }

    let racersWithFavorites = race.racers
        .map(racer => {
            let possibleFavoritePositions = [];

            for (let i = 0; i < race.racers.length; i++) {
                if (!takenFavoritePositions.includes(i+1))
                    possibleFavoritePositions.push(i+1);
            }

            let favorite = Object.keys(client.config.overrides.favorite).includes(`${racer.memberId}/${racer.characterName}`) ?
                (client.config.overrides.favorite[`${racer.memberId}/${racer.characterName}`] == "L" ? race.racers.length : client.config.overrides.favorite[`${racer.memberId}/${racer.characterName}`]) :
                possibleFavoritePositions[Math.floor(Math.random() * possibleFavoritePositions.length)];
            takenFavoritePositions.push(favorite);

            return Object.assign({ favoritePosition: favorite }, racer);
        })
        .sort((racer1, racer2) => racer1.favoritePosition < racer2.favoritePosition ? -1 : 1);

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

        let favouritePosition = racersWithFavorites.findIndex(racer => racer.memberId == race.racers[index].memberId && racer.characterName == race.racers[index].characterName)

        component.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`[#${race.racers[index].gate}] **${race.racers[index].characterName}** ${moodEmojiCombo} [${favouritePosition < 3 ? "**" : ""}${favouritePosition+1}${numberSuffix(favouritePosition+1)} favorite${favouritePosition < 3 ? "**" : ""}]`),
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

    return { component, mentions };
}