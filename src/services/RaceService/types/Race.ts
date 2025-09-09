import {ChannelResolvable, GuildMember, Snowflake, TextChannel} from "discord.js";
import Racer from "./Racer";
import DiscordClient from "../../../DiscordClient";
import {DisqualificationType} from "./Disqualification";
import {ObjectId} from "mongodb";

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
        if (distance <= 1200)
            this.distance = DistanceType.Sprint;
        else if (distance <= 1600)
            this.distance = DistanceType.Mile;
        else if (distance <= 2200)
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

        this.racers.push(racer);
    }

    removeRacer(member: GuildMember) {
        let index = this.racers.findIndex(race => race.memberId == member.id);

        this.racers.splice(index, 1);
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

export type RaceFlag = "URARA_MEMORIAM";
export const RaceFlagOptions: {name: string, value: RaceFlag}[] = [
    { name: "Haru Urara Memoriam", value: "URARA_MEMORIAM" }
]

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
    GateOpen,
    Early,
    Middle,
    Late,
    FinalSpurt,
    Ended
}