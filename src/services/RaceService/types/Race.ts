import {
    ChannelResolvable,
    GuildMember, Message,
    MessageFlagsBitField,
    PublicThreadChannel,
    Snowflake,
    TextChannel
} from "discord.js";
import Racer, {RacerMood, RacerStatus} from "./Racer";
import DiscordClient from "../../../DiscordClient";
import Disqualification, {DisqualificationType} from "./Disqualification";
import {EnhancedOmit, Filter, InferIdType, ObjectId} from "mongodb";
import {rollXTimes} from "../../../utils";
import {RaceError} from "../index";
import createRaceSignupComponent from "../../../components/RaceSignupComponent";
import createRaceStartComponent from "../../../components/RaceStartComponent";

export default class Race {
    public name: string;
    public type: RaceType;
    public status: RaceStatus = RaceStatus.SignupOpen;
    public channelId: Snowflake;
    public messageId: Snowflake; // DEPRECATED: Now tracking multiple messages, use messageReferences
    public messageReferences: MessageReference;
    public startingAt: Date;
    public startingTimestamp: number;
    public surface: SurfaceType;
    public distanceMetres: number;
    public distance: DistanceType;
    public weather: WeatherType;
    public trackCondition: TrackConditionType;
    public maxRacers: number;
    public flag: RaceFlag;
    public _id?: ObjectId;

    public racers: Racer[] = [];
    public queued: Racer[] = [];

    constructor(name: string, type: RaceType, channelId: Snowflake, startingAt: Date, surface: SurfaceType, distance: number, weather: WeatherType, trackCondition: TrackConditionType, maxRacers: number, flag?: RaceFlag) {
        this.name = name;
        this.type = type;
        this.channelId = channelId;
        this.messageReferences = {
            signup: null,
            start: null
        };
        this.startingAt = startingAt;
        this.startingTimestamp = startingAt.getTime();
        this.surface = surface;
        this.distanceMetres = distance;
        if (distance <= 1400)
            this.distance = DistanceType.Sprint;
        else if (distance <= 1800)
            this.distance = DistanceType.Mile;
        else if (distance <= 2400)
            this.distance = DistanceType.Medium;
        else
            this.distance = DistanceType.Long;
        this.weather = weather;
        this.trackCondition = trackCondition;
        this.maxRacers = maxRacers;
        this.flag = flag;
    }

    private async getSignupChannel(client: DiscordClient) {
        let channel: TextChannel | PublicThreadChannel;
        if (this.type == RaceType.NonGraded)
            channel = await client.guild.channels.fetch(client.config.channels.daily_announce) as TextChannel;
        else if (this.type == RaceType.GradedDomestic)
            channel = await client.guild.channels.fetch(client.config.channels.jp_announce) as TextChannel;
        else if (this.type == RaceType.GradedInternational)
            channel = await client.guild.channels.fetch(client.config.channels.overseas_announce) as TextChannel;
        else
            channel = await client.guild.channels.fetch(client.config.channels.announce) as TextChannel;

        if (this.flag == "WEDDING_BOUQUET_THROW")
            channel = await client.guild.channels.fetch(client.config.channels.events.wedding_guest_chat) as TextChannel;
        if (this.flag == "LEGEND_RACE")
            channel = await client.guild.channels.fetch(client.config.channels.legend_announce) as TextChannel;

        return channel;
    }

    public async updateRaceSignupMessage(client: DiscordClient, newRace: boolean = false, useGate: boolean = false) {
        let component = createRaceSignupComponent(this, client, useGate);

        const channel = await this.getSignupChannel(client);

        if (newRace) {
            let message = await channel.send({
                components: [ component ],
                flags: MessageFlagsBitField.Flags.IsComponentsV2
            });

            this.messageReferences.signup = message.id;

            await client.services.data.races.updateOne({ _id: this._id }, { $set: this });

            return {
                channel: message.channelId
            }
        } else {
            let message = await channel.messages.fetch(this.messageReferences.signup);

            console.log(message.edit);

            if (message.edit == undefined) {
                console.warn(`Tried to find message id ${this.messageReferences.signup} in channel id ${channel.id} but could not find it, or could not edit.`);
                return;
            }

            await message.edit({
                components: [ component ],
                flags: MessageFlagsBitField.Flags.IsComponentsV2
            });
        }
    }

