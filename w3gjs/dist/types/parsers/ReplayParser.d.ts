/// <reference types="node" />
import { Header, SubHeader } from "./RawParser";
import { ReplayMetadata } from "./MetadataParser";
import { GameDataBlock } from "./GameDataParser";
import { EventEmitter } from "events";
export declare type ParserOutput = {
    header: Header;
    subheader: SubHeader;
    metadata: ReplayMetadata;
};
export declare type BasicReplayInformation = ParserOutput;
export default interface ReplayParser {
    on(event: "gamedatablock", listener: (block: GameDataBlock) => void): this;
    on(event: "basic_replay_information", listener: (data: BasicReplayInformation) => void): this;
}
export default class ReplayParser extends EventEmitter {
    private rawParser;
    private metadataParser;
    private gameDataParser;
    constructor();
    parse(input: Buffer): Promise<ParserOutput>;
}
