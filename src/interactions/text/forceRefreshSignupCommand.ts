import TextInteraction, {TextCommandBuilder} from "../../types/TextInteraction";
import {Message} from "discord.js";
import DiscordClient from "../../DiscordClient";
import {RaceStatus} from "../../services/RaceService/types/Race";

export default class ResultsCommand extends TextInteraction {
    public info = new TextCommandBuilder()
        .setName("forceRefreshRaceMessages")
        .setRegexMatch(/!forceRefreshRaceMessages (.+)/g)
        .addRole(process.env.RACE_STAFF_ROLE_ID);

    override async execute(message: Message, regexMatch: RegExpExecArray, client: DiscordClient) {
        let ids = regexMatch[1].split(" ");

        try {
            let race = (await client.services.race.getRaces()).find(race => race._id.toString("hex") == ids[0]);

            if (race == undefined) throw new ReferenceError("Race not found.");

            await race.updateRaceSignupMessage(client, false, ids[1] == "1");
            if (![RaceStatus.SignupOpen, RaceStatus.SignupClosed].includes(race.status))
                await race.updateRaceStartMessage(client);
            await message.react("✅");
        } catch (e) {
            await message.react("❌");
            await message.reply(`\`${typeof e}: ${e.message}\``);
        }
    }
}
