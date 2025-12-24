import TextInteraction, {TextCommandBuilder} from "../../types/TextInteraction";
import {Message} from "discord.js";
import DiscordClient from "../../DiscordClient";
import {RacerMood} from "../../services/RaceService/types/Racer";

const nonGradedRacerListRegex = /(.+)/g;
const gradedRacerListRegex = /(.+) ?- ?(\d+)/g

export default class ResultsCommand extends TextInteraction {
    public info = new TextCommandBuilder()
        .setName("leaveRace")
        .setRegexMatch(/!leaveRace (.+)/g)
        .addRole(process.env.RACE_STAFF_ROLE_ID);

    override async execute(message: Message, regexMatch: RegExpExecArray, client: DiscordClient) {
        let ids = regexMatch[1].split(" ");

        const race = await client.services.race.get(ids[0]);

        if (!race) {
            await message.react("❌")
            await message.reply("race not exists");
            return;
        }

        try {
            await race.removeRacer(ids[1] ? ids[1] : message.member.id, client, true);
            await message.react("✅");
        } catch (e) {
            await message.react("❌");
            await message.reply(`\`${typeof e}: ${e.message}\``);
        }
    }
}
