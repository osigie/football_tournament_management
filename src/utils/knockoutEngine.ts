import { Match, Team, GroupStanding } from '../types';

/**
 * Generates the initial knockout bracket based on group standings.
 * Currently supports a simplified version: Top 2 from each group.
 */
export const generateBracket = (
  standings: GroupStanding[][],
  tournamentId: string
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
  
  // Simple pairing logic for now: Group A 1st vs Group B 2nd, etc.
  // This is a placeholder for a full bracket generator.
  // Ideally, we match strictly A1 vs B2, C1 vs D2, etc.
  
  // Debug/Fallback: Just pair them in order for the MVP
  for (let i = 0; i < bracketSize / 2; i++) {
    // If we have teams, assign them. If not (bye), leave null
    const home = qualifiedTeams[i * 2]?.teamId || null;
    const away = qualifiedTeams[i * 2 + 1]?.teamId || null;

    matches.push({
      id: `knockout-r${bracketSize}-${i}`,
      homeTeamId: home,
      awayTeamId: away,
      startTime: new Date().toISOString(),
      status: 'SCHEDULED',
      round: bracketSize, // e.g. 16 for R16, 8 for QF
      tournamentId,
    });
  }

  return matches;
};
