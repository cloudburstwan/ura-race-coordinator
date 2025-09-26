import {ChannelResolvable, GuildMember, Snowflake, TextChannel} from "discord.js";
import Racer from "./Racer";
import DiscordClient from "../../../DiscordClient";
import {DisqualificationType} from "./Disqualification";
import {ObjectId} from "mongodb";
import {rollXTimes} from "../../../utils";

export default class Race {
    public name: string;
    public type: RaceType;
    public status: RaceStatus = RaceStatus.SignupOpen;
    public channelId: Snowflake;
    public messageId: Snowflake;
    public startingAt: Date;
    public startingTimestamp: number;
    public surface: SurfaceType;
    public distanceMetres: number;
    public distance: DistanceType;
    public weather: WeatherType;
    public trackCondition: TrackConditionType;
    public maxRacers: number;
    public flag: RaceFlag;
    public _id?: ObjectId;

    public racers: Racer[] = [];

    constructor(name: string, type: RaceType, channelId: Snowflake, startingAt: Date, surface: SurfaceType, distance: number, weather: WeatherType, trackCondition: TrackConditionType, maxRacers: number, flag?: RaceFlag) {
        this.name = name;
        this.type = type;
        this.channelId = channelId;
        this.startingAt = startingAt;
        this.startingTimestamp = startingAt.getTime();
        this.surface = surface;
        this.distanceMetres = distance;
        if (distance <= 1400)
            this.distance = DistanceType.Sprint;
        else if (distance <= 1800)
            this.distance = DistanceType.Mile;
        else if (distance <= 2400)
            this.distance = DistanceType.Medium;
        else
            this.distance = DistanceType.Long;
        this.weather = weather;
        this.trackCondition = trackCondition;
        this.maxRacers = maxRacers;
        this.flag = flag;
    }

    addRacer(member: GuildMember, characterName: string) {
        if (this.flag == "URARA_MEMORIAM" && characterName != "Haru Urara")
            throw new RangeError(`This race is a memoriam for Haru Urara. Only Haru Urara is allowed to race. Try racing as Haru Urara!\n-# Even if you think you can't do it, just keep on pushing ahead. She would have wanted you to try your best no matter what.`);

        let racer = new Racer(member.id, characterName);
        if (![RaceStatus.SignupOpen, RaceStatus.SignupClosed].includes(this.status))
            racer.gate = Math.max(...this.racers.map(racer => racer.gate))+1;

        this.racers.push(racer);
    }

    removeRacer(member: GuildMember) {
        let index = this.racers.findIndex(race => race.memberId == member.id);

        this.racers.splice(index, 1);
    }

    getResults() {
        if (this.type == RaceType.NonGraded) {
            // TODO: Non-graded results'

            return [];
        } else {
            let placements: Placement[] = [];

            this.racers.forEach(racer => {
                for (let i = 0; i < 5; i++) {
                    racer.scores.push(0);
                }

                racer.overallScore = 0;

                // TODO: Actually write this code
            });

            this.racers.sort(() => Math.floor(Math.random() * 2) == 1 ? -1 : 1); // Tiebreak
            this.racers.sort((a, b) => a.overallScore > b.overallScore ? -1 : 1);

            let offset = -1;
            for (let place in this.racers) {
                let index = parseInt(place);
                let marginType: MarginType = MarginType.None;
                let distance: number = 0;
                if (index >= 1 && this.racers[index-1].overallScore == this.racers[index].overallScore) {
                    marginType = MarginType.DeadHeat;
                    offset++;
                } else if (index >= 1) {
                    // TODO: Write placement code
                }

                placements.push({
                    position: index-offset,
                    gate: (this.racers[index] as ({gate: number} & Racer)).gate,
                    racer: this.racers[index],
                    marginType: marginType,
                    marginNumber: distance
                });
            }

            console.log(placements);

            return placements;
        }
    }

    public static fromDB(data: Race) {
        let result = new this(data.name, data.type, data.channelId, data.startingAt, data.surface, data.distance, data.weather, data.trackCondition, data.maxRacers, data.flag);

        result.status = data.status;
        result.messageId = data.messageId;
        result.distanceMetres = data.distanceMetres;
        result.distance = data.distance;
        result._id = data._id;

        for (let i in data.racers) {
            result.racers[i] = Racer.fromDB(data.racers[i]);
        }

        return result;
    }
}

export type RaceFlag = "URARA_MEMORIAM" | "WEDDING_BOUQUET_THROW";
export const RaceFlagOptions: {name: string, value: RaceFlag}[] = [
    { name: "Haru Urara Memoriam", value: "URARA_MEMORIAM" },
    { name: "Weddings: Bouquet Throw (Configure in config!)", value: "WEDDING_BOUQUET_THROW" }
]

export interface Placement {
    position: number,
    gate: number,
    racer: Racer
    marginType: MarginType,
    marginNumber: number
}


export enum MarginType {
    None,
    Number,
    Neck,
    Head,
    Nose,
    DeadHeat,
    Distance
}

export enum RaceType {
    NonGraded,
    GradedDomestic,
    GradedInternational
}

export enum SurfaceType {
    Dirt,
    Turf
}
export enum DistanceType {
    Sprint,
    Mile,
    Medium,
    Long
}

export enum WeatherType {
    Sunny,
    Cloudy,
    Rainy,
    Snowy
}

export enum TrackConditionType {
    Firm,
    Good,
    Soft,
    Heavy
}

export enum RaceStatus {
    SignupOpen,
    SignupClosed,
    Started,
    GateOpen, // TODO: Implement staging system
    Early,
    Middle,
    Late,
    FinalSpurt, // End of above!
    Ended
}