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
import {numberSuffix} from "../utils";

export default function createRaceStartComponent(race: Race, client: DiscordClient) {
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

    let mentions: string[] = [];

    let racersWithFavourites = race.racers
        .map(racer => Object.assign({ favouritePositionDecider: randomInt(0, 200) }, racer))
        .sort((racer1, racer2) => racer1.favouritePositionDecider < racer2.favouritePositionDecider ? -1 : 1);

    for (let index in racersWithFavourites) {
        let moodEmojiCombo: string;
        switch (racersWithFavourites[index].mood) {
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
            new TextDisplayBuilder().setContent(`[#${parseInt(index)+1}] **${racersWithFavourites[index].characterName}** ${moodEmojiCombo} [${parseInt(index) < 2 ? "**" : ""}${parseInt(index)+1}${numberSuffix(parseInt(index)+1)} favorite${parseInt(index) < 2 ? "**" : ""}]`),
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