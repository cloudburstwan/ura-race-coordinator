import TextInteraction, {TextCommandBuilder} from "../../types/TextInteraction";
import {Message, TextChannel} from "discord.js";
import DiscordClient from "../../DiscordClient";
import {RacerMood} from "../../services/RaceService/types/Racer";
import {calculateGradedScore, numberSuffix, randomInt, rollXTimes, roundToQuarter} from "../../utils";

const nonGradedRacerListRegex = /(.+)/g;
const gradedRacerListRegex = /(.+) ?- ?(\d+)/g

export default class ResultsCommand extends TextInteraction {
    public info = new TextCommandBuilder()
        .setName("results")
        .setRegexMatch(/!results (.+)/g)
        .addRole(process.env.RACE_STAFF_ROLE_ID);

    override async execute(message: Message, regexMatch: RegExpExecArray, client: DiscordClient) {
        if (!message.reference) {
            await message.reply("You didn't reply to a message. Please reply to a message containing a list of racers and their rolled numbers");
            return;
        }

        let referencedMessage = await message.fetchReference();

        let mode = regexMatch[1];

        if (mode == "none") {
            if (!referencedMessage.content.split("\n").every(line => {
                nonGradedRacerListRegex.lastIndex = 0;
                return nonGradedRacerListRegex.test(line)
            })) {
                await message.reply("The message you replied to doesn't look like a list of racers. Please try again!");
                return;
            }

            let racers = referencedMessage.content.split("\n").map(line => {
                nonGradedRacerListRegex.lastIndex = 0;
                let match = nonGradedRacerListRegex.exec(line);

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
                if (index >= 1 && results[index - 1].numbers[0] == results[index].numbers[0] && results[index - 1].numbers[1] == results[index].numbers[1]) {
                    // Dead heat
                    offset++;
                    distanceMarker = "DEAD HEAT"
                } else if (index >= 1) {
                    switch (Math.abs(results[index].difference - results[index - 1].difference)) {
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
                            distanceMarker = `${roundToQuarter((results[index].difference - results[index - 1].difference) / 10)}L`;
                    }
                }
                response.push(`**${index - offset}${numberSuffix(index - offset)}**: ${results[index].name} (**numbers:** [${results[index].numbers.join(", ")}], **diff:** ${results[index].difference}) ${index >= 1 ? `**margin diff:** ${Math.min(50, results[index].difference - results[index - 1].difference) / 10}L **margin:** ${distanceMarker}` : ""}`);
            }

            await message.reply(response.join("\n"));
        } else if (["graded"].includes(mode)) {
            // TODO: Graded mode
            if (!referencedMessage.content.split("\n").every(line => {
                gradedRacerListRegex.lastIndex = 0;
                return gradedRacerListRegex.test(line)
            })) {
                await message.reply("The message you replied to doesn't look like a list of racers and the amount of skills they've used. Please try again!");
                return;
            }

            let racers = referencedMessage.content.split("\n").map(line => {
                gradedRacerListRegex.lastIndex = 0;
                let match = gradedRacerListRegex.exec(line);

                let moodRandom = randomInt(1, 20);
                let mood: RacerMood = RacerMood.Normal;
                if (moodRandom <= 4) mood = RacerMood.Awful; else
                if (moodRandom <= 8) mood = RacerMood.Bad; else
                if (moodRandom <= 12) mood = RacerMood.Normal; else
                if (moodRandom <= 16) mood = RacerMood.Good; else
                if (moodRandom <= 20) mood = RacerMood.Great;

                let stages: number[] = [];

                for (let i = 0; i < 4; i++) {
                    stages.push(randomInt(8, 10) + randomInt(8, 10));
                }

                let baseScore = 0;
                for (let value of stages) {
                    baseScore += value;
                }

                let skillsUsed = parseInt(match[2].trim());
                let skillBonus = skillsUsed == 0 ? 0 : calculateGradedScore(Array.from({ length: skillsUsed }, () => randomInt(1, 20)));

                let moodPercentageModifier = 0.02;

                let moodPercentage = moodPercentageModifier * mood;

                let scoreModifier = (baseScore + skillBonus) * moodPercentage;
                let score = (baseScore + skillBonus) + scoreModifier;

                return {
                    name: match[1].trim(),
                    baseScore,
                    mood,
                    moodPercentage,
                    skillsUsed,
                    skillBonus,
                    stages,
                    scoreModifier,
                    score: Math.round(score * 10) / 10
                };
            }).sort(() => Math.floor(Math.random() * 2) == 1 ? -1 : 1);

            let results = racers.sort((a, b) => a.score > b.score ? -1 : 1);

            let response = [];
            let offset = -1;
            for (let place in results) {
                let index = parseInt(place);
                let distanceMarker = "";
                if (index >= 1 && results[index - 1].score == results[index].score) {
                    // Dead heat
                    offset++;
                    distanceMarker = "DEAD HEAT"
                } else if (index >= 1) {
                    switch (Math.abs(results[index].score - results[index - 1].score)) {
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
                            distanceMarker = `${roundToQuarter(Math.abs(results[index].score - results[index - 1].score) / 10)}L`;
                    }
                }
                let moodName = "";
                switch (results[index].mood) {
                    case RacerMood.Awful:
                        moodName = "AWFUL";
                        break;
                    case RacerMood.Bad:
                        moodName = "BAD";
                        break;
                    case RacerMood.Normal:
                        moodName = "NORMAL";
                        break;
                    case RacerMood.Good:
                        moodName = "GOOD";
                        break;
                    case RacerMood.Great:
                        moodName = "GREAT";
                        break;
                    default:
                        moodName = "UNKNOWN";
                }

                //response.push(`**${index - offset}${numberSuffix(index - offset)}**: ${results[index].name} [${moodName}] (**stages:** [${results[index].stages.join(", ")}], **score:** ${results[index].score}) ${index >= 1 ? `**margin diff:** ${Math.min(50, Math.abs(results[index].score - results[index - 1].score)) / 10}L **margin:** ${distanceMarker}` : ""}`);
                response.push(`**${index - offset}${numberSuffix(index - offset)}**: ${results[index].name} [${moodName}] (**stages:** [${results[index].stages.join(", ")}], **skill modifier:** ${Math.floor(results[index].skillBonus * 100000) / 100000} (used ${results[index].skillsUsed}), **score:** ${Math.floor(results[index].score * 100000) / 100000})`);
            }

            if (response.join("\n").length > 2000) {
                let chunks: string[][] = [];
                let current: string[] = [];

                let chunkSizeMax = 10;
                response.forEach(entry => {
                    if (current.length == chunkSizeMax) {
                        console.log("chunk done!");
                        chunks.push(current);
                        current = [];
                    }

                    current.push(entry);
                });

                chunks.push(current);

                let first = true;
                for (let msgChunk of chunks) {
                    if (first) {
                        await message.reply(msgChunk.join("\n"));
                        first = false;
                    } else
                        await (message.channel as TextChannel).send(msgChunk.join("\n"));
                }
            } else
                await message.reply(response.join("\n"));
        } else {
            await message.reply(`Unknown mode: "${mode}". Valid modes are: "none", "graded"`);
        }
    }
}