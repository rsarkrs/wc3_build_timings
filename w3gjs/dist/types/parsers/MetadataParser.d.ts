/// <reference types="node" />
import { DataBlock } from "./RawParser";
import StatefulBufferParser from "./StatefulBufferParser";
export declare type ReplayMetadata = {
    gameData: Buffer;
    map: MapMetadata;
    playerRecords: PlayerRecord[];
    slotRecords: SlotRecord[];
    reforgedPlayerMetadata: ReforgedPlayerMetadata[];
    randomSeed: number;
    gameName: string;
    startSpotCount: number;
};
declare type PlayerRecord = {
    playerId: number;
    playerName: string;
};
declare type SlotRecord = {
    playerId: number;
    slotStatus: number;
    computerFlag: number;
    teamId: number;
    color: number;
    raceFlag: number;
    aiStrength: number;
    handicapFlag: number;
};
declare type ReforgedPlayerMetadata = {
    playerId: number;
    name: string;
    clan: string;
};
declare type MapMetadata = {
    speed: number;
    hideTerrain: boolean;
    mapExplored: boolean;
    alwaysVisible: boolean;
    default: boolean;
    observerMode: number;
    teamsTogether: boolean;
    fixedTeams: boolean;
    fullSharedUnitControl: boolean;
    randomHero: boolean;
    randomRaces: boolean;
    referees: boolean;
    mapChecksum: string;
    mapChecksumSha1: string;
    mapName: string;
    creator: string;
};
export default class MetadataParser extends StatefulBufferParser {
    private mapmetaParser;
    parse(blocks: DataBlock[]): Promise<ReplayMetadata>;
    private parseSlotRecords;
    private parseReforgedPlayerMetadata;
    private parseEncodedMapMetaString;
    private parsePlayerList;
    private parseHostRecord;
    private decodeGameMetaString;
}
export {};
