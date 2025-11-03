import TextInteraction, {TextCommandBuilder} from "../../types/TextInteraction";
import {AttachmentBuilder, Message} from "discord.js";
import DiscordClient from "../../DiscordClient";
import ImageService, {ScoreStatus} from "../../services/ImageService";
import {DistanceType, MarginType, RaceType, TrackConditionType} from "../../services/RaceService/types/Race";
import {DisqualificationType} from "../../services/RaceService/types/Disqualification";

export default class GenerateImageCommand extends TextInteraction {
    public info = new TextCommandBuilder()
        .setName("generateImage")
        // !generateImage GRADE RACE_STATE DISTANCE POSITION_NUMBERS RACER_BRACKETS MARGINS CONDITION TIME RACE_NUMBER
        .setRegexMatch(/!generateImage (graded|none) (none|review|final) (sprint|mile|medium|long) ((?:\d,?){5}) ((?:\d+,?){5}) \[((?:(?:NONE|NUMBER|NECK|HEAD|NOSE|DEADHEAD|DISTANCE)-\d(?:\.\d*)?,?){4})] (firm|good|soft|heavy) (\d{1,4}) (\d{1,2})/gi)
        .addRole(process.env.RACE_STAFF_ROLE_ID);

    override async execute(message: Message, regexMatch: RegExpExecArray, client: DiscordClient) {
        let raceType = regexMatch[1].toLowerCase() == "graded" ? RaceType.GradedDomestic : RaceType.NonGraded;
        let scoreStatus: ScoreStatus;
        switch (regexMatch[2].toLowerCase()) {
            case "none":
                scoreStatus = ScoreStatus.None;
                break;
            case "review":
                scoreStatus = ScoreStatus.Review;
                break;
            case "final":
                scoreStatus = ScoreStatus.Final;
                break;
        }
        let distanceType: DistanceType;
        switch (regexMatch[3].toLowerCase()) {
            case "sprint":
                distanceType = DistanceType.Sprint;
                break;
            case "mile":
                distanceType = DistanceType.Mile;
                break;
            case "medium":
                distanceType = DistanceType.Medium;
                break;
            case "long":
                distanceType = DistanceType.Long;
                break;
        }
        let positionNumbers: number[] = regexMatch[4].split(",").map(value => value == "0" ? undefined : parseInt(value));
        let placements: number[] = regexMatch[5].split(",").map(value => value == "0" ? undefined : parseInt(value));
        let margins: {type: MarginType, value: number}[] = regexMatch[6].split(",").map(value => {
            let marginType: MarginType;
            switch(value.split("-")[0].toLowerCase()) {
                case "none":
                    marginType = MarginType.None;
                    break;
                case "number":
                    marginType = MarginType.Number;
                    break;
                case "neck":
                    marginType = MarginType.Neck;
                    break;
                case "head":
                    marginType = MarginType.Head;
                    break;
                case "nose":
                    marginType = MarginType.Nose;
                    break;
                case "deadheat":
                    marginType = MarginType.DeadHeat;
                    break;
                case "distance":
                    marginType = MarginType.Distance;
                    break;
            }
            return {
                type: marginType,
                value: parseFloat(value.split("-")[1])
            };
        });
        let condition: TrackConditionType;
        switch (regexMatch[7].toLowerCase()) {
            case "firm":
                condition = TrackConditionType.Firm;
                break;
            case "good":
                condition = TrackConditionType.Good;
                break;
            case "soft":
                condition = TrackConditionType.Soft;
                break;
            case "heavy":
                condition = TrackConditionType.Heavy;
                break;
        }
        let timeOverride = parseInt(regexMatch[8]);
        let raceNumberOverride = parseInt(regexMatch[9]);

        const image = await ImageService.drawScoreboard(raceType, scoreStatus, distanceType, positionNumbers, placements, margins, { turf: condition, dirt: condition }, timeOverride, raceNumberOverride);

        const attachment = new AttachmentBuilder(image)
            .setName("scoreboard.png");

        await message.reply({
            files: [ attachment ]
        });
    }
}
