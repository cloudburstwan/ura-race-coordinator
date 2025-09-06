import {Snowflake} from "discord.js";

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

    constructor(name: string, memberId: Snowflake) {
        this.name = name;
        this.memberId = memberId;
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

enum AptitudeLevel {
    G,
    F,
    E,
    D,
    C,
    B,
    A,
    S
}

enum CharacterType {
    Domestic,
    International
}