import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const STAR_RAIL_RES_DIR = path.join(ROOT_DIR, 'StarRailRes/index/cn');
const OUTPUT_FILE = path.join(ROOT_DIR, 'src/data/starrail_data.json');

console.log(`Reading data from: ${STAR_RAIL_RES_DIR}`);

// Read source JSONs
const characters = JSON.parse(fs.readFileSync(path.join(STAR_RAIL_RES_DIR, 'characters.json'), 'utf8'));
const skills = JSON.parse(fs.readFileSync(path.join(STAR_RAIL_RES_DIR, 'character_skills.json'), 'utf8'));
const ranks = JSON.parse(fs.readFileSync(path.join(STAR_RAIL_RES_DIR, 'character_ranks.json'), 'utf8'));
const promotions = JSON.parse(fs.readFileSync(path.join(STAR_RAIL_RES_DIR, 'character_promotions.json'), 'utf8'));

// Process data
const processedCharacters = {};
const processedSkills = {};
const processedRanks = {};

// We want to load ALL characters
Object.values(characters).forEach(char => {
  // Get base stats (Level 80)
  const promo = promotions[char.id];
  let baseStats = null;
  if (promo && promo.values && promo.values.length > 0) {
    // Index 6 is usually Lv 80 base (Ascension 6)
    // Value = base + step * (level - 1)
    // But since base stats change per ascension, let's just use the last entry + step * (80 - 1)?
    // Wait, let's simplify. Just take the base of the last entry (Ascension 6 base) + 10 * step.
    // Because Asc 6 is Lv 70-80.
    const ascension6 = promo.values[6] || promo.values[promo.values.length - 1];
    
    if (ascension6) {
        baseStats = {
            hp: ascension6.hp.base + (ascension6.hp.step * 10),
            atk: ascension6.atk.base + (ascension6.atk.step * 10),
            def: ascension6.def.base + (ascension6.def.step * 10),
            speed: ascension6.spd.base + (ascension6.spd.step * 10),
            crit_rate: ascension6.crit_rate.base + (ascension6.crit_rate.step * 10),
            crit_dmg: ascension6.crit_dmg.base + (ascension6.crit_dmg.step * 10),
        };
    }
  }

  // Add processed character
  processedCharacters[char.id] = {
    ...char,
    base_stats: baseStats
  };

  // Collect skills
  if (char.skills) {
      char.skills.forEach(skillId => {
          if (skills[skillId]) {
              processedSkills[skillId] = skills[skillId];
          }
      });
  }
  
  // Collect ranks (eidolons)
  if (char.ranks) {
      char.ranks.forEach(rankId => {
          if (ranks[rankId]) {
              processedRanks[rankId] = ranks[rankId];
          }
      });
  }
});

const outputData = {
  characters: processedCharacters,
  skills: processedSkills,
  ranks: processedRanks
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2), 'utf8');
console.log(`Generated ${OUTPUT_FILE} with ${Object.keys(processedCharacters).length} characters.`);
