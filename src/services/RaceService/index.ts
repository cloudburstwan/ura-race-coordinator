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
import {Filter} from "mongodb";

export default class RaceService {
    public races: Race[] = [];

    private Client: DiscordClient;
    private DataService: DataService;

    constructor(dataService: DataService, client: DiscordClient) {
        this.DataService = dataService;
        this.Client = client;

        this.loadRaceData()
    }

    private async updateRaceMessage(race: Race, client: DiscordClient, newRace: boolean = false, useGate: boolean = false): Promise<{ channel: Snowflake, message: Snowflake } | void> {
        let component = createRaceSignupComponent(race, client, useGate);

        let channel: TextChannel | PublicThreadChannel;
        if (race.type == RaceType.NonGraded) {
            channel = await client.guild.channels.fetch(client.config.channels.daily_announce) as TextChannel;
        } else if (race.type == RaceType.GradedDomestic) {
            channel = await client.guild.channels.fetch(client.config.channels.jp_announce) as TextChannel;
        } else if (race.type == RaceType.GradedInternational) {
            channel = await client.guild.channels.fetch(client.config.channels.overseas_announce) as TextChannel;
        } else {
            channel = await client.guild.channels.fetch(client.config.channels.announce) as TextChannel;
        }

        if (race.flag == "WEDDING_BOUQUET_THROW")
            channel = await client.guild.channels.fetch(client.config.channels.events.wedding_guest_chat) as PublicThreadChannel;

        if (race.flag == "LEGEND_RACE")
            channel = await client.guild.channels.fetch(client.config.channels.legend_announce) as TextChannel;

        if (newRace) {
            let message = await channel.send({
                components: [ component ],
                flags: MessageFlagsBitField.Flags.IsComponentsV2
            });

            return {
                channel: message.channelId,
                message: message.id
            };
        } else {
            let message = await channel.messages.fetch(race.messageId);

            await message.edit({
                components: [component],
                flags: MessageFlagsBitField.Flags.IsComponentsV2
            });
        }
    }

    public async createRace(race: Race, client: DiscordClient) {
        let result = await this.DataService.races.insertOne(race);
        let msg = await this.updateRaceMessage(race, client, true) as {channel: Snowflake, message: Snowflake};

        race.messageId = msg.message;

        this.races.push(race);
        await this.DataService.races.updateOne({ _id: result.insertedId }, { $set: race });
        return msg.channel;
    }

    public async addRacer(raceId: string, member: GuildMember, characterName: string, force: boolean = false) {
        let race = this.races.find(race => race._id.toString() == raceId);
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

            await this.updateRaceMessage(race, this.Client);
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

    public async removeRacer(raceId: string, member: GuildMember, force: boolean = false) {
        let race = this.races.find(race => race._id.toString() == raceId);

        if (!race)
            throw new RaceError("RACE_NOT_FOUND", "The race ID provided does not link to a valid race");

        if (![RaceStatus.SignupOpen, RaceStatus.SignupClosed].includes(race.status) && !force)
            throw new RaceError("RACE_IN_PROGRESS_OR_OVER", "Cannot resign from a race that is in progress / over");

        if (!race.racers.some(racer => racer.memberId == member.id))
            throw new RaceError("MEMBER_NOT_JOINED", "Member has not joined this race");

        race.removeRacer(member);

        await this.DataService.races.updateOne({ _id: race._id }, { $set: race });

        await this.updateRaceMessage(race, this.Client);
    }

    public async startRace(raceId: string, client: DiscordClient) {
        // Starts a race.
        let race = this.races.find(race => race._id.toString() == raceId);

        if (!race)
            throw new RaceError("RACE_NOT_FOUND", "The race ID provided does not link to a valid race");

        if (![RaceStatus.SignupOpen, RaceStatus.SignupClosed].includes(race.status))
            throw new RaceError("RACE_ALREADY_STARTED", "Cannot start a race that has already started");

        race.status = RaceStatus.Started;

        race.racers.forEach((racer, index) => {
            racer.gate = index+1;

            if (["URARA_MEMORIAM", "WEDDING_BOUQUET_THROW"].includes(race.flag)) {
                racer.assignMood(RacerMood.Great);
            } else {
                racer.assignMood();
            }
        });

        await this.DataService.races.updateOne({ _id: race._id }, { $set: race });

        await this.updateRaceMessage(race, client, false, true);

        return race;
    }

    public async getResults(raceId: string) {
        let race = this.races.find(race => race._id.toString() == raceId);

        if (!race)
            throw new RaceError("RACE_NOT_FOUND", "The race ID provided does not link to a valid race");

        if ([RaceStatus.SignupOpen, RaceStatus.SignupClosed, RaceStatus.Ended].includes(race.status))
            throw new RaceError("RACE_NOT_YET_STARTED_OR_OVER", "Cannot get results for a race that has not yet started or is already over");

        return race.getResults();
    }

    public async endRace(raceId: string, client: DiscordClient) {
        let race = this.races.find(race => race._id.toString() == raceId);

        if (!race)
            throw new RaceError("RACE_NOT_FOUND", "The race ID provided does not link to a valid race");

        if ([RaceStatus.SignupOpen, RaceStatus.SignupClosed, RaceStatus.Ended].includes(race.status))
            throw new RaceError("RACE_NOT_YET_STARTED_OR_OVER", "Cannot end a race that has not yet started or is already over");

        race.status = RaceStatus.Ended;

        await this.DataService.races.updateOne({ _id: race._id }, { $set: race });

        await this.updateRaceMessage(race, client);
    }

    private async loadRaceData() {
        this.races = (await this.DataService.races.find().toArray()).map(race => Race.fromDB(race));
        console.log(this.races);
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