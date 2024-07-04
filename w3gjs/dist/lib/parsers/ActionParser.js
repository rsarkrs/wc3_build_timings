"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const StatefulBufferParser_1 = __importDefault(require("./StatefulBufferParser"));
class ActionParser extends StatefulBufferParser_1.default {
    parse(input) {
        this.initialize(input);
        const actions = [];
        while (this.getOffset() < input.length) {
            try {
                const actionId = this.readUInt8();
                const action = this.parseAction(actionId);
                if (action !== null)
                    actions.push(action);
            }
            catch (ex) {
                console.log(ex);
                break;
            }
        }
        return actions;
    }
    parseAction(actionId) {
        switch (actionId) {
            case 0x1:
               // console.log(this.msElapsed);
                //console.log("0x01");
                return "pause";
                //break; action 0x1 = pause
            case 0x2:
                //console.log(this.msElapsed);
                //console.log("0x02");
                return "unpause";
                //break; action 0x2 = unpause
            case 0x3:
                this.skip(1);
                break;
            case 0x4:
            case 0x5:
                break;
            case 0x6:
                this.readZeroTermString("utf-8");
                break;
            case 0x7:
                this.skip(2);
                break;
            case 0x10: {
                const abilityFlags = this.readUInt16LE();
                const itemId = [
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                ];
                const unknownA = this.readUInt32LE();
                const unknownB = this.readUInt32LE();
                return { id: actionId, abilityFlags, itemId };
            }
            case 0x11: {
                const abilityFlags = this.readUInt16LE();
                const itemId = [
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                ];
                const unknownA = this.readUInt32LE();
                const unknownB = this.readUInt32LE();
                const targetX = this.readFloatLE();
                const targetY = this.readFloatLE();
                return { id: actionId, abilityFlags, itemId, targetX, targetY };
            }
            case 0x12: {
                const abilityFlags = this.readUInt16LE();
                const itemId = [
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                ];
                const unknownA = this.readUInt32LE();
                const unknownB = this.readUInt32LE();
                const targetX = this.readFloatLE();
                const targetY = this.readFloatLE();
                const objectId1 = this.readUInt32LE();
                const objectId2 = this.readUInt32LE();
                return {
                    id: actionId,
                    abilityFlags,
                    itemId,
                    targetX,
                    targetY,
                    objectId1,
                    objectId2,
                };
            }
            case 0x13: {
                const abilityFlags = this.readUInt16LE();
                const itemId = [
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                ];
                const unknownA = this.readUInt32LE();
                const unknownB = this.readUInt32LE();
                const targetX = this.readFloatLE();
                const targetY = this.readFloatLE();
                const objectId1 = this.readUInt32LE();
                const objectId2 = this.readUInt32LE();
                const itemObjectId1 = this.readUInt32LE();
                const itemObjectId2 = this.readUInt32LE();
                return {
                    id: actionId,
                    abilityFlags,
                    itemId,
                    targetX,
                    targetY,
                    objectId1,
                    objectId2,
                    itemObjectId1,
                    itemObjectId2,
                };
            }
            case 0x14: {
                const abilityFlags = this.readUInt16LE();
                const itemId1 = [
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                ];
                const unknownA = this.readUInt32LE();
                const unknownB = this.readUInt32LE();
                const targetAX = this.readFloatLE();
                const targetAY = this.readFloatLE();
                const itemId2 = [
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                ];
                this.skip(9);
                const targetBX = this.readFloatLE();
                30;
                const targetBY = this.readFloatLE();
                34;
                return {
                    id: actionId,
                    abilityFlags,
                    itemId1,
                    targetAX,
                    targetAY,
                    itemId2,
                    targetBX,
                    targetBY,
                };
            }
            case 0x16: {
                const selectMode = this.readUInt8();
                const numberUnits = this.readUInt16LE();
                const actions = this.readSelectionUnits(numberUnits);
                return { id: actionId, selectMode, numberUnits, actions };
            }
            case 0x17: {
                const groupNumber = this.readUInt8();
                const numberUnits = this.readUInt16LE();
                const actions = this.readSelectionUnits(numberUnits);
                return { id: actionId, groupNumber, numberUnits, actions };
            }
            case 0x18: {
                const groupNumber = this.readUInt8();
                this.skip(1);
                return { id: actionId, groupNumber };
            }
            case 0x19: {
                const itemId = [
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                ];
                const objectId1 = this.readUInt32LE();
                const objectId2 = this.readUInt32LE();
                return { id: actionId, itemId, objectId1, objectId2 };
            }
            case 0x1a: {
              //  console.log(actionId + "0x1a");
                return { id: actionId };
            }
            case 0x1b: {
             //   console.log(actionId + "0x1b");
                this.skip(9);
                return null;
            }
            case 0x1c: {
                this.skip(1);
                const itemId1 = [
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                ];
                const itemId2 = [
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                ];
                return { id: actionId, itemId1, itemId2 };
            }
            case 0x1d: {
                const itemId1 = [
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                ];
                const itemId2 = [
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                ];
                return { id: actionId, itemId1, itemId2 };
            }
            case 0x1e:
            case 0x1f: {
                const slotNumber = this.readUInt8();
                const itemId = [
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                ];
                return { id: actionId, slotNumber, itemId };
            }
            case 0x27:
             //   console.log("0x27");
            case 0x28:
             //   console.log("0x28");
            case 0x2d:
                this.skip(5);
                break;
            case 0x2e:
                this.skip(4);
                break;
            case 0x50:
                const slotNumber = this.readUInt8();
                const flags = this.readUInt32LE();
                return null;
            case 0x51:
                const slot = this.readUInt8();
                const gold = this.readUInt32LE();
                const lumber = this.readUInt32LE();
                return {
                    id: 0x51,
                    slot: slot,
                    gold: gold,
                    lumber,
                };
            case 0x60:
                this.skip(8);
                this.readZeroTermString("utf-8");
                return null;
            case 0x61:
                return { id: 0x61 };
            case 0x62:
                this.skip(12);
                return null;
            case 0x65:
            case 0x66:
            case 0x67:
                return {
                    id: actionId,
                };
            case 0x68: {
                this.skip(12);
                return null;
            }
            case 0x69:
            case 0x6a: {
                this.skip(16);
                return null;
            }
            case 0x6b: {
                const filename = this.readZeroTermString("utf-8");
                const missionKey = this.readZeroTermString("utf-8");
                const key = this.readZeroTermString("utf-8");
                const value = this.readUInt32LE();
                return { id: actionId, filename, missionKey, key, value };
            }
            case 0x75: {
                this.skip(1);
                return null;
            }
            case 0x77:
                this.skip(13);
                return null;
            case 0x7a:
                this.skip(20);
                return null;
            case 0x7b:
                this.skip(16);
                return null;
        }
        return null;
    }
    readSelectionUnits(length) {
        const v = [];
        for (let i = 0; i < length; i++) {
            const obj = {
                itemId1: [
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                ],
                itemId2: [
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                    this.readUInt8(),
                ],
            };
            v.push(obj);
        }
        return v;
    }
}
exports.default = ActionParser;
//# sourceMappingURL=ActionParser.js.map