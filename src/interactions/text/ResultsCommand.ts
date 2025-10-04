import TextInteraction, {TextCommandBuilder} from "../../types/TextInteraction";
import {AttachmentBuilder, Message, TextChannel} from "discord.js";
import DiscordClient from "../../DiscordClient";
import {RacerMood} from "../../services/RaceService/types/Racer";
import {calculateSkillBonus, numberSuffix, randomInt, roundToQuarter} from "../../utils";
import {
    DistanceType,
    MarginType,
    RaceType,
    SurfaceType,
    TrackConditionType
} from "../../services/RaceService/types/Race";
import ImageService, {ScoreStatus} from "../../services/ImageService";

const nonGradedRacerListRegex = /\[#(\d+)] ?(.+)/g;
const gradedRacerListRegex = /\[#(\d+)] ?(.+) ?\[(-?\d)] ? - ?([ID]A?) ?- ?(\d+)/g

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
                    gate: parseInt(match[1].trim()),
                    name: match[2].trim(),
                    numbers: [Math.floor(Math.random() * 100) + 1, Math.floor(Math.random() * 100) + 1]
                };
            }).sort(() => Math.floor(Math.random() * 2) == 1 ? -1 : 1);

            let results = racers.map(racer => {
                return Object.assign({
                    difference: Math.abs(racer.numbers[0] - racer.numbers[1])
                }, racer);
            }).sort((a, b) => a.difference < b.difference ? -1 : 1);

            let positions = [];
            let placements = [];
            let margins = [];

            let response = [];
            let offset = -1;
            for (let place in results) {
                let index = parseInt(place);
                let distanceMarker = "";
                if (index >= 1 && results[index - 1].numbers[0] == results[index].numbers[0] && results[index - 1].numbers[1] == results[index].numbers[1]) {
                    // Dead heat
                    offset++;
                    distanceMarker = "DEAD HEAT"
                    margins.push({ type: MarginType.DeadHeat, value: 0 });
                } else if (index >= 1) {
                    switch (Math.abs(results[index].difference - results[index - 1].difference)) {
                        case 0:
                        case 1:
                            distanceMarker = "NOSE";
                            margins.push({ type: MarginType.Nose, value: 0.1 });
                            break;
                        case 2:
                            distanceMarker = "HEAD";
                            margins.push({ type: MarginType.Head, value: 0.2 });
                            break;
                        case 3:
                        case 4:
                            distanceMarker = "NECK"
                            margins.push({ type: MarginType.Neck, value: 0.3 });
                            break;
                        default:
                            let value = roundToQuarter((results[index].difference - results[index - 1].difference) / 10)
                            distanceMarker = `${value}L`;
                            if (value < 10)
                                margins.push({ type: MarginType.Number, value });
                            else
                                margins.push({ type: MarginType.Distance, value });
                    }
                }

                positions.push(index - offset);
                placements.push(results[index].gate);

                response.push(`**${index - offset}${numberSuffix(index - offset)}**: ${results[index].name} (**numbers:** [${results[index].numbers.join(", ")}], **diff:** ${results[index].difference}) ${index >= 1 ? `**margin diff:** ${Math.min(50, results[index].difference - results[index - 1].difference) / 10}L **margin:** ${distanceMarker}` : ""}`);
            }

            let image = await ImageService.drawScoreboard(RaceType.GradedDomestic, ScoreStatus.Final, DistanceType.Medium, positions, placements, margins, { turf: TrackConditionType.Good, dirt: TrackConditionType.Good });

            await message.reply({
                content: response.join("\n"),
                files: [ new AttachmentBuilder(image).setName("scoreboard.png") ]
            });
        } else if (["graded"].includes(mode)) {
            // TODO: Graded mode
            let raceId = "";
            if (!referencedMessage.content.split("\n").every(line => {
                gradedRacerListRegex.lastIndex = 0;

                if (line.startsWith("-# Race ID: ")) {
                    raceId = line.replace("-# Race ID: ", "");
                    return true;
                } else {
                    return gradedRacerListRegex.test(line);
                }
            })) {
                await message.reply("The message you replied to doesn't look like a list of racers, their gate numbers, their mood, the amount of skills they've used, and whether they're Domestic / JP (`D`) or International / Overseas (`I`) (if adapted, add `A` after this info). Please try again!");
                return;
            }

            let race = client.services.race.races.find(race => race._id.toString() == raceId);

            if (race === undefined) {
                await message.reply("Race ID seems to be invalid or not present. Aborting!");
                return;
            }

            let racers = referencedMessage.content.replace(`\n-# Race ID: ${raceId}`, "").split("\n").map(line => {
                gradedRacerListRegex.lastIndex = 0;
                let match = gradedRacerListRegex.exec(line);

                let mood: RacerMood = parseInt(match[3].trim());

                let stages: number[] = [];

                for (let i = 0; i < 4; i++) {
                    stages.push(randomInt(8, 10) + randomInt(8, 10));
                }

                let baseScore = 0;
                for (let value of stages) {
                    baseScore += value;
                }

                let skillsUsed = parseInt(match[5].trim());
                let skillBonus = skillsUsed == 0 ? 0 : calculateSkillBonus(Array.from({ length: skillsUsed }, () => randomInt(1, 20)));

                let moodPercentageModifier = 0.02;

                let moodPercentage = moodPercentageModifier * mood;

                let scoreModifier = (baseScore + skillBonus) * moodPercentage;
                let score = (baseScore + skillBonus) + scoreModifier;

                let debuffFlag = match[4].trim().split("")[0];
                let debuffAdapted = match[4].trim().split("")[1] == "A";

                let assignedType = race.type == RaceType.GradedInternational ? "I" : "D";

                let finalScore = score;
                if (debuffFlag != assignedType && race.surface == SurfaceType.Turf) {
                    // Assign debuff
                    let debuffModifier = score * (debuffAdapted ? 0.015 : 0.03);
                    finalScore = score - debuffModifier;
                }

                return {
                    gate: parseInt(match[1]),
                    name: match[2].trim(),
                    baseScore,
                    mood,
                    moodPercentage,
                    skillsUsed,
                    skillBonus,
                    stages,
                    scoreModifier,
                    scoreBeforeDebuff: Math.round(score * 10) / 10,
                    score: Math.round(finalScore * 10) / 10
                };
            }).sort(() => Math.floor(Math.random() * 2) == 1 ? -1 : 1);

            let results = racers.sort((a, b) => a.score > b.score ? -1 : 1);

            let response = [];
            let offset = -1;

            let placements = [];
            let racerGateNumbers = [];
            let margins = [];

            for (let place in results) {
                let index = parseInt(place);
                let distanceMarker = "";
                if (index >= 1 && results[index - 1].score == results[index].score) {
                    // Potential dead heat.
                    let highestScoreForPrevious = 0;
                    results[index - 1].stages.forEach(stage => stage > highestScoreForPrevious ? highestScoreForPrevious = stage : null);

                    let highestScoreForCurrent = 0;
                    results[index].stages.forEach(stage => stage > highestScoreForCurrent ? highestScoreForCurrent = stage : null);

                    if (highestScoreForCurrent == highestScoreForPrevious) {
                        // Dead heat.
                        offset++;
                        distanceMarker = "DEAD HEAT";
                    } else {
                        distanceMarker = "NOSE";
                    }
                } else if (index >= 1) {
                    let score = Math.abs(results[index].score - results[index - 1].score);

                    if (score <= 0.1)
                        distanceMarker = "NOSE";
                    else if (score <= 0.2)
                        distanceMarker = "HEAD";
                    else if (score <= 0.4)
                        distanceMarker = "NECK";
                    else
                        distanceMarker = `${roundToQuarter(Math.abs(results[index].score - results[index - 1].score))}L`;
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

                // Images
                placements.push(index - offset);
                racerGateNumbers.push(results[index].gate);

                if (distanceMarker != "") {
                    switch (distanceMarker) {
                        case "DEAD HEAT":
                            margins.push({ type: MarginType.DeadHeat, value: 0 });
                            break;
                        case "NOSE":
                            margins.push({ type: MarginType.Nose, value: 0.1 });
                            break;
                        case "HEAD":
                            margins.push({ type: MarginType.Head, value: 0.2 });
                            break;
                        case "NECK":
                            margins.push({ type: MarginType.Neck, value: 0.3 });
                            break;
                        default:
                            margins.push({ type: MarginType.Number, value: Math.abs(results[index].score - results[index - 1].score) });
                    }
                }

                console.log(placements);
                console.log(racerGateNumbers);
                console.log(margins);

                //response.push(`**${index - offset}${numberSuffix(index - offset)}**: ${results[index].name} [${moodName}] (**stages:** [${results[index].stages.join(", ")}], **score:** ${results[index].score}) ${index >= 1 ? `**margin diff:** ${Math.min(50, Math.abs(results[index].score - results[index - 1].score)) / 10}L **margin:** ${distanceMarker}` : ""}`);
                response.push(`**${index - offset}${numberSuffix(index - offset)}**: ${results[index].name} [${moodName}] (**stages:** [${results[index].stages.join(", ")}], **skill modifier:** ${Math.floor(results[index].skillBonus * 100000) / 100000} (used ${results[index].skillsUsed}), **score:** ${results[index].scoreBeforeDebuff} -> ${results[index].score}) ${index >= 1 ? `**margin diff:** ${Math.floor((Math.min(100, Math.abs(results[index].score - results[index - 1].score))) * 100000) / 100000}L **margin:** ${distanceMarker}` : ""}`);
            }

            let image = await ImageService.drawScoreboard(race.type, ScoreStatus.Final, race.distance, placements, racerGateNumbers, margins, { turf: race.trackCondition, dirt: race.trackCondition });

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
                await (message.channel as TextChannel).send({
                    content: "scoreboard image",
                    files: [ new AttachmentBuilder(image).setName("scoreboard.png") ]
                });
            } else
                await message.reply({
                    content: response.join("\n"),
                    files: [ new AttachmentBuilder(image).setName("scoreboard.png") ]
                });
        } else {
            await message.reply(`Unknown mode: "${mode}". Valid modes are: "none", "graded"`);
        }
    }
}