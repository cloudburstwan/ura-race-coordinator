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

    public async getRace(raceId: string): Promise<Race> {
        return Race.fromDB(await this.DataService.races.findOne({ _id: ObjectId.createFromHexString(raceId) }));
    }

    public async getRaces() {
        return (await this.DataService.races.find().toArray()).map((race) => Race.fromDB(race));
    }

    public async createRace(race: Race, client: DiscordClient) {
        let result = await this.DataService.races.insertOne(race);
        let msg = await race.updateRaceSignupMessage(client, true) as {channel: Snowflake, message: Snowflake};

        return msg.channel;
    }

    public async addRacer(raceId: string, member: GuildMember, characterName: string, force: boolean = false) {
        let race = await this.getRace(raceId);
        const linkRegex = /(.+):\/\/(.+)/g;

        if (!race)
            throw new RaceError("RACE_NOT_FOUND", "The race ID provided does not link to a valid race");

        if ((race.status != RaceStatus.SignupOpen || race.racers.length >= race.maxRacers) && !force)
            throw new RaceError("RACE_SIGNUP_CLOSED_OR_FULL", "Signups are either closed or there are already too many racers");

        if (race.racers.some(racer => racer.characterName == characterName && racer.memberId == member.id) && !force)
            throw new RaceError("CHARACTER_ALREADY_JOINED", "Racer already exists with that name by that member");

        if (linkRegex.test(characterName))
            throw new RaceError("BAD_CHARACTER_NAME", "Sorry, your character cannot be a website.\n-# Please do not try to set your character name to a link.");

        let disqualificationSearchQuery: Filter<Disqualification> = { memberId: member.id, endsAt: { $gte: new Date() } };

        if (race.type != RaceType.NonGraded)
            disqualificationSearchQuery.type = DisqualificationType.Graded;

        if ((await this.Client.services.data.disqualifications.find(disqualificationSearchQuery).toArray()).length > 0) {
            throw new RaceError("USER_DISQUALIFIED", "User disqualified from this race and cannot join")
        }

        try {
            race.addRacer(member, characterName);

            await this.DataService.races.updateOne({ _id: race._id }, { $set: race });

            await race.updateRaceSignupMessage(this.Client);
            if (![RaceStatus.SignupOpen, RaceStatus.SignupClosed].includes(race.status))
                await race.updateRaceStartMessage(this.Client);
        } catch (e) {
            // Only catch RangeError, since that's thrown by race.addRacer if the name is not allowed (e.g. for special race types)
            // If it's not a RangeError, something else went wrong and it's not our problem, throw it back!
            if (e instanceof RangeError) {
                throw new RaceError("BAD_CHARACTER_NAME", e.message);
            } else {
                throw e;
            }
        }
    }

    public async removeRacer(raceId: string, memberId: Snowflake, force: boolean = false) {
        let race = await this.getRace(raceId);

        if (!race)
            throw new RaceError("RACE_NOT_FOUND", "The race ID provided does not link to a valid race");

        if (![RaceStatus.SignupOpen, RaceStatus.SignupClosed].includes(race.status) && !force)
            throw new RaceError("RACE_IN_PROGRESS_OR_OVER", "Cannot resign from a race that is in progress / over");

        if (!race.racers.some(racer => racer.memberId == memberId))
            throw new RaceError("MEMBER_NOT_JOINED", "Member has not joined this race");

        race.removeRacer(memberId);

        await this.DataService.races.updateOne({ _id: race._id }, { $set: race });

        await race.updateRaceSignupMessage(this.Client);
        if (![RaceStatus.SignupOpen, RaceStatus.SignupClosed].includes(race.status))
            await race.updateRaceStartMessage(this.Client);
    }

    public async startRace(raceId: string, client: DiscordClient) {
        // Starts a race.
        let race = await this.getRace(raceId);

        if (!race)
            throw new RaceError("RACE_NOT_FOUND", "The race ID provided does not link to a valid race");

        return await race.startRace(client);
    }

    public async getResults(raceId: string) {
        let race = await this.getRace(raceId);

        if (!race)
            throw new RaceError("RACE_NOT_FOUND", "The race ID provided does not link to a valid race");

        if ([RaceStatus.SignupOpen, RaceStatus.SignupClosed, RaceStatus.Ended].includes(race.status))
            throw new RaceError("RACE_NOT_YET_STARTED_OR_OVER", "Cannot get results for a race that has not yet started or is already over");

        return race.getResults();
    }

    public async endRace(raceId: string, client: DiscordClient) {
        let race = await this.getRace(raceId);

        if (!race)
            throw new RaceError("RACE_NOT_FOUND", "The race ID provided does not link to a valid race");

        if ([RaceStatus.SignupOpen, RaceStatus.SignupClosed, RaceStatus.Ended].includes(race.status))
            throw new RaceError("RACE_NOT_YET_STARTED_OR_OVER", "Cannot end a race that has not yet started or is already over");

        race.status = RaceStatus.Ended;

        await this.DataService.races.updateOne({ _id: race._id }, { $set: race });

        await race.updateRaceSignupMessage(client);
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

type RaceErrorCode = "RACE_NOT_FOUND" | "RACE_SIGNUP_CLOSED_OR_FULL" | "RACE_IN_PROGRESS_OR_OVER" | "CHARACTER_ALREADY_JOINED" | "MEMBER_NOT_JOINED" |
                     "BAD_CHARACTER_NAME" | "RACE_ALREADY_STARTED" | "RACE_NOT_YET_STARTED_OR_OVER" | "USER_DISQUALIFIED"