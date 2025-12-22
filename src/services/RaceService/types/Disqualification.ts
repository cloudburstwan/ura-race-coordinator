import {Snowflake} from "discord.js";
import {ObjectId} from "mongodb";

export default class Disqualification {
    public memberId: Snowflake;
    public createdAt: Date;
    public endsAt: Date;
    public reason: string;
    public type: DisqualificationType;
    public flags: DisqualificationFlags;
    public _id?: ObjectId;

    constructor(memberId: string, duration: number, reason: string, type: DisqualificationType, flags: DisqualificationFlags) {
        this.memberId = memberId;
        this.createdAt = new Date();
        this.endsAt = new Date(Date.now() + duration);
        this.reason = reason;
        this.type = type;
        this.flags = flags;
    }

    public static fromDB(data: Disqualification) {
        if (data === null) return null;
        if (data === undefined) return undefined;

        let result = new this(data.memberId, 0, data.reason, data.type, data.flags);

        result.createdAt = data.createdAt;
        result.endsAt = data.endsAt;
        result._id = data._id;

        return result;
    }
}

export enum DisqualificationType {
    All,
    Graded,
}

export enum DisqualificationFlags {
    None = 0,
    Automated = 0b1, // Automated - Mainly for those who fail to sign up in time
}