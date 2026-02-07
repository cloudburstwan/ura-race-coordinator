// TODO: Service responsible for generating images in real-time (e.g. for scoreboards)
import {createCanvas, Image, loadImage} from "canvas";
import {DistanceType, MarginType, RaceType, TrackConditionType} from "../RaceService/types/Race";
import {addLeadingZero, randomInt, roundToQuarter} from "../../utils";

const baseUrl = "https://s3-old.cloudburst.lgbt/race-assets";
const imagePositions = {
    raceNumber: [176, 56],
    state: [321, 48],
    position: {
        0: [48, 124],
        1: [48, 204],
        2: [48, 284],
        3: [48, 364],
        4: [48, 442]
    },
    gateNumbers: {
        0: [128, 120],
        1: [128, 200],
        2: [128, 280],
        3: [128, 360],
        4: [128, 440]
    },
    chevrons: {
        0: [258, 146],
        1: [258, 226],
        2: [258, 306],
        3: [258, 386]
    },
    scores: {
        0: [328, 168],
        1: [328, 248],
        2: [328, 328],
        3: [328, 408]
    },
    timer: {
        minute: [128, 520],
        seconds: {
            0: [176, 520],
            1: [216, 520]
        },
        millisecond: [262, 520]
    },
    trackCondition: {
        turf: [128, 584],
        dirt: [288, 584]
    }
}