    public async updateRaceStartMessage(client: DiscordClient, createMessage: boolean = false) {
        const channel = await client.guild.channels.fetch(this.channelId) as TextChannel;
        const component = createRaceStartComponent(this, client);

        if (createMessage) {
            let message = await channel.send({
                components: [ component.component ],
                flags: MessageFlagsBitField.Flags.IsComponentsV2
            });
            await message.reply({
                content: `${component.mentions.join(" ")}`
            });

            this.messageReferences.start = message.id;

            await client.services.data.races.updateOne({ _id: this._id }, { $set: this });
        } else {
            let message = await channel.messages.fetch(this.messageReferences.start);

            if (message == undefined) {
                console.warn(`Tried to find message id ${this.messageReferences.signup} in channel id ${channel.id}.`);
                return;
            }

            await message.edit({
                components: [ component.component ],
                flags: MessageFlagsBitField.Flags.IsComponentsV2
            });
        }
    }

    public async destroy(client: DiscordClient) {
        const signupChannel = await this.getSignupChannel(client);
        const signupMessage = await signupChannel.messages.fetch(this.messageReferences.signup);
        await signupMessage.delete();

        if (![RaceStatus.SignupOpen, RaceStatus.SignupClosed].includes(this.status)) {
            const startChannel = await client.channels.fetch(this.channelId) as TextChannel;
            const startMessage = await startChannel.messages.fetch(this.messageReferences.start);
            await startMessage.delete();
        }

        await client.services.data.races.deleteOne({ _id: this._id });
    }

    public async cancel(client: DiscordClient) {
        if (![RaceStatus.SignupOpen, RaceStatus.SignupClosed].includes(this.status))
            throw new RaceError("RACE_IN_PROGRESS_OR_OVER", "Cannot cancel a race that is in progress or already over");

        await this.updateRaceSignupMessage(client, false, false);

        this.status = RaceStatus.Cancelled;

        await client.services.data.races.updateOne({ _id: this._id }, { $set: this });
    }

    public async start(client: DiscordClient) {
        // TODO: Migrate race start code from RaceService.
        if (![RaceStatus.SignupOpen, RaceStatus.SignupClosed].includes(this.status))
            throw new RaceError("RACE_ALREADY_STARTED", "Cannot start a race that has already started");

        this.status = RaceStatus.Started;

        // Assign moods
        this.racers.map((racer, index) => {
            racer.gate = index + 1;

            if (["URARA_MEMORIAM", "WEDDING_BOUQUET_THROW"].includes(this.flag))
                racer.assignMood(RacerMood.Great);
            else if (this.flag == "LEGEND_RACE" && racer.memberId == client.config.users.legend_racer)
                racer.assignMood(RacerMood.Great);
            else
                racer.assignMood();
        });

        // Assign favorites
        await this.getFavorites(client);

        await client.services.data.races.updateOne({ _id: this._id }, { $set: this });

        await this.updateRaceSignupMessage(client, false, true);

        await this.updateRaceStartMessage(client, true);

        if (client.config.experiments.includes("RACER_ATTENDANCE_CHECKER")) {
            client.registerEventSubscription<"messageCreate">(`attendance-check-start-${this._id.toString("hex")}`, `messageCreate`, async (msg: Message) => {
                if (msg.channelId != this.channelId) return;
                if (msg.author.bot) return;
                let potentialRacerIndex = this.racers.findIndex(racer => racer.memberId == msg.author.id);

                if (potentialRacerIndex != -1) {
                    if (this.racers[potentialRacerIndex].status == RacerStatus.Normal) return;

                    this.racers[potentialRacerIndex].status = RacerStatus.Normal;
                    await client.services.data.races.updateOne({ _id: this._id }, { $set: this });
                    await this.updateRaceStartMessage(client);
                }
            });
        }

        return this;
    }

    async end(client: DiscordClient) {
        if ([RaceStatus.SignupOpen, RaceStatus.SignupClosed, RaceStatus.Cancelled, RaceStatus.Ended].includes(this.status))
            throw new RaceError("RACE_NOT_YET_STARTED_OR_OVER", "Cannot end a race that has not yet started or is already over");

        this.status = RaceStatus.Ended;

        await client.services.data.races.updateOne({ _id: this._id }, { $set: this });

        await this.updateRaceSignupMessage(client, false, true);
        await this.updateRaceStartMessage(client);
    }

