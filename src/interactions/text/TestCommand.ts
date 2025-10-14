import TextInteraction, {TextCommandBuilder} from "../../types/TextInteraction";
import {AttachmentBuilder, Message} from "discord.js";
import DiscordClient from "../../DiscordClient";
import ImageService, {ScoreStatus} from "../../services/ImageService";
import {DistanceType, MarginType, RaceType, TrackConditionType} from "../../services/RaceService/types/Race";
import {DisqualificationType} from "../../services/RaceService/types/Disqualification";

export default class GenerateImageCommand extends TextInteraction {
    public info = new TextCommandBuilder()
        .setName("generateImage")
        .setRegexMatch(/!generateImage/g)
        .addRole(process.env.RACE_STAFF_ROLE_ID);

    override async execute(message: Message, regexMatch: RegExpExecArray, client: DiscordClient) {
        const image = await ImageService.drawScoreboard(RaceType.GradedInternational, ScoreStatus.Final, DistanceType.Medium, [1,2,3,4,5], [12,7,11,15,17], [
            { type: MarginType.Number, value: 0.75 },
            { type: MarginType.Number, value: 0.75 },
            { type: MarginType.Number, value: 1.75 },
            { type: MarginType.Head, value: 0.3 }
        ], { dirt: TrackConditionType.Firm, turf: TrackConditionType.Firm }, 1494);

        console.log(DisqualificationType.Graded.toString());

        const attachment = new AttachmentBuilder(image)
            .setName("scoreboard.png");

        await message.reply({
            files: [ attachment ]
        });
    }
}
