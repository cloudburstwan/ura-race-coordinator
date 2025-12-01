import {AptitudeLevel} from "../services/RaceService/types/Character";
import DiscordClient from "../DiscordClient";
import {CollectorFilter, DMChannel, Message, TextChannel} from "discord.js";
import {Collection} from "mongodb";

/**
 * Get a random Umamusume name from a preset list of known Umamusume.
 */
export function getRandomUma() {
    const randomCharacterNames = ["Special Week", "Silence Suzuka", "Gold Ship", "Haru Urara", "Rice Shower", "Grass Wonder", "El Condor Pasa", "Symboli Rudolf", "Air Groove", "Tokai Teio", "Mejiro Mcqueen", "Agnes Tachyon", "Matikanetannhäuser", "Curren Chan"];

    return randomCharacterNames[Math.floor(Math.random() * randomCharacterNames.length)];
}

export function calculateSkillBonus(rolls: number[]) {
    const t = 5; // Saturation Constant
    const penalty = 5; // Underuse penalty
    const N0 = 30; // overuse threshold
    const alpha = 0.15; // Overuse penalty factor
    const p = 1.5; // Overuse exponent

    const R = rolls.reduce((a, b) => a + b, 0) / rolls.length;

    const base = R * (1 - Math.exp(-rolls.length / t));
    const lowPenalty = penalty / (rolls.length + 1);
    const overusePenalty = alpha * Math.pow(Math.max(0, rolls.length - N0), p);

    return Math.max(0, base - lowPenalty - overusePenalty);
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

export function addLeadingZero(number: number) {
    if (number < 10) return `0${number}`;
    return `${number}`
}

export function numberSuffix(number: number) {
    if (number.toString().endsWith("1") && !number.toString().endsWith("11"))
        return "st";
    if (number.toString().endsWith("2") && !number.toString().endsWith("12"))
        return "nd";
    if (number.toString().endsWith("3") && !number.toString().endsWith("13"))
        return "rd";
    return "th";
}

export function roundToQuarter(number: number): number {
    return Math.round(number*4)/4;
}

export function randomInt(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function rollXTimes(times: number, min: number, max: number) {
    let result = 0;
    for (let i = 0; i < times; i++) {
        result += randomInt(min, max);
    }
    return result;
}

export function emojifyRaceName(raceName: string, client: DiscordClient): string {
    return raceName
        .replaceAll(/[\[(]G1[\])]/gi, client.getEmojiString("racegrade_g1"))
        .replaceAll(/[\[(]G2[\])]/gi, client.getEmojiString("racegrade_g2"))
        .replaceAll(/[\[(]G3[\])]/gi, client.getEmojiString("racegrade_g3"))
        .replaceAll(/[\[(]OPEN[\])]/gi, client.getEmojiString("racegrade_open"))
        .replaceAll(/[\[(]PRE-OPEN[\])]/gi, client.getEmojiString("racegrade_preopen"))
        .replaceAll(/[\[(]MAIDEN[\])]/gi, client.getEmojiString("racegrade_maiden"))
        .replaceAll(/[\[(]DEBUT[\])]/gi, client.getEmojiString("racegrade_debut"))
        .replaceAll(/[\[(]EX[\])]/gi, client.getEmojiString("racegrade_exhibition"))
        .replaceAll(/[\[(]FLOWER[\])]/gi, client.getEmojiString("racegrade_flower"));
}

/**
 * Truncates the string at maxLength, with optional ellipse (...)
 * @caution If `useEllipse`, `maxLength` is automatically lowered by 3 to ensure
 * the string you receive is exactly `maxLength` or lower.
 * @param string The string to truncate
 * @param maxLength The maximum length of the output string
 * @param useEllipse Whether to use ellipse at the end to imply that the string has been truncated (default: true)
 */
export function truncate(string: string, maxLength: number, useEllipse: boolean = true) {
    return `${string.split("").splice(0, useEllipse ? maxLength-3 : maxLength).join("")}${useEllipse ? "..." : ""}`;
}