import {
    SlashCommandBuilder
} from "discord.js";
import SlashCommandWithSubcommandsInteraction from "../../../types/SlashCommandWithSubcommandsInteraction";

export default class RaceCommand extends SlashCommandWithSubcommandsInteraction {
    public info = new SlashCommandBuilder()
        .setName("race")
        .setDescription("Manage races")
}