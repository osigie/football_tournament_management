import { GroupStanding, Match, Team } from '../types';

export const calculateStandings = (teams: Team[], matches: Match[]): GroupStanding[] => {
  const standings: Map<string, GroupStanding> = new Map();

  // Initialize standings for all teams
  teams.forEach((team) => {
    standings.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      fairPlayPoints: 0,
      rank: 0,
    });
  });

  // Process completed matches
  matches.forEach((match) => {
    if (match.status !== 'COMPLETED' || !match.result || !match.homeTeamId || !match.awayTeamId) return;

    const home = standings.get(match.homeTeamId);
    const away = standings.get(match.awayTeamId);

    if (!home || !away) return;

    // Update played
    home.played += 1;
    away.played += 1;

    // Update goals
    home.goalsFor += match.result.homeGoals;
    home.goalsAgainst += match.result.awayGoals;
    home.goalDifference = home.goalsFor - home.goalsAgainst;

    away.goalsFor += match.result.awayGoals;
    away.goalsAgainst += match.result.homeGoals;
    away.goalDifference = away.goalsFor - away.goalsAgainst;

    // Update points and W/D/L
    if (match.result.homeGoals > match.result.awayGoals) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (match.result.homeGoals < match.result.awayGoals) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      home.points += 1;
      away.drawn += 1;
      away.points += 1;
    }
  });

  // Convert to array and sort based on FIFA rules
  const sortedStandings = Array.from(standings.values()).sort((a, b) => {
    // 1. Points
    if (b.points !== a.points) return b.points - a.points;

    // 2. Goal Difference
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;

    // 3. Goals Scored
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;

    // 4. Head-to-Head (Simplified: just points for now, full implementation requires recursive check)
    // For a robust implementation, we'd need to filter matches between tied teams.
    // This is a placeholder for the more complex H2H logic.
    
    // 5. Fair play (Higher is better, usually starts at 0 and goes negative)
    if (b.fairPlayPoints !== a.fairPlayPoints) return b.fairPlayPoints - a.fairPlayPoints;

    // 6. Random (Drawing of lots)
    // In a real scenario, this should be deterministic or manually triggered. 
    // We'll use ID string comparison for deterministic stability if everything else fails.
    return a.teamId.localeCompare(b.teamId);
  });

  // Assign ranks
  sortedStandings.forEach((standing, index) => {
    standing.rank = index + 1;
  });

  return sortedStandings;
};
