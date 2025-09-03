// TODO: Base text interaction from which all text-based commands are built from

import {Message, Role, Snowflake} from "discord.js";
import DiscordClient from "../DiscordClient";

export default class TextInteraction {
    public info: TextCommandBuilder;

    public async execute(message: Message, regexMatch: RegExpExecArray, client: DiscordClient) {
        return;
    }
}

export class TextCommandBuilder {
    public name: string;
    public match: RegExp;
    public rolesRequired: Snowflake[] = [];

    constructor() {}

    public setName(name: string) {
        this.name = name;
        return this;
    }

    public setRegexMatch(regex: RegExp) {
        this.match = regex;
        return this;
    }

    public addRole(role: Role | Snowflake) {
        this.rolesRequired.push(role instanceof Role ? role.id : role);
        return this;
    }

    public build() {
        return {
            name: this.name,
            match: this.match,
            requiredRoles: this.rolesRequired
        }
    }
}