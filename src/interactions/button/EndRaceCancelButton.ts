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
import {RaceType} from "../../services/RaceService/types/Race";
import createRaceEndMissingRacersComponent from "../../components/RaceEndMissingRacersComponent";

export default class RaceResignButton extends ButtonPressInteraction {
    public id = "end-race-no";

    async execute(interaction: ButtonInteraction, data: string[], client: DiscordClient): Promise<void> {
        let race = await client.services.race.get(data[0]);

        if (!race) {
            await interaction.reply({
                content: "Whoops! It seems like that race does not exist. Maybe it got destroyed?",
                flags: MessageFlagsBitField.Flags.Ephemeral
            });
            return;
        }

        await interaction.message.edit({
            components: [await createRaceEndMissingRacersComponent(race, client, true)],
            flags: MessageFlagsBitField.Flags.IsComponentsV2,
        });

        await interaction.reply({
            content: "Cancelled the race end.",
            flags: MessageFlagsBitField.Flags.Ephemeral,
        });
    }
}