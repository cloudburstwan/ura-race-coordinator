import SubcommandInteraction from "../../../../types/SubcommandInteraction";
import {
    ActionRowBuilder,
    AutocompleteInteraction, ButtonBuilder, ButtonInteraction, ButtonStyle,
    ChannelType,
    ChatInputCommandInteraction, ComponentType,
    ContainerBuilder,
    MessageActionRowComponentBuilder,
    MessageFlagsBitField, PublicThreadChannel,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SlashCommandSubcommandBuilder, TextChannel,
    TextDisplayBuilder
} from "discord.js";
import DiscordClient from "../../../../DiscordClient";
import Race, {
    MarginType,
    Placement,
    RaceFlagOptions,
    RaceStatus,
    RaceType
} from "../../../../services/RaceService/types/Race";
import {RacerMood} from "../../../../services/RaceService/types/Racer";
import {numberSuffix, randomInt} from "../../../../utils";

export default class RaceEndSubcommand extends SubcommandInteraction {
    public info = new SlashCommandSubcommandBuilder()
        .setName("end")
        .setDescription("Ends a race. This will generate and send the results in the channel the race is held in")
        .addStringOption(option => option
            .setName("race")
            .setDescription("The race that you want to end")
            .setRequired(true)
            .setAutocomplete(true)
        )

    public async execute(interaction: ChatInputCommandInteraction, client: DiscordClient): Promise<void> {
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
        await client.services.race.endRace(raceId, client);

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
            content: `\`\`\`\n${race.racers.length == 0 ? "No racers" : race.racers.map(racer => `[#${racer.gate}] ${racer.characterName}${race.type != RaceType.NonGraded ? ` [${racer.mood}] - [RACER ORIGIN] - ${racer.skillRolls.length}` : ""}`).join("\n")}\n-# Race ID: ${race._id.toString()}\n\`\`\``
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

    public async autocomplete(interaction: AutocompleteInteraction, client: DiscordClient) {
        const focusedValue = interaction.options.getFocused(true);

        switch (focusedValue.name) {
            case "race":
                await interaction.respond(client.services.race.races.filter(race => {
                    return ![RaceStatus.SignupOpen, RaceStatus.SignupClosed, RaceStatus.Ended].includes(race.status);
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