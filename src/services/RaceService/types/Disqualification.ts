import {Snowflake} from "discord.js";
import {ObjectId} from "mongodb";

export default class Disqualification {
    public memberId: Snowflake;
    public createdAt: Date;
    public endsAt: Date;
    public reason: string;
    public type: DisqualificationType;
    public _id?: ObjectId;

    constructor(memberId: string, duration: number, reason: string, type: DisqualificationType) {
        this.memberId = memberId;
        this.createdAt = new Date();
        this.endsAt = new Date(Date.now() + duration);
        this.reason = reason;
        this.type = type;
    }

    public static fromDB(data: Disqualification) {
        let result = new this(data.memberId, 0, data.reason, data.type);

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

DisqualificationType.toString = () => this == DisqualificationType.Graded ? "Graded Only" : "All Races";