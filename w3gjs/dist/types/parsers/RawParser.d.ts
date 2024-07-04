/// <reference types="node" />
import StatefulBufferParser from "./StatefulBufferParser";
export declare type Header = {
    compressedSize: number;
    headerVersion: string;
    decompressedSize: number;
    compressedDataBlockCount: number;
};
export declare type SubHeader = {
    gameIdentifier: string;
    version: number;
    buildNo: number;
    replayLengthMS: number;
};
declare type RawReplayData = {
    header: Header;
    subheader: SubHeader;
    blocks: DataBlock[];
};
export declare type DataBlock = {
    blockSize: number;
    blockDecompressedSize: number;
    blockContent: Buffer;
};
export default class CustomReplayParser extends StatefulBufferParser {
    private header;
    private subheader;
    constructor();
    parse(input: Buffer): Promise<RawReplayData>;
    private parseBlocks;
    private parseBlock;
    private parseSubheader;
    private findParseStartOffset;
    private parseHeader;
}
export {};
