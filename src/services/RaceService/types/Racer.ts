import {GuildMember, Snowflake} from "discord.js";
import {RaceError} from "../index";
import {runInThisContext} from "node:vm";
import {randomInt} from "../../../utils";

export default class Racer {
    public memberId: Snowflake;
    public gate: number = 0;
    public characterId: string = null;
    public characterName: string;
    public status: RacerStatus = RacerStatus.Normal;
    public scores: number[] = [];
    public mood: RacerMood = RacerMood.Normal;
    public overallScore: number = 0;

    public skillRolls: number[] = [];
    public debuffCount: number = 0;

    constructor(memberId: Snowflake, characterName: string) {
        this.memberId = memberId;
        this.characterName = characterName
    }

    markAsDNF() {
        this.status = RacerStatus.NotFinishing;
    }

    assignMood(mood?: RacerMood) {
        if (mood)
            this.mood = mood;
        else {
            let moodRandom = randomInt(1, 20);
            if (moodRandom <= 4) this.mood = RacerMood.Awful; else
            if (moodRandom <= 8) this.mood = RacerMood.Bad; else
            if (moodRandom <= 12) this.mood = RacerMood.Normal; else
            if (moodRandom <= 16) this.mood = RacerMood.Good; else
            if (moodRandom <= 20) this.mood = RacerMood.Great;
        }

        return this.mood;
    }

    static fromDB(data: Racer) {
        let result = new this(data.memberId, data.characterName);

        result.scores = data.scores;
        result.mood = data.mood;
        result.gate = data.gate;
        result.overallScore = data.overallScore;
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