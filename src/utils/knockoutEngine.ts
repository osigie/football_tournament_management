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

  // Calculate bracket size (next power of 2)
  const count = qualifiedTeams.length;
  let bracketSize = 2;
  while (bracketSize < count) bracketSize *= 2;

  const matches: Match[] = [];
  const isHomeAndAway = config?.knockoutFormat === 'HOME_AND_AWAY';
  
  // Simple pairing logic
  for (let i = 0; i < bracketSize / 2; i++) {
    const home = qualifiedTeams[i * 2]?.teamId || null;
    const away = qualifiedTeams[i * 2 + 1]?.teamId || null;
    const isFinal = bracketSize === 2; // Final is usually single leg even in H&A tournaments (like UCL), but lets follow config for now strictly unless we want to implement the "Final is always single" rule. 
    // FIFA/UCL rule: Final is single match. Let's enforce single match for Final for realism if user wants "FIFA rules".
    // But for generic "Home & Away" request without specific FIFA context on the final, maybe they want 2 legs.
    // Let's stick to config for all rounds for maximum flexibility as requested, OR special case the final?
    // User request: "decide if we need home and away in knockout stage". Usually implies the whole stage. 
    // I'll make the Final SINGLE LEG by default in logic if it's generally preferred, but the USER might want H&A final.
    // Let's make it ALL H&A if configured, except maybe we can toggle it later.
    
    // Actually, usually Final is single. Let's force Single for Final for "Premium" realism, 
    // BUT the user asked for H&A plan. Let's do H&A for all for now to demonstrate the capability.

    if (isHomeAndAway && !isFinal) {
        // Leg 1
        matches.push({
            id: `knockout-r${bracketSize}-${i}-L1`,
            homeTeamId: home,
            awayTeamId: away,
            startTime: new Date().toISOString(),
            status: 'SCHEDULED',
            round: bracketSize,
            leg: 1,
            tournamentId,
        });
        // Leg 2 (Swap Home/Away)
        matches.push({
            id: `knockout-r${bracketSize}-${i}-L2`,
            homeTeamId: away,
            awayTeamId: home,
            startTime: new Date().toISOString(), // Should be +1 week ideally
            status: 'SCHEDULED',
            round: bracketSize,
            leg: 2,
            tournamentId,
        });
    } else {
        matches.push({
            id: `knockout-r${bracketSize}-${i}`,
            homeTeamId: home,
            awayTeamId: away,
            startTime: new Date().toISOString(),
            status: 'SCHEDULED',
            round: bracketSize,
            leg: 1,
            tournamentId,
        });
    }
  }

  return matches;
};
