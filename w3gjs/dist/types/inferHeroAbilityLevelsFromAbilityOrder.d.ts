import { Ability, Retraining } from "./Player";
export declare function inferHeroAbilityLevelsFromAbilityOrder(abilityOrder: (Ability | Retraining)[]): {
    [key: string]: number;
};
