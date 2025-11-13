import TextInteraction, {TextCommandBuilder} from "../../types/TextInteraction";
import {Message} from "discord.js";
import DiscordClient from "../../DiscordClient";
import {RacerMood} from "../../services/RaceService/types/Racer";
import {numberSuffix, randomInt} from "../../utils";

const racerListRegex = /\[#?(R|\d+)] +(.+) +(-2|-1|0|1|2|R) +(\d+|R)/g

export default class GeneratePreRaceInfoCommand extends TextInteraction {
    public info = new TextCommandBuilder()
        .setName("generatePreRaceInfo")
        .setRegexMatch(/!generatePreRaceInfo ?(\d+)?/gi)
        .addRole(process.env.RACE_STAFF_ROLE_ID);

    override async execute(message: Message, regexMatch: RegExpExecArray, client: DiscordClient) {
        if (!message.reference && regexMatch[1] == undefined) {
            await message.reply("You didn't reply to a message or provide a message ID. Please reply or provide the id to a message containing a valid racer list");
            return;
        }

        let referencedMessage:Message;
        if (regexMatch[2] != undefined)
            referencedMessage = await message.channel.messages.fetch(regexMatch[2]);
        else
            referencedMessage = await message.fetchReference();

        if (referencedMessage == null) {
            await message.reply("invalid message");
            return;
        }

        if (!referencedMessage.content.split("\n").every(line => {
            racerListRegex.lastIndex = 0;
            return racerListRegex.test(line)
        })) {
            await message.reply("The message you replied to doesn't look like a list of racers. Please try again!");
            return;
        }

        let takenGates: number[] = [];
        let takenFavorites: number[] = [];

        referencedMessage.content.split("\n").forEach(line => {
            racerListRegex.lastIndex = 0;
            let match = racerListRegex.exec(line);

            if (match[1] != "R") {
                // Assigned gate number, add it to takenGates
                takenGates.push(parseInt(match[1]));
            }

            if (match[4] != "R") {
                // Assigned favorite position, add it to takenFavorites
                takenFavorites.push(parseInt(match[4]));
            }
        });

        let output = referencedMessage.content.split("\n").map(line => {
            racerListRegex.lastIndex = 0;
            let match = racerListRegex.exec(line);

            let gate = match[1] == "R" ? undefined : parseInt(match[1]);
            let name = match[2];
            let mood: RacerMood | undefined = match[3] == "R" ? undefined : parseInt(match[3]);
            let favorite = match[4] == "R" ? undefined : parseInt(match[4]);

            if (gate == undefined) {
                // Generate gate using available positions.
                let availableGates = []
                for (let i = 0; i < referencedMessage.content.split("\n").length; i++) {
                    if (!takenGates.includes(i+1))
                        availableGates.push(i+1);
                }

                gate = availableGates[Math.floor(Math.random() * availableGates.length)];
                takenGates.push(gate);
            }

            if (mood == undefined) {
                let moodRandom = randomInt(1, 20);
                if (moodRandom <= 4) mood = RacerMood.Awful; else
                if (moodRandom <= 8) mood = RacerMood.Bad; else
                if (moodRandom <= 12) mood = RacerMood.Normal; else
                if (moodRandom <= 16) mood = RacerMood.Good; else
                if (moodRandom <= 20) mood = RacerMood.Great;
            }

            if (favorite == undefined) {
                // Generate gate using available positions.
                let availableFavorites = []
                for (let i = 0; i < referencedMessage.content.split("\n").length; i++) {
                    if (!takenFavorites.includes(i+1))
                        availableFavorites.push(i+1);
                }

                favorite = availableFavorites[Math.floor(Math.random() * availableFavorites.length)];
                takenFavorites.push(favorite);
            }

            let moodEmote = "";
            switch (mood) {
                case RacerMood.Awful:
                    moodEmote = client.getEmojiString("mood_awful_large");
                    break;
                case RacerMood.Bad:
                    moodEmote = client.getEmojiString("mood_bad_large");
                    break;
                case RacerMood.Normal:
                    moodEmote = client.getEmojiString("mood_normal_large");
                    break;
                case RacerMood.Good:
                    moodEmote = client.getEmojiString("mood_good_large");
                    break;
                case RacerMood.Great:
                    moodEmote = client.getEmojiString("mood_great_large");
                    break;
            }

            return {
                gate,
                str: `[#${gate}] \*\*${name}\*\* ${moodEmote} [${favorite <= 3 ? "\*\*" : ""}${favorite}${numberSuffix(favorite)} favorite${favorite <= 3 ? "\*\*" : ""}]`
            }
        });

        await message.reply(output.sort((obj1, obj2) => obj1.gate < obj2.gate ? -1 : 1).map(obj => obj.str).join("\n"));
    }
}

