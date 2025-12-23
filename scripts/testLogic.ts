import { generateGroups, generateFixtures } from '../src/utils/tournamentEngine';
import { calculateStandings } from '../src/utils/rankingEngine';
import { generateBracket } from '../src/utils/knockoutEngine';
import { Team, Match } from '../src/types';

// Mock Data
const teams: Team[] = [
  { id: 't1', name: 'Team 1' },
  { id: 't2', name: 'Team 2' },
  { id: 't3', name: 'Team 3' },
  { id: 't4', name: 'Team 4' },
  { id: 't5', name: 'Team 5' },
  { id: 't6', name: 'Team 6' },
  { id: 't7', name: 'Team 7' }, // Odd number test
];

console.log('--- Testing Group Generation ---');
const groups = generateGroups(teams);
console.log(`Generated ${groups.length} groups.`);
groups.forEach(g => {
  console.log(`Group ${g.name}: ${g.teamIds.length} teams`);
});

console.log('\n--- Testing Fixture Generation ---');
groups.forEach(g => {
  g.matches = generateFixtures(g, 'tourney-1');
  console.log(`Group ${g.name}: ${g.matches.length} matches generated`);
});

console.log('\n--- Testing Standings Calculation (Group A) ---');
// Simulate some matches in Group A
const groupA = groups[0]; // Assuming 4 teams
// Match 1: t1 vs t2 (2-0)
const m1 = groupA.matches[0];
m1.status = 'COMPLETED';
m1.result = { homeGoals: 2, awayGoals: 0 };

// Match 2: t1 vs t3 (1-1)
const m2 = groupA.matches[1];
m2.status = 'COMPLETED';
m2.result = { homeGoals: 1, awayGoals: 1 };

// Match 3: t2 vs t3 (0-1)
const m3 = groupA.matches.find(m => m.homeTeamId === 't2' && m.awayTeamId === 't3');
if (m3) {
    m3.status = 'COMPLETED';
    m3.result = { homeGoals: 0, awayGoals: 1 };
}

const groupATeams = teams.filter(t => groupA.teamIds.includes(t.id));
const standings = calculateStandings(groupATeams, groupA.matches);
console.table(standings.map(s => ({ 
    Team: s.teamName, 
    P: s.played, 
    W: s.won, 
    D: s.drawn, 
    L: s.lost, 
    Pts: s.points 
})));

console.log('\n--- Testing Knockout Bracket ---');
// Mocking standings for bracket gen
const mockStandings = [
    [standings[0], standings[1]], // Group A top 2
    [{ teamId: 't5', rank: 1 }, { teamId: 't6', rank: 2 }] // Group B (mock)
] as any;

const bracket = generateBracket(mockStandings, 'tourney-1');
console.log('Bracket Matches:', bracket.length);
bracket.forEach(m => console.log(`${m.id}: ${m.homeTeamId} vs ${m.awayTeamId}`));
