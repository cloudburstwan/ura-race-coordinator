import {GuildMember, Snowflake} from "discord.js";
import {RaceError} from "../index";
import {runInThisContext} from "node:vm";
import {randomInt} from "../../../utils";

export default class Racer {
    public memberId: Snowflake;
    public gate: number = 0;
    public favoritePosition: number = 0;
    public characterId: string = null;
    public characterName: string;
    public status: RacerStatus = RacerStatus.NotPresent;
    public scores: number[] = [];
    public mood: RacerMood = RacerMood.Normal;
    public overallScore: number = 0;

    public skillRolls: number[] = [];
    public debuffCount: number = 0;

    constructor(memberId: Snowflake, characterName: string) {
        this.memberId = memberId;
        this.characterName = characterName
    }

    assignMood(mood?: RacerMood) {
        if (mood)
            this.mood = mood;
        else {
            let moodRandom = randomInt(1, 20);
            if (moodRandom <= 3) this.mood = RacerMood.Awful; else
            if (moodRandom <= 7) this.mood = RacerMood.Bad; else
            if (moodRandom <= 13) this.mood = RacerMood.Normal; else
            if (moodRandom <= 17) this.mood = RacerMood.Good; else
            if (moodRandom <= 20) this.mood = RacerMood.Great;
        }

        return this.mood;
    }

    static fromDB(data: Racer) {
        if (data === null) return null;
        if (data === undefined) return undefined;

        let result = new this(data.memberId, data.characterName);

        result.status = data.status;
        result.scores = data.scores;
        result.mood = data.mood;
        result.gate = data.gate;
        result.favoritePosition = data.favoritePosition;
        result.overallScore = data.overallScore;
        result.skillRolls = data.skillRolls;
        result.debuffCount = data.debuffCount;

        return result;
    }
}

export enum RacerStatus {
    NotPresent,
    Normal,
    DNF_IC,
    DNF_OOC,
}

export enum RacerMood {
    Awful = -2,
    Bad = -1,
    Normal,
    Good,
    Great
}