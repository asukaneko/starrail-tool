import starRailData from '../data/starrail_data.json';
import { CharacterData, SkillData, EidolonData } from '../types/HonkaiData';

// We need to type the imported JSON
interface StarRailData {
  characters: Record<string, CharacterData>;
  skills: Record<string, SkillData>;
  ranks: Record<string, EidolonData>;
}

const data = starRailData as unknown as StarRailData;

export class DataManager {
  static getCharacter(idOrName: string): CharacterData | undefined {
    // Try ID first
    if (data.characters[idOrName]) return data.characters[idOrName];
    
    // Try Name
    return Object.values(data.characters).find(c => c.name === idOrName);
  }

  static getSkill(id: string): SkillData | undefined {
    return data.skills[id];
  }

  static getEidolon(id: string): EidolonData | undefined {
    return data.ranks[id];
  }
  
  static getAllCharacters(): CharacterData[] {
      return Object.values(data.characters);
  }
}
