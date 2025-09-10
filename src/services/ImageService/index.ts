// TODO: Service responsible for generating images in real-time (e.g. for scoreboards)
import { createCanvas, loadImage } from "canvas";
import {Placement, SurfaceType} from "../RaceService/types/Race";

const baseUrl = "https://s3.cloudburst.lgbt/race-assets";
const imagePositions = {
    gateNumbers: {
        0: [128, 120],
        1: [128, 200],
        2: [128, 280],
        3: [128, 360],
        4: [128, 440]
    }
}

export default class ImageService {
    static async drawScoreboard(status: ScoreStatus, placements: number[], surface: SurfaceType, baseImageModifier?: string) {
        let base = await loadImage(`${baseUrl}/base${baseImageModifier ? `_${baseImageModifier}` : ""}.png`);

        const canvas = createCanvas(base.width, base.height);
        const ctx = canvas.getContext("2d");

        ctx.drawImage(base, 0, 0, base.width, base.height);

        for (let i = 0; i < Math.min(5, placements.length); i++) {
            let image = await loadImage(`${baseUrl}/components/racer_gate_number/${placements[i]}.png`);

            ctx.drawImage(image, imagePositions.gateNumbers[i][0], imagePositions.gateNumbers[i][1]);
        }

        return canvas.createPNGStream();
    }
}

interface SurfaceInfo {
    turf: SurfaceType,
    dirt: SurfaceType
}

export enum ScoreStatus {
    None,
    Review,
    Final
}