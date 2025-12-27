import {
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ContainerBuilder, MessageActionRowComponentBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder
} from "discord.js";
import Race from "../services/RaceService/types/Race";
import {RacerStatus} from "../services/RaceService/types/Racer";
import DiscordClient from "../DiscordClient";

export default async function createRaceEndMissingRacersComponent(race: Race, client: DiscordClient, disabled: boolean = false) {
    const component = new ContainerBuilder()
        .setAccentColor(16711680)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## Missing Runners!"),
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`The following runners have been flagged as not being present.\nIf you are sure about their presence, you may continue, however you may wish to remove them with ${await client.getCommandString("race", "leave")} before continuing if they are not present.`),
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
        );

    for (let racer of race.racers.filter(racer => racer.status == RacerStatus.NotPresent)) {
        component.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`[#${racer.gate}] **${racer.characterName}** (<@${racer.memberId}>)`),
        );
    }

    component.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("Remember: This flagging is done automatically and in the case of a bot failure such as a crash, this data may be inaccurate. Please only use this as a warning and double check any racers marked as not present in case they are actually present."),
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
        )
        .addActionRowComponents(
            new ActionRowBuilder<MessageActionRowComponentBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Success)
                        .setLabel("Continue")
                        .setCustomId(`end-race-yes/${race._id}`)
                        .setDisabled(disabled),
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Danger)
                        .setLabel("Cancel")
                        .setCustomId(`end-race-no/${race._id}`)
                        .setDisabled(disabled),
                ),
        );

    return component;
}