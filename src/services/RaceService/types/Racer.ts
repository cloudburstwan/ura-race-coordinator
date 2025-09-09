import {GuildMember, Snowflake} from "discord.js";

export default class Racer {
    public memberId: Snowflake;
    public characterId: string = null;
    public characterName: string;
    public status: RacerStatus = RacerStatus.Normal;
    public scores: number[] = [];
    public mood: RacerMood = RacerMood.Normal;

    public skillRolls: number[] = [];
    public debuffCount: number = 0;

    constructor(memberId: Snowflake, characterName: string) {
        this.memberId = memberId;
        this.characterName = characterName
    }

    markAsDNF() {
        this.status = RacerStatus.NotFinishing;
    }

    static fromDB(data: Racer) {
        let result = new this(data.memberId, data.characterName);

        result.scores = data.scores;
        result.mood = data.mood;
        result.skillRolls = data.skillRolls;
        result.debuffCount = data.debuffCount;

        return result;
    }
}

export enum RacerStatus {
    Normal,
    NotFinishing
}

export enum RacerMood {
    Awful = -2,
    Bad = -1,
    Normal,
    Good,
    Great
}