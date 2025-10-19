import SlashCommandInteraction from "../../types/SlashCommandInteraction";
import {
    ActionRowBuilder,
    ChatInputCommandInteraction,
    ContainerBuilder,
    MessageActionRowComponentBuilder,
    MessageFlagsBitField,
    SelectMenuOptionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    TextDisplayBuilder
} from "discord.js";
import DiscordClient from "../../DiscordClient";
import Disqualification, {DisqualificationType} from "../../services/RaceService/types/Disqualification";

export default class DisqualifyCommand extends SlashCommandInteraction {
    public info = new SlashCommandBuilder()
        .setName("disqualify")
        .setDescription("Disqualify a racer for not attending a race")
        .addUserOption(option => option
            .setName("user")
            .setDescription("The user to disqualify")
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName("reason")
            .setDescription("The reason to disqualify the user")
            .addChoices([
                { name: "Non-graded", value: "NON_GRADED" },
                { name: "Graded", value: "GRADED" }
            ])
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName("race")
            .setDescription("The race the user got disqualified for missing")
            .setRequired(true)
        );

    async execute(interaction: ChatInputCommandInteraction, client: DiscordClient) {
        let user = interaction.options.getUser("user", true);
        let reason = interaction.options.getString("reason", true);
        let race = interaction.options.getString("race", true);

        let component = new ContainerBuilder()
            .setAccentColor(16711680)

        switch (reason) {
            case "NON_GRADED":
                await client.services.data.disqualifications.insertOne(
                    new Disqualification(user.id, 2 * 24 * 60 * 60 * 1000, `Did not attend non-graded race "${race}"`, DisqualificationType.Graded, 0)
                )
                component
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("# You have been disqualified from graded races for 2 days."),
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`Due to your failure to attend the **${race}**, or inform us of your inability or disinterest of racing in this race, **you have been made ineligible for all graded races for 2 days.**`),
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("You may attempt to join another graded race **in 2 days**, but you must turn up for any non-graded races you sign up for or you will be disqualified again."),
                    )
                break;
            case "GRADED":
                await client.services.data.disqualifications.insertOne(
                    new Disqualification(user.id, 4 * 24 * 60 * 60 * 1000, `Did not attend graded race "${race}"`, DisqualificationType.Graded, 0)
                )
                component
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("# You have been made ineligible for all graded races for 4 days."),
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`Due to your failure to attend the **${race}** graded race, or inform us of your ability or disinterest in racing in this race, **you have been made ineligible for all graded races for 4 days**.`),
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("You may attempt to join another graded race **in 4 days**, but you must turn up for any graded races you sign up for or you will be made ineligible again."),
                    )
                break;
        }

        component
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("If you believe you have a valid reason for not showing up to the race without informing us prior to it beginning, please contact a Race Staff member (someone with the Race Planner role) and explain your situation."),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("Please remember that signing up is equal to telling us that you intend to join the race, and failing to show up not only causes other racers to be confused on who is actually participating, but also delays the race as a whole."),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("If you become aware that you are unable to race, or you no longer wish to race, please contact a Race Staff member (users with the Race Planner role) and inform them of your change of circumstances. You will **not** be penalized for informing us before a race that you will not be attending."),
            );

        try {
            await user.send({
                components: [ component ],
                flags: MessageFlagsBitField.Flags.IsComponentsV2
            });

            await interaction.reply({
                content: "Successfully sent disqualification message to the user."
            });
        } catch (e) {
            console.error(`Failed to inform a user that they were disqualified: ${e.message}`);
            await interaction.reply({
                content: "Failed to DM the user. Maybe they have DMs off?",
                flags: MessageFlagsBitField.Flags.Ephemeral
            })
        }
        return;
    }
}