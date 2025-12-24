// TODO: Build race service to handle processing of races.

import Race, {RaceStatus, RaceType} from "./types/Race";
import DataService from "../DataService";
import DiscordClient from "../../DiscordClient";
import {
    ButtonStyle,
    GuildMember,
    MessageFlagsBitField,
    PublicThreadChannel,
    SeparatorSpacingSize,
    Snowflake,
    TextChannel
} from "discord.js";
import {RacerMood} from "./types/Racer";
import createRaceSignupComponent from "../../components/RaceSignupComponent";
import Disqualification, {DisqualificationType} from "./types/Disqualification";
import {Filter, ObjectId} from "mongodb";

export default class RaceService {
    private Client: DiscordClient;
    private DataService: DataService;

    constructor(dataService: DataService, client: DiscordClient) {
        this.DataService = dataService;
        this.Client = client;
    }

    public async get(raceId: string): Promise<Race> {
        return Race.fromDB(await this.DataService.races.findOne({ _id: ObjectId.createFromHexString(raceId) }));
    }

    public async list() {
        return (await this.DataService.races.find().toArray()).map((race) => Race.fromDB(race));
    }

    public async createRace(race: Race, client: DiscordClient) {
        let result = await this.DataService.races.insertOne(race);
        let msg = await race.updateRaceSignupMessage(client, true) as {channel: Snowflake, message: Snowflake};

        return msg.channel;
    }
}

export class RaceError extends Error {
    public code: RaceErrorCode;
    public rawMessage: string;

    constructor(code: RaceErrorCode, message: string) {
        super(`${code} - ${message}`);
        this.code = code;
        this.rawMessage = message;
    }
}

type RaceErrorCode = "RACE_NOT_FOUND" | "RACE_SIGNUP_CLOSED_OR_FULL" | "RACE_IN_PROGRESS_OR_OVER" | "USER_ALREADY_JOINED" | "USER_NOT_JOINED" |
                     "BAD_CHARACTER_NAME" | "RACE_ALREADY_STARTED" | "RACE_NOT_YET_STARTED_OR_OVER" | "USER_DISQUALIFIED"