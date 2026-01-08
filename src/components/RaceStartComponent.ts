import Race, {DistanceType, SurfaceType, TrackConditionType, WeatherType} from "../services/RaceService/types/Race";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    MessageActionRowComponentBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder
} from "discord.js";
import {RacerMood, RacerStatus} from "../services/RaceService/types/Racer";
import DiscordClient from "../DiscordClient";
import {emojifyRaceName, numberSuffix, surfaceToText} from "../utils";

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
            new TextDisplayBuilder().setContent(`## ${emojifyRaceName(race.name, client)}\nIt's time for the race to begin. We will be racing on **${surfaceToText(race.surface)}** (condition: **${condition}**) for a distance of **${race.distanceMetres} meters (${distanceName})**. It is **${weather}**.\n\n### Our contestants today are...`),
        );

    if (race.flag == "URARA_MEMORIAM")
        component.setAccentColor(16745656);

    if (race.flag == "LEGEND_RACE")
        component.setAccentColor(16750592);

    if (race.flag == "SPECIAL")
        component.setAccentColor(16726072);

    let mentions: string[] = [];

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

        let attendanceCheckerStr: string = "";
        if (client.config.experiments.includes("RACER_ATTENDANCE_CHECKER")) {
            attendanceCheckerStr = `${race.racers[index].status == RacerStatus.Normal ? client.getEmojiString("racer_status_present") : client.getEmojiString("racer_status_absent")} `;
        }

        component.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`${attendanceCheckerStr}[#${race.racers[index].gate}] **${race.racers[index].characterName}** ${moodEmojiCombo} [${race.racers[index].favoritePosition < 3 ? "**" : ""}${race.racers[index].favoritePosition+1}${numberSuffix(race.racers[index].favoritePosition+1)} favorite${race.racers[index].favoritePosition < 3 ? "**" : ""}]`),
        );

        mentions.push(`<@${race.racers[index].memberId}>`);
    }

    component
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
        );

    if (client.config.experiments.includes("RACER_ATTENDANCE_CHECKER")) {
        component.addTextDisplayComponents(
            new TextDisplayBuilder().setContent("Your attendance will be marked automatically when you send your first message in this channel.")
        )
    } else {
        component
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
    }

    return { component, mentions };
}