    async addRacer(memberId: Snowflake, characterName: string, client: DiscordClient, force: boolean = false) {
        const linkRegex = /(.+):\/\/(.+)/g;

        if ((this.status != RaceStatus.SignupOpen || this.racers.length >= this.maxRacers) && !force)
            throw new RaceError("RACE_SIGNUP_CLOSED_OR_FULL", "Signups are either closed or there are already too many racers");

        if (this.racers.some(racer => racer.memberId == memberId) && !force)
            throw new RaceError("USER_ALREADY_JOINED", "User has already signed up for this race");

        if (linkRegex.test(characterName))
            throw new RaceError("BAD_CHARACTER_NAME", "Sorry, your character cannot be a website.\n-# Please do not try to set your character name to a link.");

        let disqualificationSearchQuery: Filter<Disqualification> = { memberId: memberId, endsAt: { $gte: new Date() } };

        if (this.type != RaceType.NonGraded)
            disqualificationSearchQuery.type = DisqualificationType.Graded;

        if ((await client.services.data.disqualifications.find(disqualificationSearchQuery).toArray()).length > 0) {
            throw new RaceError("USER_DISQUALIFIED", "User disqualified from this race and cannot join")
        }

        if (this.flag == "URARA_MEMORIAM" && characterName != "Haru Urara")
            throw new RaceError("BAD_CHARACTER_NAME", `This race is a memoriam for Haru Urara. Only Haru Urara is allowed to race. Try racing as Haru Urara!\n-# Even if you think you can't do it, just keep on pushing ahead. She would have wanted you to try your best no matter what.`);

        let racer = new Racer(memberId, characterName);
        let gate: number;
        let favoritePosition: number;
        let mood: RacerMood;
        if (![RaceStatus.SignupOpen, RaceStatus.SignupClosed].includes(this.status)) {
            gate = Math.max(...this.racers.map(racer => racer.gate), 0) + 1;
            favoritePosition = Math.max(...this.racers.map(racer => racer.favoritePosition), 0) + 1;
            racer.status = RacerStatus.Normal; // Assumed present if added after race start.
            mood = racer.assignMood();

            racer.gate = gate;
            racer.favoritePosition = favoritePosition;
            racer.mood = mood;
        }

        this.racers.push(racer);

        await client.services.data.races.updateOne({ _id: this._id }, { $set: this });

        await this.updateRaceSignupMessage(client);
        if (![RaceStatus.SignupOpen, RaceStatus.SignupClosed, RaceStatus.Cancelled].includes(this.status))
            await this.updateRaceStartMessage(client);

        return {
            joinedLate: ![RaceStatus.SignupOpen, RaceStatus.SignupClosed].includes(this.status),
            gate,
            favoritePosition,
            mood
        }
    }

    async removeRacer(memberId: Snowflake, client: DiscordClient, force: boolean = false) {
        if (![RaceStatus.SignupOpen, RaceStatus.SignupClosed].includes(this.status) && !force)
            throw new RaceError("RACE_IN_PROGRESS_OR_OVER", "Cannot resign from a race that is in progress / over");

        let index = this.racers.findIndex(race => race.memberId == memberId);

        if (index == -1)
            throw new RaceError("USER_NOT_JOINED", "User has not joined this race");

        this.racers.splice(index, 1);

        await client.services.data.races.updateOne({ _id: this._id }, { $set: this });

        await this.updateRaceSignupMessage(client);
        if (![RaceStatus.SignupOpen, RaceStatus.SignupClosed, RaceStatus.Cancelled].includes(this.status))
            await this.updateRaceStartMessage(client);
    }

    public async getFavorites(client: DiscordClient) {
        let takenFavoritePositions = [];

        // Populate with legend racer favorite override
        if (this.flag == "LEGEND_RACE") {
            takenFavoritePositions.push(1);
        }

        // Populate with existing overridden favorite positions
        for (let identifier in client.config.overrides.favorite) {
            let position = 0;
            switch (client.config.overrides.favorite[identifier]) {
                case "L": // Always last place
                    position = this.racers.length;
                    break;
                default:
                    position = client.config.overrides.favorite[identifier];
            }

            takenFavoritePositions.push(position);
        }

        let racersWithFavorites = this.racers
            .map(racer => {
                let possibleFavoritePositions = [];

                for (let i = 0; i < this.racers.length; i++) {
                    if (!takenFavoritePositions.includes(i+1))
                        possibleFavoritePositions.push(i+1);
                }

                let favorite = possibleFavoritePositions[Math.floor(Math.random() * possibleFavoritePositions.length)];

                if (this.flag == "LEGEND_RACE" && racer.memberId == client.config.users.legend_racer) {
                    favorite = 1;
                }

                if (Object.keys(client.config.overrides.favorite).includes(`${racer.memberId}/${racer.characterName}`) && this.flag != "LEGEND_RACE") {
                    favorite = client.config.overrides.favorite[`${racer.memberId}/${racer.characterName}`] == "L" ?
                        this.racers.length :
                        client.config.overrides.favorite[`${racer.memberId}/${racer.characterName}`];
                }

                takenFavoritePositions.push(favorite);

                return Object.assign({ favoritePosition: favorite }, racer);
            })
            .sort((racer1, racer2) => racer1.favoritePosition < racer2.favoritePosition ? -1 : 1);

        for (let index in this.racers) {
            this.racers[index].favoritePosition = racersWithFavorites.findIndex(racer => racer.memberId == this.racers[index].memberId && racer.characterName == this.racers[index].characterName)
        }
    }

