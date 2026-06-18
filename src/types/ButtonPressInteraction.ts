import {
    ButtonInteraction
} from "discord.js";
import DiscordClient from "../DiscordClient";

export default class ButtonPressInteraction {
    public id: string = "";

    public async execute(interaction: ButtonInteraction, data: string[], client: DiscordClient) {
        await interaction.reply("No response configured for this interaction");
        return;
    }
}