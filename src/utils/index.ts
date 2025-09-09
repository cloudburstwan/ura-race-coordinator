import {AptitudeLevel} from "../services/RaceService/types/Character";
import DiscordClient from "../DiscordClient";
import {CollectorFilter, DMChannel, Message, TextChannel} from "discord.js";
import {Collection} from "mongodb";

export function getRandomUma() {
    const randomCharacterNames = ["Special Week", "Silence Suzuka", "Gold Ship", "Haru Urara", "Rice Shower", "Grass Wonder", "El Condor Pasa", "Symboli Rudolf", "Air Groove", "Tokai Teio", "Mejiro Mcqueen", "Agnes Tachyon", "Matikanetannhäuser", "Curren Chan"];

    return randomCharacterNames[Math.floor(Math.random() * randomCharacterNames.length)];
}

export function aptitudeToText(aptitude: AptitudeLevel): string {
    switch (aptitude) {
        case AptitudeLevel.S:
            return "S";
        case AptitudeLevel.A:
            return "A";
        case AptitudeLevel.B:
            return "B";
        case AptitudeLevel.C:
            return "C";
        case AptitudeLevel.D:
            return "D";
        case AptitudeLevel.E:
            return "E";
        case AptitudeLevel.F:
            return "F";
        case AptitudeLevel.G:
            return "G";
        default:
            return "";
    }
}

export function aptitudeToEmoji(aptitude: AptitudeLevel): string {
    switch (aptitude) {
        case AptitudeLevel.S:
            return "aptitude_s";
        case AptitudeLevel.A:
            return "aptitude_a";
        case AptitudeLevel.B:
            return "aptitude_b";
        case AptitudeLevel.C:
            return "aptitude_c";
        case AptitudeLevel.D:
            return "aptitude_d";
        case AptitudeLevel.E:
            return "aptitude_e";
        case AptitudeLevel.F:
            return "aptitude_f";
        case AptitudeLevel.G:
            return "aptitude_g";
        default:
            return "";
    }
}

export function waitForMessage(channel: TextChannel | DMChannel, filter: any = () => true): Promise<Message> {
    const collector = channel.createMessageCollector({ filter, time: 60_000 });

    return new Promise((res, rej) => {
        collector.on("collect", message => {
            console.log(message.content);
            res(message)
        });
        collector.on("end", collected => collected.size == 0 ? rej() : null);
    });
}