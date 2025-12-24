import TextInteraction, {TextCommandBuilder} from "../../types/TextInteraction";
import {Message} from "discord.js";
import DiscordClient from "../../DiscordClient";
import {RacerMood} from "../../services/RaceService/types/Racer";

const nonGradedRacerListRegex = /(.+)/g;
const gradedRacerListRegex = /(.+) ?- ?(\d+)/g

export default class ResultsCommand extends TextInteraction {
    public info = new TextCommandBuilder()
        .setName("joinRace")
        .setRegexMatch(/!joinRace (.+)/g)
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
            await race.addRacer(ids[2] ? (await message.guild.members.fetch(ids[1])).user.id : message.member.user.id, ids.splice(ids[2] ? 2 : 1).join(" "), client, true);
            await message.react("✅");
        } catch (e) {
            await message.react("❌");
            await message.reply(`\`${typeof e}: ${e.message}\``);
        }
    }
}
