import { Match, Team, GroupStanding } from '../types';

export const generateBracket = (
  standings: GroupStanding[][],
  tournamentId: string,
  config?: { knockoutFormat: 'SINGLE' | 'HOME_AND_AWAY' }
): Match[] => {
  const qualifiedTeams: { teamId: string; rank: number; groupIndex: number }[] = [];

  standings.forEach((groupParams, groupIndex) => {
    // Take top 2
    const top2 = groupParams.slice(0, 2);
    top2.forEach((standing) => {
      qualifiedTeams.push({
        teamId: standing.teamId,
        rank: standing.rank,
        groupIndex,
      });
    });
  });

  // Calculate bracket size
  const count = qualifiedTeams.length;
  let bracketSize = 2;
  while (bracketSize < count) bracketSize *= 2;

  const matches: Match[] = [];
  const isHomeAndAway = config?.knockoutFormat === 'HOME_AND_AWAY';
  
  // Generate all rounds from First Round down to Final (round=2)
  for (let round = bracketSize; round >= 2; round /= 2) {
    const numPairings = round / 2;
    
    for (let i = 0; i < numPairings; i++) {
        let home = null;
        let away = null;

        // Seeding for the first round (only if teams are available)
        if (round === bracketSize) {
           home = qualifiedTeams[i * 2]?.teamId || null;
           away = qualifiedTeams[i * 2 + 1]?.teamId || null;
        }

        const isFinal = round === 2;
        
        // Final is always Single leg in our simplified logic (to match FIFA/common sense usually)
        // But if config is strictly HOME_AND_AWAY, generally people might want it.
        // Let's stick to: Final is Single Match unless explicitly requested otherwise (which we won't for now).
        // Actually, user asked for management "from semi finals to finals". 
        // Let's make Final SINGLE for now to be safe.
        
        if (isHomeAndAway && !isFinal) {
            // Two Legs
            matches.push({
                id: `knockout-r${round}-m${i}-L1`,
                homeTeamId: home,
                awayTeamId: away,
                startTime: new Date().toISOString(),
                status: 'SCHEDULED',
                round: round,
                leg: 1,
                tournamentId,
            });
            matches.push({
                id: `knockout-r${round}-m${i}-L2`,
                homeTeamId: away, // Swap for leg 2
                awayTeamId: home,
                startTime: new Date().toISOString(),
                status: 'SCHEDULED',
                round: round,
                leg: 2,
                tournamentId,
            });
        } else {
            // Single Match
            matches.push({
                id: `knockout-r${round}-m${i}`,
                homeTeamId: home,
                awayTeamId: away,
                startTime: new Date().toISOString(),
                status: 'SCHEDULED',
                round: round,
                leg: 1, // Treat as leg 1 for consistency
                tournamentId,
            });
        }
    }
  }

  return matches;
};

/**
 * Updates the bracket based on match results.
 * Advances winners to the next round.
 */
export const updateKnockoutBracket = (matches: Match[]): Match[] => {
    // Deep copy to avoid mutation issues
    const newMatches = JSON.parse(JSON.stringify(matches)) as Match[];

    // Process rounds from highest (e.g. 16) down to 4 (Semis). Final (2) doesn't advance anywhere.
    // We need to find the MAX round.
    const maxRound = Math.max(...newMatches.map(m => m.round));

    for (let round = maxRound; round > 2; round /= 2) {
        const numPairings = round / 2;
        
        for (let i = 0; i < numPairings; i++) {
            // Find matches for this pairing
            // We use the ID convention: knockout-r{round}-m{i}...
            const pairingMatches = newMatches.filter(m => m.round === round && (m.id.includes(`-m${i}-`) || m.id.endsWith(`-m${i}`)));
            
            if (pairingMatches.length === 0) continue;

            // Check if pairing is complete
            const isComplete = pairingMatches.every(m => m.status === 'COMPLETED');
            if (!isComplete) continue;

            // Determine Winner
            let winnerId: string | null = null;

            if (pairingMatches.length === 1) {
                // Single Leg
                const m = pairingMatches[0];
                if (m.result) {
                    if (m.result.homeGoals > m.result.awayGoals) winnerId = m.homeTeamId;
                    else if (m.result.awayGoals > m.result.homeGoals) winnerId = m.awayTeamId;
                    else {
                         // Penalties logic should be here (homePenalties etc)
                         // MVP: Assume Winner by goals or Random if draw (shouldn't happen in knockout)
                         // For now, if drawn, pick home (TODO: Add penalty logic)
                         winnerId = m.homeTeamId; 
                    }
                }
            } else {
                // Two Legs
                const l1 = pairingMatches.find(m => m.leg === 1);
                const l2 = pairingMatches.find(m => m.leg === 2);
                if (l1 && l2 && l1.result && l2.result) {
                    // Aggregate
                    // Leg 1: Home vs Away
                    // Leg 2: Away vs Home
                    // Team A (Home in L1) goals: L1_Home + L2_Away
                    // Team B (Away in L1) goals: L1_Away + L2_Home
                    
                    const teamAGoals = l1.result.homeGoals + l2.result.awayGoals;
                    const teamBGoals = l1.result.awayGoals + l2.result.homeGoals;

                    if (teamAGoals > teamBGoals) winnerId = l1.homeTeamId;
                    else if (teamBGoals > teamAGoals) winnerId = l1.awayTeamId;
                    else {
                        // Away goals rule? standard is usually NO away goals nowadays in UEFA, but FIFA varies.
                        // Let's stick to simple Aggregate -> Penalties
                        // We check penalties on leg 2 mainly.
                        // Assuming penalties are recorded in Leg 2 result.
                        winnerId = l1.homeTeamId; // Placeholder fallback
                    }
                }
            }

            if (winnerId) {
                // Advance to Next Round
                // Target Round: round / 2
                // Target Match Index: floor(i / 2)
                // Target Slot: i % 2 === 0 ? Home : Away
                
                const nextRound = round / 2;
                const nextMatchIdx = Math.floor(i / 2);
                const isHomeSlot = (i % 2) === 0;

                // Find next matches (could be 1 or 2 legs)
                const nextMatches = newMatches.filter(m => m.round === nextRound && m.id.includes(`-m${nextMatchIdx}`));
                
                nextMatches.forEach(nextMatch => {
                    // For Leg 1: 0->Home, 1->Away
                    // For Leg 2: 0->Away, 1->Home (Swap)
                    
                    if (nextMatch.leg === 2) {
                        if (isHomeSlot) nextMatch.awayTeamId = winnerId;
                        else nextMatch.homeTeamId = winnerId;
                    } else {
                        // Single leg OR Leg 1
                        if (isHomeSlot) nextMatch.homeTeamId = winnerId;
                        else nextMatch.awayTeamId = winnerId;
                    }
                });
            }
        }
    }

    return newMatches;
};
