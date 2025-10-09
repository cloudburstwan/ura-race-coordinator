import ModalInteraction from "../../types/ModalInteraction";
import {GuildMember, MessageFlagsBitField, ModalSubmitInteraction} from "discord.js";
import DiscordClient from "../../DiscordClient";
import {RaceError} from "../../services/RaceService";

export default class JoinRaceModal extends ModalInteraction {
    public id = "race-signup";

    async execute(interaction: ModalSubmitInteraction, data: string[], client: DiscordClient): Promise<void> {
        let raceId = data[0];
        let name = interaction.fields.getField("name").value;

        try {
            await client.services.race.addRacer(raceId, interaction.member as GuildMember, name);
            await interaction.reply({
                content: "You've successfully joined the race! Congratulations!\nIf at any time you decide you cannot or do not want to participate, please press the Resign button!",
                flags: MessageFlagsBitField.Flags.Ephemeral
            });
        } catch (e) {
            if (e instanceof RaceError) {
                switch (e.code) {
                    case "RACE_NOT_FOUND":
                        await interaction.reply({
                            content: "Whoops! It seems like that race does not exist. Maybe it's already finished?",
                            flags: MessageFlagsBitField.Flags.Ephemeral
                        });
                        break;
                    case "RACE_SIGNUP_CLOSED_OR_FULL":
                        await interaction.reply({
                            content: "Sorry, but signups for this race are either closed or all available slots are already filled.",
                            flags: MessageFlagsBitField.Flags.Ephemeral
                        });
                        break;
                    case "CHARACTER_ALREADY_JOINED":
                        await interaction.reply({
                            content: "It seems like you already signed up for this race with this character!",
                            flags: MessageFlagsBitField.Flags.Ephemeral
                        });
                        break;
                    case "BAD_CHARACTER_NAME":
                        await interaction.reply({
                            content: e.rawMessage,
                            flags: MessageFlagsBitField.Flags.Ephemeral
                        });
                        break;
                    case "USER_DISQUALIFIED":
                        await interaction.reply({
                            content: "You are currently disqualified, and as a result, cannot join this race.",
                            flags: MessageFlagsBitField.Flags.Ephemeral
                        });
                        break;
                    default:
                        console.error(`Unknown type of error while attempting to add racer (${interaction.user.id}, ${name}) to race id ${data[0]}: ${e.message}`);
                        await interaction.reply({
                            content: "Something went wrong, and it's your fault. I don't know what though, so have this default error message!\n-# As you can tell, you should never receive this. If you do, let Grass Wonder know.",
                            flags: MessageFlagsBitField.Flags.Ephemeral
                        });
                }
            } else {
                console.error(`Failed to add racer (${interaction.user.id}, ${name}) to race id ${raceId} for unknown reason!`);
                console.error(e);
                await interaction.reply({
                    content: "Sorry, something unknown went wrong. Try again shortly!",
                    flags: MessageFlagsBitField.Flags.Ephemeral
                });
            }
        }
    }
}