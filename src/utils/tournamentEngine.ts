import { Group, Match, Team, TournamentConfig } from '../types';

/**
 * Distributes teams into balanced groups.
 * e.g., 7 teams -> Group A (4), Group B (3)
 */
export const generateGroups = (teams: Team[]): Group[] => {
  if (teams.length < 2) return [];

  // Determine number of groups. A simple heuristic: ~4 teams per group is ideal.
  // For 7 teams, 2 groups. For 10 teams, 2 groups (5 each) or 3 groups (4,3,3).
  // Let's aim for 3-5 teams per group if possible.
  
  let numGroups = 1;
  if (teams.length >= 6 && teams.length <= 11) {
    numGroups = 2; 
  } else if (teams.length >= 12) {
    numGroups = Math.ceil(teams.length / 4);
  }

  const groups: Group[] = Array.from({ length: numGroups }, (_, i) => ({
    id: `group-${i}`,
    name: String.fromCharCode(65 + i), // A, B, C...
    teamIds: [],
    matches: [],
  }));

  // Distribute teams (snake draft or simple round robin distribution)
  teams.forEach((team, index) => {
    const groupIndex = index % numGroups;
    groups[groupIndex].teamIds.push(team.id);
  });

  return groups;
};

/**
 * Generates round-robin fixtures for a group.
 * Handles odd number of teams by creating byes (logic: team sits out).
 */
export const generateFixtures = (group: Group, tournamentId: string): Match[] => {
  const teamIds = [...group.teamIds];
  const numTeams = teamIds.length;
  
  // If odd number of teams, add a dummy team for calculation (bye)
  if (numTeams % 2 !== 0) {
    teamIds.push('BYE');
  }

  const matches: Match[] = [];
  const rounds = teamIds.length - 1;
  const half = teamIds.length / 2;

  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < half; i++) {
      const home = teamIds[i];
      const away = teamIds[teamIds.length - 1 - i];

      if (home !== 'BYE' && away !== 'BYE') {
        matches.push({
          id: `match-${group.id}-${round}-${i}`,
          homeTeamId: home,
          awayTeamId: away,
          startTime: new Date().toISOString(), // Placeholder
          status: 'SCHEDULED',
          round: round + 1,
          groupName: group.name,
          tournamentId,
        });
      }
    }

    // Rotate array: keep first element, move last to second, shift others
    teamIds.splice(1, 0, teamIds.pop()!);
  }

  return matches;
};
