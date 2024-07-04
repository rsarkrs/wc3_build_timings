"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zlib_1 = require("zlib");
const StatefulBufferParser_1 = __importDefault(require("./StatefulBufferParser"));
const protobufjs_1 = require("protobufjs");
const protoPlayer = new protobufjs_1.Type("ReforgedPlayerData")
    .add(new protobufjs_1.Field("playerId", 1, "uint32"))
    .add(new protobufjs_1.Field("battleTag", 2, "string"))
    .add(new protobufjs_1.Field("clan", 3, "string"))
    .add(new protobufjs_1.Field("portrait", 4, "string"))
    .add(new protobufjs_1.Field("team", 5, "uint32"))
    .add(new protobufjs_1.Field("unknown", 6, "string"));
const inflatePromise = (buffer, options = {}) => new Promise((resolve, reject) => {
    zlib_1.inflate(buffer, options, (err, result) => {
        err !== null ? reject(err) : resolve(result);
    });
});
class MetadataParser extends StatefulBufferParser_1.default {
    constructor() {
        super(...arguments);
        this.mapmetaParser = new StatefulBufferParser_1.default();
    }
    async parse(blocks) {
        const buffs = [];
        for (const block of blocks) {
            const block2 = await inflatePromise(block.blockContent, {
                finishFlush: zlib_1.constants.Z_SYNC_FLUSH,
            });
            if (block2.byteLength > 0 && block.blockContent.byteLength > 0) {
                buffs.push(block2);
            }
        }
        this.initialize(Buffer.concat(buffs));
        this.skip(5);
        const playerRecords = [];
        playerRecords.push(this.parseHostRecord());
        const gameName = this.readZeroTermString("utf-8");
        this.readZeroTermString("utf-8"); // privateString
        const encodedString = this.readZeroTermString("hex");
        const mapMetadata = this.parseEncodedMapMetaString(this.decodeGameMetaString(encodedString));
        this.skip(12);
        const playerListFinal = playerRecords.concat(playerRecords, this.parsePlayerList());
        let reforgedPlayerMetadata = [];
        if (this.readUInt8() !== 25) {
            this.skip(-1);
            reforgedPlayerMetadata = this.parseReforgedPlayerMetadata();
        }
        this.skip(2);
        const slotRecordCount = this.readUInt8();
        const slotRecords = this.parseSlotRecords(slotRecordCount);
        const randomSeed = this.readUInt32LE();
        this.skip(1);
        const startSpotCount = this.readUInt8();
        return {
            gameData: this.buffer.slice(this.getOffset()),
            map: mapMetadata,
            playerRecords: playerListFinal,
            slotRecords,
            reforgedPlayerMetadata,
            randomSeed,
            gameName,
            startSpotCount,
        };
    }
    parseSlotRecords(count) {
        const slots = [];
        for (let i = 0; i < count; i++) {
            const record = {};
            record.playerId = this.readUInt8();
            this.skip(1);
            record.slotStatus = this.readUInt8();
            record.computerFlag = this.readUInt8();
            record.teamId = this.readUInt8();
            record.color = this.readUInt8();
            record.raceFlag = this.readUInt8();
            record.aiStrength = this.readUInt8();
            record.handicapFlag = this.readUInt8();
            slots.push(record);
        }
        return slots;
    }
    parseReforgedPlayerMetadata() {
        const result = [];
        while (this.readUInt8() === 0x39) {
            const subtype = this.readUInt8();
            const followingBytes = this.readUInt32LE();
            const data = this.buffer.slice(this.offset, this.offset + followingBytes);
            if (subtype === 0x3) {
                const decoded = protoPlayer.decode(data);
                if (decoded.clan === undefined) {
                    decoded.clan = "";
                }
                result.push({
                    playerId: decoded.playerId,
                    name: decoded.battleTag,
                    clan: decoded.clan,
                });
            }
            else if (subtype === 0x4) {
            }
            this.skip(followingBytes);
        }
        return result;
    }
    parseEncodedMapMetaString(buffer) {
        const parser = this.mapmetaParser;
        parser.initialize(buffer);
        const speed = parser.readUInt8();
        const secondByte = parser.readUInt8();
        const thirdByte = parser.readUInt8();
        const fourthByte = parser.readUInt8();
        parser.skip(5);
        const checksum = parser.readStringOfLength(4, "hex");
        parser.skip(0);
        const mapName = parser.readZeroTermString("utf-8");
        const creator = parser.readZeroTermString("utf-8");
        parser.skip(1);
        const checksumSha1 = parser.readStringOfLength(20, "hex");
        return {
            speed,
            hideTerrain: !!(secondByte & 0b00000001),
            mapExplored: !!(secondByte & 0b00000010),
            alwaysVisible: !!(secondByte & 0b00000100),
            default: !!(secondByte & 0b00001000),
            observerMode: (secondByte & 0b00110000) >>> 4,
            teamsTogether: !!(secondByte & 0b01000000),
            fixedTeams: !!(thirdByte & 0b00000110),
            fullSharedUnitControl: !!(fourthByte & 0b00000001),
            randomHero: !!(fourthByte & 0b00000010),
            randomRaces: !!(fourthByte & 0b00000100),
            referees: !!(fourthByte & 0b01000000),
            mapName: mapName,
            creator: creator,
            mapChecksum: checksum,
            mapChecksumSha1: checksumSha1,
        };
    }
    parsePlayerList() {
        const list = [];
        while (this.readUInt8() === 22) {
            list.push(this.parseHostRecord());
            this.skip(4);
        }
        this.skip(-1);
        return list;
    }
    parseHostRecord() {
        const playerId = this.readUInt8();
        const playerName = this.readZeroTermString("utf-8");
        const addData = this.readUInt8();
        if (addData === 1) {
            this.skip(1);
        }
        else if (addData === 2) {
            this.skip(2);
        }
        else if (addData === 8) {
            this.skip(8);
        }
        return { playerId, playerName };
    }
    decodeGameMetaString(str) {
        const hexRepresentation = Buffer.from(str, "hex");
        const decoded = Buffer.alloc(hexRepresentation.length);
        let mask = 0;
        let dpos = 0;
        for (let i = 0; i < hexRepresentation.length; i++) {
            if (i % 8 === 0) {
                mask = hexRepresentation[i];
            }
            else {
                if ((mask & (0x1 << i % 8)) === 0) {
                    decoded.writeUInt8(hexRepresentation[i] - 1, dpos++);
                }
                else {
                    decoded.writeUInt8(hexRepresentation[i], dpos++);
                }
            }
        }
        return decoded;
    }
}
exports.default = MetadataParser;
//# sourceMappingURL=MetadataParser.js.map