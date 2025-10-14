import {ObjectId} from "mongodb";
import {Snowflake} from "discord.js";

export default class Configuration {
    public _id: ObjectId;
    public guild: Snowflake;

    public channels: {
        announce: Snowflake,
        jp_announce: Snowflake,
        oversees_announce: Snowflake,
        daily_announce: Snowflake,
        events: {
            wedding_guest_chat: Snowflake
        }
    }
}

export enum ConfiguationMetadataItemType {
    String,
    Number,
    Boolean,
    Channel
}

export const ConfigurationMetadata = {
    channels: {
        announce: {
            description: "The channel that important announcements are sent to",
            type: ConfiguationMetadataItemType.Channel
        },
        jp_announce: {
            description: "The channel that Graded (JP) races are announced in",
            type: ConfiguationMetadataItemType.Channel
        },
        overseas_announce: {
            description: "The channel that Graded (Non-JP) races are announced in",
            type: ConfiguationMetadataItemType.Channel
        },
        daily_announce: {
            description: "The channel that Non-graded races are announced in",
            type: ConfiguationMetadataItemType.Channel
        },
        events: {
            wedding_guest_chat: {
                description: "The channel used as the guest channel for a wedding. Used with the `Wedding - Bouquet Throw` race modifier flag",
                type: ConfiguationMetadataItemType.Channel
            }
        }
    }
}