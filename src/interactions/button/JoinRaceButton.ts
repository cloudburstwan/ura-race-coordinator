import ModalInteraction from "../../types/ModalInteraction";
import {
    ActionRowBuilder,
    ButtonInteraction, MessageActionRowComponentBuilder, MessageFlagsBitField,
    ModalActionRowComponentBuilder,
    ModalBuilder,
    StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle
} from "discord.js";
import DiscordClient from "../../DiscordClient";
import Character from "../../services/RaceService/types/Character";
import ButtonPressInteraction from "../../types/ButtonPressInteraction";
import {getRandomUma} from "../../utils";

export default class JoinRaceButton extends ButtonPressInteraction {
    public id = "race-signup";

    async execute(interaction: ButtonInteraction, data: string[], client: DiscordClient): Promise<void> {
        //const characters = (await client.services.data.characters.find({ memberId: interaction.user.id }).toArray()).map(character => Character.fromDB(character))
        const race = (await client.services.race.getRaces()).find(race => race._id.toString() == data[0]);

        if (!race) {
            await interaction.reply({
                content: "Whoops! It seems like that race does not exist. Maybe it's already finished?",
                flags: MessageFlagsBitField.Flags.Ephemeral
            });
            return;
        }

        /*const modalSelectData = {
            type: 3,
            custom_id: "racer-select",
            placeholder: "Choose who you will race as...",
            options: characters.map(character => {
                return {
                    label: character.name,
                    value: character._id,
                    description: character.name
                }
            })
        }

        const modal = {
            customId: `join-race-modal/${data[0]}`,
            title: "Joining Race",
            components: [ {
                type: 18,
                label: "Who will you race as?",
                description: "Choose the character you will race as in the race.",
                component: modalSelectData
            } ]
        }*/

        const modal = new ModalBuilder()
            .setCustomId(`race-signup/${data[0]}`)
            .setTitle("Joining Race");

        let umaNamePlaceholder = getRandomUma();

        if (race.flag == "URARA_MEMORIAM")
            umaNamePlaceholder = "Haru Urara";

        const nameInput = new TextInputBuilder()
            .setCustomId("name")
            .setRequired(true)
            .setLabel("Who will you race as?")
            .setStyle(TextInputStyle.Short)
            .setMinLength(1)
            .setMaxLength(30)
            .setPlaceholder(umaNamePlaceholder)

        modal.addComponents(new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(nameInput));

        // @ts-ignore
        await interaction.showModal(modal);
    }
}