// TODO: Create data storage service and build storage solution (either DB or file)

import {Collection, MongoClient} from "mongodb";
import Race from "../RaceService/types/Race";
import Character from "../RaceService/types/Character";
import Disqualification from "../RaceService/types/Disqualification";

export default class DataService {
    private client: MongoClient;

    public races: Collection<Race>;
    public characters: Collection<Character>;
    public disqualifications: Collection<Disqualification>;

    constructor() {
        this.client = new MongoClient(process.env.MONGODB_URL);

        const database = this.client.db(process.env.MONGODB_DB);

        console.log(`Connected to database: ${process.env.MONGODB_DB}`);

        this.races = database.collection<Race>("races");
        this.characters = database.collection<Character>("characters");
        this.disqualifications = database.collection<Disqualification>("disqualifications");
    }
}