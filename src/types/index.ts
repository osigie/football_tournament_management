export type MatchStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';

export interface Team {
  id: string;
  name: string;
  logoUrl?: string; // Optional URL for team logo
}

export interface MatchResult {
  homeGoals: number;
  awayGoals: number;
  homePenalties?: number;
  awayPenalties?: number;
  homeCards?: {
    yellow: number;
    red: number;
  };
  awayCards?: {
    yellow: number;
    red: number;
  };
}

export interface Match {
  id: string;
  homeTeamId: string | null; // null for placeholders (e.g., "Winner of Match 1")
  awayTeamId: string | null;
  homeTeamName?: string; // For display before teams are known
  awayTeamName?: string;
  startTime: string; // ISO string
  status: MatchStatus;
  result?: MatchResult;
  round: number; // 0 for group stage, 1 for R16, 2 for QF, etc.
  groupName?: string; // "A", "B", etc.
  tournamentId: string;
}

export interface Group {
  id: string;
  name: string;
  teamIds: string[];
  matches: Match[];
}

export interface GroupStanding {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  fairPlayPoints: number; // Starts at 0, negative for cards
  rank: number;
}

export interface TournamentConfig {
  name: string;
  format: 'GROUP_KNOCKOUT' | 'KNOCKOUT_ONLY';
  matchDurationMinutes: number;
  advancement: {
    teamsPerGroup: number;
    bestThirdPlaced: boolean;
  };
}

export interface Tournament {
  id: string;
  name: string;
  status: 'DRAFT' | 'ONGOING' | 'COMPLETED';
  config: TournamentConfig;
  teams: Team[];
  groups: Group[];
  knockoutMatches: Match[];
}
