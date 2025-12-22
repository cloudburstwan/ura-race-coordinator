import TextInteraction, {TextCommandBuilder} from "../../types/TextInteraction";
import {Message} from "discord.js";
import DiscordClient from "../../DiscordClient";

export default class ResultsCommand extends TextInteraction {
    public info = new TextCommandBuilder()
        .setName("forceRefreshSignup")
        .setRegexMatch(/!forceRefreshSignup (.+)/g)
        .addRole(process.env.RACE_STAFF_ROLE_ID);

    override async execute(message: Message, regexMatch: RegExpExecArray, client: DiscordClient) {
        let ids = regexMatch[1].split(" ");

        try {
            let race = client.services.race.races.find(race => race._id.toString("hex") == ids[0]);

            if (race == undefined) throw new ReferenceError("Race not found.");

            await client.services.race.updateRaceMessage(race, client, false, ids[1] == "1");
            await message.react("✅");
        } catch (e) {
            await message.react("❌");
            await message.reply(`\`${typeof e}: ${e.message}\``);
        }
    }
}
