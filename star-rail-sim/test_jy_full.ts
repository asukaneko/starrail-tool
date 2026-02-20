
import { Character } from './src/models/Character';
import { Enemy } from './src/models/Enemy';
import { BattleSimulator } from './src/utils/simulator';
import { ElementType } from './src/models/types';
import { CharacterData } from './src/types/HonkaiData';

// Mock Data
const mockJingYuanData: CharacterData = {
    id: '1204',
    name: 'Jing Yuan',
    rarity: 5,
    path: 'Erudition',
    element: 'Lightning',
    max_sp: 130,
    skills: ['120401', '120402', '120403', '120404'],
    base_stats: { hp: 1164, atk: 698, def: 485, speed: 99, crit_rate: 0.05, crit_dmg: 0.50 }
};

// Setup
const jy = new Character('1204', '景元', ElementType.Lightning, 80, mockJingYuanData);
// Unlock E6
jy.activeEidolons = [
    { rank: 1, id: 'e1', name: 'E1', desc: 'Splash DMG +25%', icon: '' },
    { rank: 2, id: 'e2', name: 'E2', desc: 'Dmg Boost after LL', icon: '' },
    { rank: 3, id: 'e3', name: 'E3', desc: '', icon: '' },
    { rank: 4, id: 'e4', name: 'E4', desc: 'Energy Restore', icon: '' },
    { rank: 5, id: 'e5', name: 'E5', desc: '', icon: '' },
    { rank: 6, id: 'e6', name: 'E6', desc: 'Vulnerability', icon: '' }
];
// Enable Technique
jy.useTechnique = true;

const enemy1 = new Enemy('enemy1', 'Enemy A (Left)', 80, ElementType.Wind, 100, 100000, 300);
const enemy2 = new Enemy('enemy2', 'Enemy B (Center)', 80, ElementType.Wind, 100, 100000, 300);
const enemy3 = new Enemy('enemy3', 'Enemy C (Right)', 80, ElementType.Wind, 100, 100000, 300);

const sim = new BattleSimulator([jy], [enemy1, enemy2, enemy3]);

console.log('--- Simulation Start ---');

// Check Initial State (BattleStart should have triggered)
const ll = sim.unitMap.get('1204_summon_神君');
if (ll) {
    // LL logic: Base 3 + Technique 3 = 6
    // Note: LL stores stacks in summoner's talentCounters['ll_hits']
    const hits = jy.talentCounters['ll_hits'];
    console.log(`[Check] Initial LL Hits: ${hits} (Expected: 6)`);
    
    // Check A4 Energy (Base 50% = 65, +15 = 80)
    console.log(`[Check] Initial Energy: ${jy.currentEnergy} (Expected: 80)`);
} else {
    console.error('[Error] Lightning Lord not summoned!');
}

// Execute Skill
console.log('\n--- Jing Yuan uses Skill ---');
// Manually execute skill logic since we don't have a "Player Input" phase in this simple test script
// We can use sim.executeCharacterAction if we set up the action.
// Or just invoke onTrigger('BPSkill') and apply effects?
// Best to use sim.processActionEffects with BPSkill effects.

// Find BPSkill config
import { CharacterSkills } from './src/data/characters';
const skillConfig = CharacterSkills['1204']['BPSkill'];
if (skillConfig) {
    // Apply Skill to All Enemies
    const results = sim.processActionEffects(jy, skillConfig, enemy2, { actionType: 'Skill' }); // Main target enemy2
    
    console.log('Skill Logs:', results.logs);
    
    const hitsAfter = jy.talentCounters['ll_hits'];
    console.log(`[Check] Post-Skill LL Hits: ${hitsAfter} (Expected: 8)`);
    
    // Check A6 Buff
    const a6Buff = jy.buffs.find(b => b.id === 'jy_a6_crit');
    console.log(`[Check] A6 Crit Rate Buff: ${a6Buff ? 'Active' : 'Missing'} (${a6Buff?.value})`);
}

console.log('\n--- Jing Yuan uses Ultimate ---');
const ultConfig = CharacterSkills['1204']['Ultra'];
if (ultConfig) {
    const results = sim.processActionEffects(jy, ultConfig, enemy2, { actionType: 'Ultimate' });
    console.log('Ultimate Logs:', results.logs);

    const hitsAfterUlt = jy.talentCounters['ll_hits'];
    console.log(`[Check] Post-Ultimate LL Hits: ${hitsAfterUlt} (Expected: 11? Max 10)`);
}

// LL Turn
console.log('\n--- Lightning Lord Action ---');
if (ll) {
    // Force LL to act
    const llResult = sim.executeSummonAction(ll as any);
    console.log('LL Logs:', llResult.effectLog);
    
    // Check E6 Log messages in output
    const e6Logs = llResult.effectLog?.filter(l => l.includes('(E6)'));
    console.log(`[Check] E6 Stacks applied: ${e6Logs?.length} times`);
    
    // Check Splash Logs
    const splashLogs = llResult.effectLog?.filter(l => l.includes('(扩散)'));
    console.log(`[Check] Splash Damage instances: ${splashLogs?.length}`);
    
    // Check A2 Log
    const a2Log = llResult.effectLog?.filter(l => l.includes('(A2)'));
    console.log(`[Check] A2 Buff triggered: ${a2Log?.length > 0}`);
}
