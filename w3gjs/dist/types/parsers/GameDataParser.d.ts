/// <reference types="node" />
import { EventEmitter } from "events";
import { Action } from "./ActionParser";
export declare type LeaveGameBlock = {
    id: 0x17;
    playerId: number;
    reason: string;
    result: string;
};
export declare type TimeslotBlock = {
    id: 0x1f | 0x1e;
    timeIncrement: number;
    commandBlocks: CommandBlock[];
};
export declare type CommandBlock = {
    playerId: number;
    actions: Action[];
};
export declare type PlayerChatMessageBlock = {
    id: 0x20;
    playerId: number;
    mode: number;
    message: string;
};
export declare type GameDataBlock = LeaveGameBlock | TimeslotBlock | PlayerChatMessageBlock;
export default class GameDataParser extends EventEmitter {
    private actionParser;
    private parser;
    constructor();
    parse(data: Buffer): Promise<void>;
    private parseBlock;
    private parseUnknown0x22;
    private parseChatMessage;
    private parseLeaveGameBlock;
    private parseTimeslotBlock;
}
