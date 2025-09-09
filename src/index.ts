import DiscordClient from "./DiscordClient";
import * as fs from "node:fs";
import path from "path";

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "config.json")).toString().trim());

new DiscordClient(config).init();