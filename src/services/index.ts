import DataService from "./DataService";
import RaceService from "./RaceService";
import DiscordClient from "../DiscordClient";

const dataService = new DataService();

export default function getServices(client: DiscordClient): Services {
    const raceService = new RaceService(dataService, client);

    return {
        data: dataService,
        race: raceService
    }
}

interface Services {
    data: DataService,
    race: RaceService
}