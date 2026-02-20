export interface SkillParam {
  [level: number]: number[];
}

export interface SkillData {
  id: string;
  name: string;
  max_level: number;
  element: string;
  type: string; // Normal, BPSkill, Ultra, Talent, Maze
  type_text: string;
  effect: string;
  effect_text: string;
  simple_desc: string;
  desc: string;
  params: number[][]; // params[level_index][param_index]
  icon: string;
}

export interface EidolonData {
  id: string;
  name: string;
  rank: number;
  desc: string;
  icon: string;
}

export interface CharacterData {
  id: string;
  name: string;
  tag: string;
  rarity: number;
  path: string;
  element: string;
  max_sp: number; // Max Energy
  ranks: string[]; // IDs of ranks
  skills: string[]; // IDs of skills
  icon: string;
  preview: string;
  portrait: string;
  base_stats?: {
    hp: number;
    atk: number;
    def: number;
    speed: number;
    crit_rate: number;
    crit_dmg: number;
  };
}
