/// <reference types="node" />
import StatefulBufferParser from "./StatefulBufferParser";
declare type UnitBuildingAbilityActionNoParams = {
    id: 0x10;
    abilityFlags: number;
    itemId: number[];
};
declare type UnitBuildingAbilityActionTargetPosition = {
    id: 0x11;
    abilityFlags: number;
    itemId: number[];
    targetX: number;
    targetY: number;
};
declare type UnitBuildingAbilityActionTargetPositionTargetObjectId = {
    id: 0x12;
    abilityFlags: number;
    itemId: number[];
    targetX: number;
    targetY: number;
    objectId1: number;
    objectId2: number;
};
export declare type TransferResourcesAction = {
    id: 0x51;
    slot: number;
    gold: number;
    lumber: number;
};
declare type GiveItemToUnitAciton = {
    id: 0x13;
    abilityFlags: number;
    itemId: number[];
    targetX: number;
    targetY: number;
    objectId1: number;
    objectId2: number;
    itemObjectId1: number;
    itemObjectId2: number;
};
declare type UnitBuildingAbilityActionTwoTargetPositions = {
    id: 0x14;
    abilityFlags: number;
    itemId1: number[];
    targetAX: number;
    targetAY: number;
    itemId2: number[];
    targetBX: number;
    targetBY: number;
};
declare type ChangeSelectionAction = {
    id: 0x16;
    selectMode: number;
    numberUnits: number;
    actions: {
        itemId1: number[];
        itemId2: number[];
    }[];
};
declare type AssignGroupHotkeyAction = {
    id: 0x17;
    groupNumber: number;
    numberUnits: number;
    actions: {
        itemId1: number[];
        itemId2: number[];
    }[];
};
declare type SelectGroupHotkeyAction = {
    id: 0x18;
    groupNumber: number;
};
declare type SelectGroundItemAction = {
    id: 0x1c;
    itemId1: number[];
    itemId2: number[];
};
declare type SelectSubgroupAction = {
    id: 0x19;
    itemId: number[];
    objectId1: number;
    objectId2: number;
};
declare type CancelHeroRevival = {
    id: 0x1d;
    itemId1: number[];
    itemId2: number[];
};
declare type ChooseHeroSkillSubmenu = {
    id: 0x65 | 0x66;
};
declare type EnterBuildingSubmenu = {
    id: 0x67;
};
declare type ESCPressedAction = {
    id: 0x61;
};
declare type RemoveUnitFromBuildingQueue = {
    id: 0x1e | 0x1f;
    slotNumber: number;
    itemId: number[];
};
declare type PreSubselectionAction = {
    id: 0x1a;
};
export declare type W3MMDAction = {
    id: 0x6b;
    filename: string;
    missionKey: string;
    key: string;
    value: number;
};
export declare type Action = UnitBuildingAbilityActionNoParams | UnitBuildingAbilityActionTargetPositionTargetObjectId | GiveItemToUnitAciton | UnitBuildingAbilityActionTwoTargetPositions | PreSubselectionAction | ChangeSelectionAction | AssignGroupHotkeyAction | SelectGroupHotkeyAction | SelectSubgroupAction | SelectGroundItemAction | CancelHeroRevival | RemoveUnitFromBuildingQueue | W3MMDAction | ESCPressedAction | ChooseHeroSkillSubmenu | EnterBuildingSubmenu | TransferResourcesAction | UnitBuildingAbilityActionTargetPosition;
export default class ActionParser extends StatefulBufferParser {
    parse(input: Buffer): Action[];
    private parseAction;
    private readSelectionUnits;
}
export {};
