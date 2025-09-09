import {
    ModalSubmitInteraction
} from "discord.js";
import DiscordClient from "../DiscordClient";

export default class ModalInteraction {
    public id: string;

    public async execute(interaction: ModalSubmitInteraction, data: string[], client: DiscordClient) {
        await interaction.reply("No response configured for this interaction");

        return;
    }
}