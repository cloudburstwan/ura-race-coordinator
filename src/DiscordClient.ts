import {
    ApplicationEmoji,
    AutocompleteInteraction,
    ButtonInteraction,
    ChatInputCommandInteraction,
    Client,
    Guild,
    Interaction,
    Message, ModalSubmitInteraction,
    REST,
    Routes, Snowflake
} from "discord.js";
import path from "path";
import { readdirSync } from "node:fs";
import TextInteraction from "./types/TextInteraction";
import SlashCommandInteraction from "./types/SlashCommandInteraction";
import ButtonPressInteraction from "./types/ButtonPressInteraction";
import Services from "./services";
import ModalInteraction from "./types/ModalInteraction";
import getServices from "./services";

export default class DiscordClient extends Client {
    public config: Config;
    public guild: Guild;
    public services = getServices(this);
    private interactions: Interactions = {
        text: new Map(),
        command: new Map(),
        button: new Map(),
        modal: new Map()
    };

    private appEmojis: Map<string, ApplicationEmoji> = new Map();

    private interactionsPath = path.join(__dirname, "interactions")

    constructor(config: Config) {
        super({ intents: [ "Guilds", "GuildMessages", "MessageContent" ] });

        this.config = config;

        // @ts-ignore
        this.on("clientReady", async () => await this._onReady());
        this.on("messageCreate", async (message) => await this._onMessage(message));
        this.on("interactionCreate", async (interaction) => await this._onInteraction(interaction));
    }

    private async fetchEmotes() {
        let application = await this.application.fetch();
        let emojiCollection = await application.emojis.fetch();

        for (let emojiData of emojiCollection) {
            let emoji = emojiData[1];

            this.appEmojis.set(emoji.name, emoji);
        }
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

            this.interactions.command.set(interaction.info.toJSON().name, interaction);
            commands.push(interaction.info.toJSON());

            console.log(interaction);
        }

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        commands.forEach(async command => {
            await rest.post(Routes.applicationGuildCommands(this.user.id, this.guild.id), { body: command });
        });

        //await rest.put(Routes.applicationGuildCommands(this.user.id, this.guild.id), { body: commands });
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

    private async loadModalInteractions() {
        let dirPath = path.join(this.interactionsPath, "modal");
        let directory = readdirSync(dirPath).filter(file => file.endsWith(".js"));

        for (let file of directory) {
            const interactionImport = await import(path.join(dirPath, file));

            if (!interactionImport.default) return; // No default export.
            const interaction = new interactionImport.default as ModalInteraction;

            if (!interaction.id) return;
            if (!interaction.execute) return;

            this.interactions.modal.set(interaction.id, interaction);

            console.log(interaction);
        }
    }

    private async _onReady() {
        this.guild = await this.guilds.fetch(process.env.GUILD_ID);
        console.log("lule");

        await this.fetchEmotes();
        await this.loadTextInteractions();
        await this.loadSlashCommandInteractions();
        await this.loadButtonPressInteractions();
        await this.loadModalInteractions();
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

            let data = interaction.customId.split("/");

            if (this.interactions.button.has(data[0])) {
                await this.interactions.button.get(data[0]).execute(interaction, data.splice(1), this);
            }
        } else if (interaction.isAutocomplete()) {
            interaction = interaction as AutocompleteInteraction;

            if (this.interactions.command.has(interaction.commandName)) {
                await this.interactions.command.get(interaction.commandName).autocomplete(interaction, this);
            }
        } else if (interaction.isModalSubmit()) {
            interaction = interaction as ModalSubmitInteraction;

            let data = interaction.customId.split("/");

            if (this.interactions.modal.has(data[0])) {
                await this.interactions.modal.get(data[0]).execute(interaction, data.splice(1), this);
            }
        }
    }

    public getEmojiString(name: string) {
        let emojis: ApplicationEmoji[] = []

        this.appEmojis.forEach((emoji, emojiName) => {
            if (emojiName.startsWith(name))
                emojis.push(emoji);
        })

        if (emojis.length == 0)
            return undefined;

        let emojiStrings = emojis.map(emoji => `<:${emoji.name}:${emoji.id}>`);

        return emojiStrings.join("");
    }

    async init() {
        await this.login(process.env.DISCORD_TOKEN)
    }
}

interface Interactions {
    text: Map<string, TextInteraction>,
    command: Map<string, SlashCommandInteraction>,
    button: Map<string, ButtonPressInteraction>,
    modal: Map<string, ModalInteraction>
}

interface Config {
    channels: {
        announce: Snowflake,
        jp_announce: Snowflake,
        overseas_announce: Snowflake,
        daily_announce: Snowflake
    }
}