// TODO: Base text interaction from which all text-based commands are built from

import {
    AutocompleteInteraction, ChatInputCommandInteraction,
    CommandInteraction, MessageFlagsBitField,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder
} from "discord.js";
import DiscordClient from "../DiscordClient";
import SubcommandInteraction from "./SubcommandInteraction";
import {readdirSync} from "node:fs";
import path from "path";
import SlashCommandInteraction from "./SlashCommandInteraction";

export default class SlashCommandWithSubcommandsInteraction {
    public info: SlashCommandSubcommandsOnlyBuilder;
    private commands: Map<string, SubcommandInteraction> = new Map();

    public async loadSubcommands(filePath: string) {
        console.log(filePath);
        let subcommands = readdirSync(path.join(filePath, "subcommands")).filter(file => file.endsWith(".js"));

        for (let file of subcommands) {
            let subcommandInput = await import(path.join(filePath, "subcommands", file));

            if (!subcommandInput.default) return; // No default export.
            const subcommand = new subcommandInput.default as SubcommandInteraction;

            if (!subcommand.info) return;
            if (!subcommand.execute) return;

            this.commands.set(subcommand.info.toJSON().name, subcommand);

            this.info.addSubcommand(subcommand.info);
        }
    }

    public async execute(interaction: ChatInputCommandInteraction, client: DiscordClient) {
        let subcommandStr = interaction.options.getSubcommand();

        let subcommand = this.commands.get(subcommandStr);
        if (subcommand)
            await subcommand.execute(interaction, client);
        else
            await interaction.reply({
                content: "Unknown subcommand. Something went wrong. Go yell at Grass Wonder or something idk",
                flags: MessageFlagsBitField.Flags.Ephemeral
            });
    }

    public async autocomplete(interaction: AutocompleteInteraction, client: DiscordClient) {
        let subcommandStr = interaction.options.getSubcommand();

        let subcommand = this.commands.get(subcommandStr);
        if (subcommand)
            await subcommand.autocomplete(interaction, client);
        else
            await interaction.respond([]);
    }
}