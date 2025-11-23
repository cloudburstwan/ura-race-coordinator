import TextInteraction, {TextCommandBuilder} from "../../types/TextInteraction";
import {Message} from "discord.js";
import DiscordClient from "../../DiscordClient";
import {RacerMood} from "../../services/RaceService/types/Racer";
import {generateUmamusumeName} from "../../utils/umaNameGenerator";

const nonGradedRacerListRegex = /(.+)/g;
const gradedRacerListRegex = /(.+) ?- ?(\d+)/g

export default class GenerateUmamusumeNameCommand extends TextInteraction {
    public info = new TextCommandBuilder()
        .setName("generateUmamusumeName")
        .setRegexMatch(/!generateUmamusumeNames? ?(\d*)/g)
        .addRole(process.env.RACE_STAFF_ROLE_ID);

    override async execute(message: Message, regexMatch: RegExpExecArray, client: DiscordClient) {
        let amount = isNaN(parseInt(regexMatch[1])) ? 1 : parseInt(regexMatch[1]);
        let output: string[] = [];

        for (let i = 0; i<amount; i++) {
            output.push(generateUmamusumeName());
        }

        await message.reply(output.join(", "));
    }
}
