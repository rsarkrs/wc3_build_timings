import { Race } from "../types";
declare type ObjectIdStringencoded = {
    type: "stringencoded";
    value: string;
};
declare type ObjectIdAlphanumeric = {
    type: "alphanumeric";
    value: number[];
};
export declare type ItemId = ObjectIdAlphanumeric | ObjectIdStringencoded;
export declare const objectIdFormatter: (arr: number[]) => ItemId;
export declare const raceFlagFormatter: (flag: number) => Race;
export declare const chatModeFormatter: (flag: number) => string;
export {};
