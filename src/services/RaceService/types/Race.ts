import {Snowflake, TextChannel} from "discord.js";
import Racer from "./Racer";

export default class Race {
    public name: string;
    public type: RaceType;
    public state: RaceStatus = RaceStatus.SignupOpen;
    public channelId: Snowflake;
    public startingAt: Date;
    public startingTimestamp: number;
    public surface: SurfaceType;
    public distanceMetres: number;
    public distance: DistanceType;
    public weather: WeatherType;
    public trackCondition: TrackConditionType;
    public maxRacers: number;

    public racers: Racer[] = [];

    constructor(name: string, type: RaceType, channel: TextChannel, startingAt: Date, surface: SurfaceType, distance: number, weather: WeatherType, trackCondition: TrackConditionType, maxRacers: number) {
        this.name = name;
        this.type = type;
        this.channelId = channel.id;
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
    }

    setState(state: RaceStatus) {
        this.state = state;
    }
}

export enum RaceType {
    NotGraded,
    G3,
    G2,
    G1
}

export enum SurfaceType {
    DomesticDirt,
    DomesticTurf,
    InternationalDirt,
    InternationalTurf
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