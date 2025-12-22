import Race, {
    DistanceType,
    RaceStatus,
    SurfaceType,
    TrackConditionType,
    WeatherType
} from "../services/RaceService/types/Race";
import {
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ContainerBuilder, MessageActionRowComponentBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder
} from "discord.js";
import DiscordClient from "../DiscordClient";
import {emojifyRaceName} from "../utils";

export default function createRaceSignupComponent(race: Race, client: DiscordClient, useGate: boolean) {
    let surfaceEmoji: string;
    switch (race.surface) {
        case SurfaceType.Dirt:
            surfaceEmoji = client.getEmojiString("surface_dirt");
            break;
        case SurfaceType.Turf:
            surfaceEmoji = client.getEmojiString("surface_turf");
            break;
    }
    let weatherEmoji: string;
    switch (race.weather) {
        case WeatherType.Sunny:
            weatherEmoji = "☀️";
            break;
        case WeatherType.Cloudy:
            weatherEmoji = "☁️";
            break;
        case WeatherType.Rainy:
            weatherEmoji = "🌧️";
            break;
        case WeatherType.Snowy:
            weatherEmoji = "🌨️";
            break;
    }

    const component = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${emojifyRaceName(race.name, client)}`),
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Location:** <#${race.channelId}>`),
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Time:** ${race.flag == "WEDDING_BOUQUET_THROW" ? "When the vows are said, the rings worn, and the kisses given." : `<t:${Math.floor(race.startingTimestamp / 1000)}:F>`}`),
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Surface:** ${surfaceEmoji} ${race.surface == SurfaceType.Dirt ? "Dirt" : "Turf"}`),
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Distance**: ${race.distanceMetres}M (${DistanceType[race.distance]})`),
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Weather:** ${weatherEmoji} ${WeatherType[race.weather]}`),
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Track Condition:** ${TrackConditionType[race.trackCondition]}`),
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Maximum available slots:** ${race.maxRacers}`),
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Status:** ${race.status == RaceStatus.SignupOpen && race.racers.length < race.maxRacers ? "Signups Open" : "Signups Closed"}`),
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("Press the sign up button to sign up!\nIf you wish to retract your signup, press the \"resign\" button. No worries if you press it by accident, you can just press the sign-up button again."),
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("### Current Racers:"),
        );

    if (race.flag == "URARA_MEMORIAM")
        component.setAccentColor(16745656);

    if (race.flag == "LEGEND_RACE")
        component.setAccentColor(16750592);

    if (race.flag == "SPECIAL")
        component.setAccentColor(16726072);

    if (race.racers.length == 0) {
        component.addTextDisplayComponents(
            new TextDisplayBuilder().setContent("No racers have signed up yet.")
        );
    } else {
        for (let racerIndex in race.racers) {
            component.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`[#${useGate ? race.racers[racerIndex].gate : parseInt(racerIndex) + 1}] **${race.racers[racerIndex].characterName}** ${race.flag == "LEGEND_RACE" && race.racers[racerIndex].memberId == client.config.users.legend_racer ? "" : `(<@${race.racers[racerIndex].memberId}>)`}`),
            );
        }
    }

    component.addActionRowComponents(
        new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Success)
                    .setLabel(`Join Race (${race.racers.length}/${race.maxRacers})`)
                    .setEmoji({
                        name: "🏃",
                    })
                    .setCustomId(`race-signup/${race._id}`)
                    .setDisabled(race.status != RaceStatus.SignupOpen || race.racers.length >= race.maxRacers),
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Danger)
                    .setLabel("Resign (Leave Race)")
                    .setCustomId(`race-resign/${race._id}`)
                    .setDisabled(![RaceStatus.SignupOpen, RaceStatus.SignupClosed].includes(race.status))
            )
    );

    component.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# Race ID: ${race._id}`),
    );

    return component
}