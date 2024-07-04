import Player from "./Player";
declare type SortablePlayerProps = Pick<Player, "teamid" | "id">;
export declare const sortPlayers: (player1: SortablePlayerProps, player2: SortablePlayerProps) => number;
export {};
