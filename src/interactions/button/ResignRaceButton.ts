import ModalInteraction from "../../types/ModalInteraction";
import {
    ActionRowBuilder,
    ButtonInteraction, GuildMember, MessageActionRowComponentBuilder, MessageFlagsBitField,
    ModalActionRowComponentBuilder,
    ModalBuilder,
    StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle
} from "discord.js";
import DiscordClient from "../../DiscordClient";
import Character from "../../services/RaceService/types/Character";
import ButtonPressInteraction from "../../types/ButtonPressInteraction";
import {getRandomUma} from "../../utils";
import {RaceError} from "../../services/RaceService";

export default class RaceResignButton extends ButtonPressInteraction {
    public id = "race-resign";

    async execute(interaction: ButtonInteraction, data: string[], client: DiscordClient): Promise<void> {
        try {
            await client.services.race.removeRacer(data[0], interaction.user.id);
            await interaction.reply({
                content: "Successfully resigned from the race.\nIf you wish to rejoin, just press the Join Race button again!",
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
                    case "RACE_IN_PROGRESS_OR_OVER":
                        await interaction.reply({
                            content: "Sorry, but you cannot sign up for the race if it is ongoing or finished.",
                            flags: MessageFlagsBitField.Flags.Ephemeral
                        });
                        break;
                    case "MEMBER_NOT_JOINED":
                        await interaction.reply({
                            content: "You haven't joined this race. You can't resign from a race you haven't joined, silly!",
                            flags: MessageFlagsBitField.Flags.Ephemeral
                        });
                        break;
                    default:
                        console.error(`Unknown type of error while attempting to remove member id ${interaction.user.id} from race id ${data[0]}: ${e.message}`);
                        await interaction.reply({
                            content: "Something went wrong, and it's your fault. I don't know what though, so have this default error message!\n-# As you can tell, you should never receive this. If you do, let Grass Wonder know.",
                            flags: MessageFlagsBitField.Flags.Ephemeral
                        });
                }
            } else {
                console.error(`Failed to remove member id ${interaction.user.id} from race id ${data[0]} for unknown reason!`)
                console.error(e);
                await interaction.reply({
                    content: "Sorry, something unknown went wrong. Try again shortly!",
                    flags: MessageFlagsBitField.Flags.Ephemeral
                });
            }
        }
    }
}