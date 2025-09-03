import {Client, Guild, Message} from "discord.js";
import path from "path";
import { readdirSync } from "node:fs";
import TextInteraction from "./types/TextInteraction";

export default class DiscordClient extends Client {
    public guild: Guild;
    private interactions: Interactions = {
        text: new Map()
    };

    private interactionsPath = path.join(__dirname, "interactions")

    constructor() {
        super({ intents: [ "Guilds", "GuildMessages", "MessageContent" ] });

        this.on("clientReady", async () => await this._onReady());
        this.on("messageCreate", async (message) => await this._onMessage(message))

        this.loadTextInteractions();
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

    private async _onReady() {
        this.guild = await this.guilds.fetch(process.env.GUILD_ID);
        console.log("lule");
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

    async init() {
        await this.login(process.env.DISCORD_TOKEN)
    }
}

interface Interactions {
    text: Map<string, TextInteraction>,
    //command: Map<string, >, TODO: Implement application slash commands
    //button: Map<string, > TODO: Implement button interactions
}