import {Snowflake} from "discord.js";
import {ObjectId} from "mongodb";

export default class Character {
    public name: string;
    public memberId: Snowflake;
    public type: CharacterType;
    public aptitudes: Aptitude = {
        surface: {
            dirt: AptitudeLevel.G,
            turf: AptitudeLevel.G
        },
        distance: {
            sprint: AptitudeLevel.G,
            mile: AptitudeLevel.G,
            medium: AptitudeLevel.G,
            long: AptitudeLevel.G
        }
    };
    public tickets: Tickets = {
        aptitudeReselection: 1 // TODO: When adding aptitudes to creation, set this to 0!
    }
    public _id?: ObjectId;

    constructor(name: string, memberId: Snowflake, type: CharacterType) {
        this.name = name;
        this.memberId = memberId;
        this.type = type;
    }

    setSurfaceAptitudes(dirt: AptitudeLevel, turf: AptitudeLevel) {
        this.aptitudes.surface.dirt = dirt;
        this.aptitudes.surface.turf = turf;
    }

    setDistanceAptitudes(sprint: AptitudeLevel, mile: AptitudeLevel, medium: AptitudeLevel, long: AptitudeLevel) {
        this.aptitudes.distance.sprint = sprint;
        this.aptitudes.distance.mile = mile;
        this.aptitudes.distance.medium = medium;
        this.aptitudes.distance.long = long;
    }

    static fromDB(data: Character) {
        let result = new this(data.name, data.memberId, data.type);

        result.aptitudes = data.aptitudes;
        result.tickets = data.tickets;
        result._id = data._id;

        return result;
    }
}

interface Aptitude {
    surface: {
        dirt: AptitudeLevel,
        turf: AptitudeLevel
    },
    distance: {
        sprint: AptitudeLevel,
        mile: AptitudeLevel,
        medium: AptitudeLevel,
        long: AptitudeLevel
    }
}

interface Tickets {
    aptitudeReselection: number
}

export enum AptitudeLevel {
    G = -6,
    F = -5,
    E = -4,
    D = -3,
    C = -2,
    B = -1,
    A,
    S
}

export enum CharacterType {
    Domestic,
    International
}