export default class ImageService {
    static async drawScoreboard(type: RaceType, status: ScoreStatus, distance: DistanceType, positionNumbers: number[], placements: number[], margins: { type: MarginType, value: number }[], condition: SurfaceInfo, timeOverride?: number, raceNumberOverride?: number) {
        let base = await loadImage(`${baseUrl}/base.png`);

        const canvas = createCanvas(base.width, base.height);
        const ctx = canvas.getContext("2d");

        console.log("base");
        ctx.drawImage(base, 0, 0, base.width, base.height);

        console.log("race number");
        let raceNumber: number;

        if (raceNumberOverride)
            raceNumber = raceNumberOverride;
        else {
            if (type == RaceType.NonGraded) raceNumber = randomInt(1, 7);
            else raceNumber = randomInt(8, 12);
        }

        let raceNumberImg = await loadImage(`${baseUrl}/components/race_number/${raceNumber}.png`);

        ctx.drawImage(raceNumberImg, imagePositions.raceNumber[0], imagePositions.raceNumber[1]);

        console.log("status");
        let statusImage: Image;
        switch (status) {
            case ScoreStatus.Final:
                statusImage = await loadImage(`${baseUrl}/components/state/final.png`);
                break;
            case ScoreStatus.Review:
                statusImage = await loadImage(`${baseUrl}/components/state/review.png`);
                break;
            default:
                statusImage = undefined;
        }

        if (statusImage != undefined) {
            ctx.drawImage(statusImage, imagePositions.state[0], imagePositions.state[1]);
        }

        console.log("position");
        // Position Number
        for (let i = 0; i < Math.min(5, positionNumbers.length); i++) {
            if (positionNumbers[i] == undefined) continue;
            let image = await loadImage(`${baseUrl}/components/position/${positionNumbers[i]}.png`);

            ctx.drawImage(image, imagePositions.position[i][0], imagePositions.position[i][1]);
        }

        console.log("gate");
        // Racer Gate Number
        for (let i = 0; i < Math.min(5, placements.length); i++) {
            console.log(placements[i])
            if (placements[i] == undefined) continue;
            let image = await loadImage(`${baseUrl}/components/racer_gate_number/${placements[i]}.png`);

            ctx.drawImage(image, imagePositions.gateNumbers[i][0], imagePositions.gateNumbers[i][1]);
        }

        console.log("chevron");
        // Chevrons & Margins
        let chevronImage = await loadImage(`${baseUrl}/components/chevron.png`);
        for (let i = 0; i < Math.min(4, margins.length); i++) {
            console.log(margins[i])
            if (margins[i].type == MarginType.None) continue; // Margin is "undecided" (for hype reasons)
            ctx.drawImage(chevronImage, imagePositions.chevrons[i][0], imagePositions.chevrons[i][1]);


        }

        console.log("margin");
        // Scores
        for (let i = 0; i < Math.min(4, margins.length); i++) {
            let imgName: string;
            let value = roundToQuarter(margins[i].value)
            switch (margins[i].type) {
                case MarginType.Distance:
                    imgName = "distance";
                    break;
                case MarginType.Number:
                    let fraction: string;
                    console.log(value);
                    switch (value % 1) {
                        case 0.25:
                            fraction = "1-4";
                            break;
                        case 0.5:
                            fraction = "1-2";
                            break;
                        case 0.75:
                            fraction = "3-4";
                            break;
                        default:
                            fraction = null;
                    }
                    let res = [];
                    if (value >= 1)
                        res.push(Math.floor(value));
                    if (fraction != null)
                        res.push(fraction);
                    imgName = res.join("_");
                    break;
                case MarginType.Neck:
                    imgName = "neck";
                    break;
                case MarginType.Head:
                    imgName = "head";
                    break;
                case MarginType.Nose:
                    imgName = "nose";
                    break;
                case MarginType.DeadHeat:
                    imgName = "dead_heat";
                    break;
                default:
                    imgName = null;
            }
            console.log(margins[i].type);
            console.log(imgName);
            if (imgName == null) continue;
            let img = await loadImage(`${baseUrl}/components/scores/${imgName}.png`);
            ctx.drawImage(img, imagePositions.scores[i][0], imagePositions.scores[i][1]);
        }

        console.log("timer");
        // Timer
        let randomTime = 0;

        if (distance == DistanceType.Sprint) randomTime = randomInt(750, 900);
        if (distance == DistanceType.Mile) randomTime = randomInt(900, 1050);
        if (distance == DistanceType.Medium) randomTime = randomInt(1050, 1200);
        if (distance == DistanceType.Long) randomTime = randomInt(1200, 1350);
        let minutes = Math.floor((timeOverride ?? randomTime) / 60 / 10);
        let seconds = Math.floor((timeOverride ?? randomTime) / 10) - (minutes * 60);
        let millisecond = Math.floor((timeOverride ?? randomTime) % 10);

        console.log(timeOverride ?? randomTime);
        console.log(minutes);
        console.log(seconds);
        console.log(millisecond);

        let minutesImage = await loadImage(`${baseUrl}/components/timer/${minutes}.png`);
        let secondsImages = addLeadingZero(seconds).split("").map(async number => {
            return await loadImage(`${baseUrl}/components/timer/${number}.png`);
        });
        let millisecondImage = await loadImage(`${baseUrl}/components/timer/${millisecond}.png`);

        ctx.drawImage(minutesImage, imagePositions.timer.minute[0], imagePositions.timer.minute[1]);
        ctx.drawImage(millisecondImage, imagePositions.timer.millisecond[0], imagePositions.timer.millisecond[1]);

        for (let index in secondsImages) {
            let i = parseInt(index);
            let img = await secondsImages[i];

            ctx.drawImage(img, imagePositions.timer.seconds[i][0], imagePositions.timer.seconds[i][1]);
        }

        console.log("turf condition");
        // Surface
        let turfConditionImage: Image;
        switch (condition.turf) {
            case TrackConditionType.Firm:
                turfConditionImage = await loadImage(`${baseUrl}/components/surface/firm.png`);
                break;
            case TrackConditionType.Good:
                turfConditionImage = await loadImage(`${baseUrl}/components/surface/good.png`);
                break;
            case TrackConditionType.Soft:
                turfConditionImage = await loadImage(`${baseUrl}/components/surface/soft.png`);
                break;
            case TrackConditionType.Heavy:
                turfConditionImage = await loadImage(`${baseUrl}/components/surface/heavy.png`);
                break;
        }

        ctx.drawImage(turfConditionImage, imagePositions.trackCondition.turf[0], imagePositions.trackCondition.turf[1]);

        console.log("dirt condition");
        let dirtConditionImage: Image;
        switch (condition.dirt) {
            case TrackConditionType.Firm:
                dirtConditionImage = await loadImage(`${baseUrl}/components/surface/firm.png`);
                break;
            case TrackConditionType.Good:
                dirtConditionImage = await loadImage(`${baseUrl}/components/surface/good.png`);
                break;
            case TrackConditionType.Soft:
                dirtConditionImage = await loadImage(`${baseUrl}/components/surface/soft.png`);
                break;
            case TrackConditionType.Heavy:
                dirtConditionImage = await loadImage(`${baseUrl}/components/surface/heavy.png`);
                break;
        }

        ctx.drawImage(dirtConditionImage, imagePositions.trackCondition.dirt[0], imagePositions.trackCondition.dirt[1]);

        return canvas.createPNGStream();
    }
}

interface SurfaceInfo {
    turf: TrackConditionType,
    dirt: TrackConditionType
}

export enum ScoreStatus {
    None,
    Review,
    Final
}