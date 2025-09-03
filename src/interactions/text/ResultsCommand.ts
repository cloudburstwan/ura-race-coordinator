import TextInteraction, {TextCommandBuilder} from "../../types/TextInteraction";
import {Message} from "discord.js";
import DiscordClient from "../../DiscordClient";

const racerListRegex = /(.+)/g;

export default class ResultsCommand extends TextInteraction {
    public info = new TextCommandBuilder()
        .setName("results")
        .setRegexMatch(/!results/g)
        .addRole(process.env.RACE_STAFF_ROLE_ID);

    override async execute(message: Message, regexMatch: RegExpExecArray, client: DiscordClient) {
        if (!message.reference) {
            await message.reply("You didn't reply to a message. Please reply to a message containing a list of racers and their rolled numbers");
            return;
        }

        let referencedMessage = await message.fetchReference();


        if (!referencedMessage.content.split("\n").every(line => {
            racerListRegex.lastIndex = 0;
            return racerListRegex.test(line)
        })) {
            await message.reply("The message you replied to doesn't look like a list of racers and their rolled numbers. Please try again!");
            return;
        }

        let racers = referencedMessage.content.split("\n").map(line => {
            racerListRegex.lastIndex = 0;
            let match = racerListRegex.exec(line);

            return {
                name: match[1].trim(),
                numbers: [Math.floor(Math.random() * 100) + 1, Math.floor(Math.random() * 100) + 1]
            };
        }).sort(() => Math.floor(Math.random() * 2) == 1 ? -1 : 1);

        let results = racers.map(racer => {
            return Object.assign({
                difference: Math.abs(racer.numbers[0] - racer.numbers[1])
            }, racer);
        }).sort((a, b) => a.difference < b.difference ? -1 : 1);

        let response = [];
        let offset = -1;
        for (let place in results) {
            let index = parseInt(place);
            let distanceMarker = "";
            if (index >= 1 && results[index-1].numbers[0] == results[index].numbers[0] && results[index-1].numbers[1] == results[index].numbers[1]) {
                // Dead heat
                offset++;
                distanceMarker = "DEAD HEAT"
            } else if (index >= 1) {
                switch (Math.abs(results[index].difference - results[index-1].difference)) {
                    case 0:
                        distanceMarker = "PHOTO";
                        break;
                    case 1:
                        distanceMarker = "NOSE";
                        break;
                    case 2:
                        distanceMarker = "HEAD";
                        break;
                    case 3:
                    case 4:
                        distanceMarker = "NECK"
                        break;
                    default:
                        distanceMarker = `${roundToQuarter((results[index].difference - results[index-1].difference) / 10)}L`;
                }
            }
            response.push(`**${index-offset}${numberSuffix(index-offset)}**: ${results[index].name} (**numbers:** [${results[index].numbers.join(", ")}], **diff:** ${results[index].difference}) ${index >= 1 ? `**margin diff:** ${Math.min(50, results[index].difference - results[index-1].difference) / 10}L **margin:** ${distanceMarker}` : ""}`);
        }

        await message.reply(response.join("\n"));
    }
}

function numberSuffix(number: number) {
    if (number.toString().endsWith("1") && !number.toString().endsWith("11"))
        return "st";
    if (number.toString().endsWith("2") && !number.toString().endsWith("12"))
        return "nd";
    if (number.toString().endsWith("3") && !number.toString().endsWith("13"))
        return "rd";
    return "th";
}

function roundToQuarter(number: number): number {
    return Math.round(number*4)/4;
}