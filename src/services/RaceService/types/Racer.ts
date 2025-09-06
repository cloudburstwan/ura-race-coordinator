import {GuildMember, Snowflake} from "discord.js";

export default class Racer {
    public memberId: Snowflake;
    public characterId: string;
    public name: string;
    public scores: number[] = [];
    public mood: RacerMood = RacerMood.Normal;

    public skillUsedCount: number = 0;
    public debuffCount: number = 0;

    constructor(member: GuildMember, name: string) {
        this.memberId = member.id;
        this.name = name;
    }
}

export enum RacerMood {
    Awful = -2,
    Bad = -1,
    Normal,
    Good,
    Great
}