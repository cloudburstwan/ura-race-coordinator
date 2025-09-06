import {
    AutocompleteInteraction,
    ButtonInteraction,
    ChatInputCommandInteraction,
    Client,
    Guild,
    Interaction,
    Message,
    REST,
    Routes,
    SlashCommandBuilder
} from "discord.js";
import path from "path";
import { readdirSync } from "node:fs";
import TextInteraction from "./types/TextInteraction";
import SlashCommandInteraction from "./types/SlashCommandInteraction";
import ButtonPressInteraction from "./types/ButtonPressInteraction";

export default class DiscordClient extends Client {
    public guild: Guild;
    private interactions: Interactions = {
        text: new Map(),
        command: new Map(),
        button: new Map()
    };

    private interactionsPath = path.join(__dirname, "interactions")

    constructor() {
        super({ intents: [ "Guilds", "GuildMessages", "MessageContent" ] });

        this.on("clientReady", async () => await this._onReady());
        this.on("messageCreate", async (message) => await this._onMessage(message));
        this.on("interactionCreate", async (interaction) => await this._onInteraction(interaction));
    }

    private async loadTextInteractions() {
        // TODO: Load text-based interactions here
        let textDirPath = path.join(this.interactionsPath, "text");
        let textDirectory = readdirSync(textDirPath).filter(file => file.endsWith(".js"));

        for (let file of textDirectory) {
            const interactionImport = await import(path.join(textDirPath, file));

            if (!interactionImport.default) return; // No default export.
            const interaction = new interactionImport.default as TextInteraction;

            if (!interaction.info) return;
            if (!interaction.execute) return;

            this.interactions.text.set(interaction.info.name, interaction);

            console.log(interaction);
        }
    }

    private async loadSlashCommandInteractions() {
        let dirPath = path.join(this.interactionsPath, "command");
        let directory = readdirSync(dirPath).filter(file => file.endsWith(".js"));

        let commands = [];

        for (let file of directory) {
            const interactionImport = await import(path.join(dirPath, file));

            if (!interactionImport.default) return; // No default export.
            const interaction = new interactionImport.default as SlashCommandInteraction;

            if (!interaction.info) return;
            if (!interaction.execute) return;

            this.interactions.command.set(interaction.info.name, interaction);
            commands.push(interaction.info.toJSON());

            console.log(interaction);
        }

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        await rest.put(Routes.applicationGuildCommands(this.user.id, this.guild.id), { body: commands });
    }

    private async loadButtonPressInteractions() {
        let dirPath = path.join(this.interactionsPath, "button");
        let directory = readdirSync(dirPath).filter(file => file.endsWith(".js"));

        for (let file of directory) {
            const interactionImport = await import(path.join(dirPath, file));

            if (!interactionImport.default) return; // No default export.
            const interaction = new interactionImport.default as ButtonPressInteraction;

            if (!interaction.id) return;
            if (!interaction.execute) return;

            this.interactions.button.set(interaction.id, interaction);

            console.log(interaction);
        }
    }

    private async _onReady() {
        this.guild = await this.guilds.fetch(process.env.GUILD_ID);
        console.log("lule");

        await this.loadTextInteractions();
        await this.loadSlashCommandInteractions();
    }

    private async _onMessage(message: Message) {
        if (message.guildId != this.guild.id) return;

        for (let textInteraction of this.interactions.text.values()) {
            textInteraction.info.match.lastIndex = 0;
            if (textInteraction.info.match.test(message.content)) {
                // Match!
                textInteraction.info.match.lastIndex = 0;
                let match = textInteraction.info.match.exec(message.content)

                if (!message.member.roles.cache.hasAny(...textInteraction.info.rolesRequired)) return;

                await textInteraction.execute(message, match, this);
            }
        }
    }

    private async _onInteraction(interaction: Interaction) {
        if (interaction.isChatInputCommand()) {
            interaction = interaction as ChatInputCommandInteraction;

            if (this.interactions.command.has(interaction.commandName)) {
                await this.interactions.command.get(interaction.commandName).execute(interaction, this);
            }
        } else if (interaction.isButton()) {
            interaction = interaction as ButtonInteraction;

            if (this.interactions.button.has(interaction.id)) {
                await this.interactions.button.get(interaction.id).execute(interaction, this);
            }
        } else if (interaction.isAutocomplete()) {
            interaction = interaction as AutocompleteInteraction;

            if (this.interactions.command.has(interaction.commandName)) {
                await this.interactions.command.get(interaction.commandName).autocomplete(interaction, this);
            }
        }
    }

    async init() {
        await this.login(process.env.DISCORD_TOKEN)
    }
}

interface Interactions {
    text: Map<string, TextInteraction>,
    command: Map<string, SlashCommandInteraction>,
    button: Map<string, ButtonPressInteraction>
}