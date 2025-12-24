
const { generateBracket } = require('./src/utils/knockoutEngine');

const mockStanding = (teamId, rank, groupIndex) => ({
    teamId,
    rank,
    points: rank === 1 ? 9 : 6,
    goalDifference: 5,
    goalsFor: 10,
    goalsAgainst: 5,
    played: 3,
    won: rank === 1 ? 3 : 2,
    drawn: 0,
    lost: rank === 1 ? 0 : 1,
    teamName: `Team ${teamId}`,
    fairPlayPoints: 0
});

const groups = [
    [mockStanding('A1', 1, 0), mockStanding('A2', 2, 0)],
    [mockStanding('B1', 1, 1), mockStanding('B2', 2, 1)],
    [mockStanding('C1', 1, 2), mockStanding('C2', 2, 2)],
    [mockStanding('D1', 1, 3), mockStanding('D2', 2, 3)],
];

const matches = generateBracket(groups, 'test-tourney');

console.log('Generated Matches (Round 8):');
const r8 = matches.filter(m => m.round === 8);

let valid = true;

r8.forEach(m => {
    const h = m.homeTeamId;
    const a = m.awayTeamId;
    console.log(`Match ${m.id}: ${h} vs ${a}`);
    
    if (!h || !a) return; // Bye
    
    // Check ranks
    const hRank = h.endsWith('1') ? 1 : 2;
    const aRank = a.endsWith('1') ? 1 : 2;
    
    if (hRank === aRank) {
        console.error(`ERROR: Same rank pairing! ${h} vs ${a}`);
        valid = false;
    }
    
    // Check groups
    const hGroup = h[0];
    const aGroup = a[0];
    
    if (hGroup === aGroup) {
        console.error(`ERROR: Same group pairing! ${h} vs ${a}`);
        valid = false;
    }
});

// Check Separation
// Top Half: Matches 0, 1. Bottom Half: Matches 2, 3.
const topHalfTeams = new Set();
const botHalfTeams = new Set();

r8.forEach((m, i) => {
   if (i < 2) {
       if (m.homeTeamId) topHalfTeams.add(m.homeTeamId);
       if (m.awayTeamId) topHalfTeams.add(m.awayTeamId);
   } else {
       if (m.homeTeamId) botHalfTeams.add(m.homeTeamId);
       if (m.awayTeamId) botHalfTeams.add(m.awayTeamId);
   }
});

console.log('Top Half:', Array.from(topHalfTeams));
console.log('Bot Half:', Array.from(botHalfTeams));

['A', 'B', 'C', 'D'].forEach(g => {
    const t1 = `${g}1`;
    const t2 = `${g}2`;
    
    const t1Top = topHalfTeams.has(t1);
    const t2Top = topHalfTeams.has(t2);
    
    if (t1Top && t2Top) {
        console.error(`ERROR: Group ${g} not separated! Both in Top Half.`);
        valid = false;
    }
    
    const t1Bot = botHalfTeams.has(t1);
    const t2Bot = botHalfTeams.has(t2);
    
     if (t1Bot && t2Bot) {
        console.error(`ERROR: Group ${g} not separated! Both in Bot Half.`);
        valid = false;
    }
});

if (valid) console.log('SUCCESS: logical constraints met.');
else console.log('FAILURE: constraints violated.');
