// TODO: Build race service to handle processing of races.

import Race, {DistanceType, RaceStatus, RaceType, SurfaceType, TrackConditionType, WeatherType} from "./types/Race";
import DataService from "../DataService";
import DiscordClient from "../../DiscordClient";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    GuildMember,
    MessageActionRowComponentBuilder,
    MessageFlagsBitField, PublicThreadChannel,
    SeparatorBuilder,
    SeparatorSpacingSize,
    Snowflake,
    TextChannel,
    TextDisplayBuilder
} from "discord.js";
import {RacerMood} from "./types/Racer";

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
        let surfaceEmoji: string;
        switch (race.surface) {
            case SurfaceType.Dirt:
                surfaceEmoji = client.getEmojiString("surface_dirt");
                break;
            case SurfaceType.Turf:
                surfaceEmoji = client.getEmojiString("surface_turf");
                break;
        }
        let weatherEmoji: string;
        switch (race.weather) {
            case WeatherType.Sunny:
                weatherEmoji = "☀️";
                break;
            case WeatherType.Cloudy:
                weatherEmoji = "☁️";
                break;
            case WeatherType.Rainy:
                weatherEmoji = "🌧️";
                break;
            case WeatherType.Snowy:
                weatherEmoji = "🌨️";
                break;
        }

        let raceName = race.name
            .replaceAll(/[\[(]G1[\])]/gi, client.getEmojiString("racegrade_g1"))
            .replaceAll(/[\[(]G2[\])]/gi, client.getEmojiString("racegrade_g2"))
            .replaceAll(/[\[(]G3[\])]/gi, client.getEmojiString("racegrade_g3"))
            .replaceAll(/[\[(]OPEN[\])]/gi, client.getEmojiString("racegrade_open"))
            .replaceAll(/[\[(]PRE-OPEN[\])]/gi, client.getEmojiString("racegrade_preopen"))
            .replaceAll(/[\[(]MAIDEN[\])]/gi, client.getEmojiString("racegrade_maiden"))
            .replaceAll(/[\[(]DEBUT[\])]/gi, client.getEmojiString("racegrade_debut"))
            .replaceAll(/[\[(]EX[\])]/gi, client.getEmojiString("racegrade_exhibition"));

        const component = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${raceName}`),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Location:** <#${race.channelId}>`),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Time:** ${race.flag == "WEDDING_BOUQUET_THROW" ? "When the vows are said, the rings worn, and the kisses given." : `<t:${Math.floor(race.startingTimestamp / 1000)}:F>`}`),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Surface:** ${surfaceEmoji} ${race.surface == SurfaceType.Dirt ? "Dirt" : "Turf"}`),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Distance**: ${race.distanceMetres}M (${DistanceType[race.distance]})`),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Weather:** ${weatherEmoji} ${WeatherType[race.weather]}`),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Track Condition:** ${TrackConditionType[race.trackCondition]}`),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Maximum available slots:** ${race.maxRacers}`),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Status:** ${race.status == RaceStatus.SignupOpen && race.racers.length < race.maxRacers ? "Signups Open" : "Signups Closed"}`),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("Press the sign up button to sign up!\nIf you wish to retract your signup, press the \"resign\" button. No worries if you press it by accident, you can just press the sign-up button again."),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("### Current Racers:"),
            );

        if (race.flag == "URARA_MEMORIAM")
            component.setAccentColor(16745656);

        if (race.racers.length == 0) {
            component.addTextDisplayComponents(
                new TextDisplayBuilder().setContent("No racers have signed up yet.")
            );
        } else {
            for (let racerIndex in race.racers) {
                component.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`[#${useGate ? race.racers[racerIndex].gate : parseInt(racerIndex) + 1}] **${race.racers[racerIndex].characterName}** (<@${race.racers[racerIndex].memberId}>)`),
                );
            }
        }

        component.addActionRowComponents(
            new ActionRowBuilder<MessageActionRowComponentBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Success)
                        .setLabel(`Join Race (${race.racers.length}/${race.maxRacers})`)
                        .setEmoji({
                            name: "🏃",
                        })
                        .setCustomId(`race-signup/${race._id}`)
                        .setDisabled(race.status != RaceStatus.SignupOpen || race.racers.length >= race.maxRacers),
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Danger)
                        .setLabel("Resign (Leave Race)")
                        .setCustomId(`race-resign/${race._id}`)
                        .setDisabled(![RaceStatus.SignupOpen, RaceStatus.SignupClosed].includes(race.status))
                )
        )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# Race ID: ${race._id}`),
            )

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
                     "BAD_CHARACTER_NAME" | "RACE_ALREADY_STARTED" | "RACE_NOT_YET_STARTED_OR_OVER"