    getResults() {
        if (this.type == RaceType.NonGraded) {
            // TODO: Non-graded results'

            return [];
        } else {
            let placements: Placement[] = [];

            this.racers.forEach(racer => {
                for (let i = 0; i < 5; i++) {
                    racer.scores.push(0);
                }

                racer.overallScore = 0;

                if (this.flag == "URARA_MEMORIAM") return;

                // TODO: Actually write this code
            });

            this.racers.sort(() => Math.floor(Math.random() * 2) == 1 ? -1 : 1); // Tiebreak
            this.racers.sort((a, b) => a.overallScore > b.overallScore ? -1 : 1);

            for (let place in this.racers) {
                let index = parseInt(place);
                let marginType: MarginType = MarginType.None;
                let distance: number = 0;
                if (index >= 1 && this.racers[index-1].overallScore == this.racers[index].overallScore) {
                    marginType = MarginType.DeadHeat;
                } else if (index >= 1) {
                    // TODO: Write placement code
                }

                placements.push({
                    position: marginType == MarginType.DeadHeat ? index - 1 : index,
                    gate: (this.racers[index] as ({gate: number} & Racer)).gate,
                    racer: this.racers[index],
                    marginType: marginType,
                    marginNumber: distance
                });
            }

            console.log(placements);

            return placements;
        }
    }

    public static fromDB(data: EnhancedOmit<Race, "_id"> & { _id: InferIdType<Race> }) {
        if (data === null) return null;
        if (data === undefined) return undefined;

        let result = new this(data.name, data.type, data.channelId, data.startingAt, data.surface, data.distance, data.weather, data.trackCondition, data.maxRacers, data.flag);

        result.status = data.status;

        // MIGRATION: data.messageId => result.messageReferences.signup
        // TRIGGERS: If data.messageReferences is undefined (non-existent)
        if (data.messageReferences == undefined) {
            result.messageReferences = {
                signup: data.messageId,
                start: null
            };
        } else {
            result.messageReferences = data.messageReferences;
        }
        result.distanceMetres = data.distanceMetres;
        result.distance = data.distance;
        result._id = data._id;

        for (let i in data.racers) {
            result.racers[i] = Racer.fromDB(data.racers[i]);
        }
        for (let i in data.queued) {
            result.queued[i] = Racer.fromDB(data.queued[i]);
        }

        return result;
    }
}

export function raceStatusToString(status: RaceStatus): string {
    switch (status) {
        case RaceStatus.SignupOpen:
            return "Signups Open";
        case RaceStatus.SignupClosed:
            return "Signup Closed";
        case RaceStatus.Started:
        case RaceStatus.GateOpen:
        case RaceStatus.Early:
        case RaceStatus.Middle:
        case RaceStatus.Late:
        case RaceStatus.FinalSpurt:
            return "Race Ongoing";
        case RaceStatus.Ended:
            return "Race Concluded";
        case RaceStatus.Cancelled:
            return "Race Cancelled";
        default:
            return status;
    }
}

export type RaceFlag = "URARA_MEMORIAM" | "WEDDING_BOUQUET_THROW" | "LEGEND_RACE" | "SPECIAL";
export const RaceFlagOptions: {name: string, value: RaceFlag}[] = [
    { name: "Haru Urara Memoriam", value: "URARA_MEMORIAM" },
    { name: "Weddings: Bouquet Throw (Configure in config!)", value: "WEDDING_BOUQUET_THROW" },
    { name: "Legend Race", value: "LEGEND_RACE" },
    { name: "Special (Cosmetic)", value: "SPECIAL" }
]

export interface Placement {
    position: number,
    gate: number,
    racer: Racer
    marginType: MarginType,
    marginNumber: number
}

interface MessageReference {
    signup: Snowflake,
    start: Snowflake
}

export enum MarginType {
    None,
    Number,
    Neck,
    Head,
    Nose,
    DeadHeat,
    Distance
}

export enum RaceType {
    NonGraded,
    GradedDomestic,
    GradedInternational
}

export enum SurfaceType {
    Dirt,
    Turf
}
export enum DistanceType {
    Sprint,
    Mile,
    Medium,
    Long
}

export enum WeatherType {
    Sunny,
    Cloudy,
    Rainy,
    Snowy
}

export enum TrackConditionType {
    Firm,
    Good,
    Soft,
    Heavy
}

export enum RaceStatus {
    SignupOpen,
    SignupClosed,
    Started,
    GateOpen, // TODO: Implement staging system
    Early,
    Middle,
    Late,
    FinalSpurt, // End of above!
    Ended,
    Cancelled
}