import TextInteraction, {TextCommandBuilder} from "../../types/TextInteraction";
import {Message} from "discord.js";
import DiscordClient from "../../DiscordClient";
import {RacerMood} from "../../services/RaceService/types/Racer";

export default class DumpConfigCommand extends TextInteraction {
    public info = new TextCommandBuilder()
        .setName("joinRace")
        .setRegexMatch(/!joinRace (.+)/g)
        .addRole(process.env.RACE_STAFF_ROLE_ID);

    override async execute(message: Message, regexMatch: RegExpExecArray, client: DiscordClient) {
        await message.reply(`Config dump taken at <t:${Math.floor(Date.now()/1000)}:F>\n\`\`\`json\n${JSON.stringify(client.config, null, 2)}\n\`\`\``);
    }
}
