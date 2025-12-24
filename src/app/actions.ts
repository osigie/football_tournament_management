'use server';

import { db } from '@/db';
import { tournaments, teams, groups, groupTeams, matches } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { Tournament, Team, Group, Match, TournamentConfig, MatchResult } from '@/types';

/**
 * Create a new tournament with teams and groups
 */
export async function createTournament(tournamentData: {
  name: string;
  config: TournamentConfig;
  teams: Omit<Team, 'id'>[];
  groups: { name: string; teamIds: string[] }[];
}) {
  try {
    // Insert tournament
    const [tournament] = await db.insert(tournaments).values({
      name: tournamentData.name,
      status: 'DRAFT',
      config: tournamentData.config,
    }).returning();

    // Insert teams
    const insertedTeams = await db.insert(teams).values(
      tournamentData.teams.map(team => ({
        tournamentId: tournament.id,
        name: team.name,
        logoUrl: team.logoUrl,
      }))
    ).returning();

    // Create a map of temporary team names to actual database IDs (for matching)
    const teamIdMap = new Map<string, string>();
    tournamentData.teams.forEach((team, index) => {
      // Map by name since we don't have the original ID
      teamIdMap.set(team.name, insertedTeams[index].id);
    });

    // Insert groups
    const insertedGroups = await db.insert(groups).values(
      tournamentData.groups.map(group => ({
        tournamentId: tournament.id,
        name: group.name,
      }))
    ).returning();

    // Insert group-team relationships
    const groupTeamRelations = tournamentData.groups.flatMap((group, groupIndex) =>
      group.teamIds.map(teamId => ({
        groupId: insertedGroups[groupIndex].id,
        teamId: teamIdMap.get(teamId)!,
      }))
    );

    if (groupTeamRelations.length > 0) {
      await db.insert(groupTeams).values(groupTeamRelations);
    }

    // Return the created tournament with mapped IDs
    return {
      success: true,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        config: tournament.config as TournamentConfig,
        teams: insertedTeams.map(t => ({
          id: t.id,
          name: t.name,
          logoUrl: t.logoUrl || undefined,
        })),
        groups: insertedGroups.map((g, idx) => ({
          id: g.id,
          name: g.name,
          teamIds: tournamentData.groups[idx].teamIds.map(id => teamIdMap.get(id)!),
          matches: [],
        })),
        knockoutMatches: [],
      } as Tournament,
      teamIdMap: Object.fromEntries(teamIdMap),
    };
  } catch (error: any) {
      const pgError = error?.cause ?? error;
    if (pgError.code === '23505') { // Postgres unique constraint violation
      return { success: false, error: 'Tournament name is already taken' };
    }
    
    console.error('Error creating tournament:', error);
    return { success: false, error: 'Failed to create tournament' };
  }
}

/**
 * Save matches for a tournament (group stage or knockout)
 */
export async function saveMatches(tournamentId: string, matchesToSave: Match[]) {
  try {
    // Delete existing matches for this tournament to avoid duplicates
    await db.delete(matches).where(eq(matches.tournamentId, tournamentId));

    // Insert all matches
    if (matchesToSave.length > 0) {
      await db.insert(matches).values(
        matchesToSave.map(match => ({
          // id: match.id, // Let DB generate UUID
          tournamentId,
          groupId: null, 
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          homeTeamName: match.homeTeamName,
          awayTeamName: match.awayTeamName,
          startTime: new Date(match.startTime),
          status: match.status,
          result: match.result || null,
          round: match.round,
          leg: match.leg,
          aggregateMatchId: match.aggregateMatchId,
        }))
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving matches:', error);
    return { success: false, error: 'Failed to save matches' };
  }
}

/**
 * Update a single match result
 */
export async function updateMatchResult(matchId: string, result: MatchResult, status: string = 'COMPLETED') {
  try {
    await db.update(matches)
      .set({ 
        result,
        status,
        updatedAt: new Date(),
      })
      .where(eq(matches.id, matchId));

    return { success: true };
  } catch (error) {
    console.error('Error updating match result:', error);
    return { success: false, error: 'Failed to update match result' };
  }
}

/**
 * Get a tournament by ID with all related data
 */
export async function getTournament(tournamentId: string) {
  try {
    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, tournamentId),
      with: {
        teams: true,
        groups: {
          with: {
            groupTeams: {
              with: {
                team: true,
              },
            },
          },
        },
        matches: true,
      },
    });

    console.log('getTournament - Raw data from DB:', JSON.stringify({
      id: tournament?.id,
      name: tournament?.name,
      teamsCount: tournament?.teams?.length,
      groupsCount: tournament?.groups?.length,
      matchesCount: tournament?.matches?.length,
      groups: tournament?.groups?.map(g => ({
        id: g.id,
        name: g.name,
        groupTeamsCount: g.groupTeams?.length,
        groupTeams: g.groupTeams?.map(gt => ({
          teamId: gt.teamId,
          groupId: gt.groupId,
          hasTeam: !!gt.team
        }))
      }))
    }, null, 2));

    if (!tournament) {
      return { success: false, error: 'Tournament not found' };
    }

    // Transform to match frontend Tournament type
    const transformedTournament: Tournament = {
      id: tournament.id,
      name: tournament.name,
      status: tournament.status as 'DRAFT' | 'ONGOING' | 'COMPLETED',
      config: tournament.config as TournamentConfig,
      teams: tournament.teams.map(t => ({
        id: t.id,
        name: t.name,
        logoUrl: t.logoUrl || undefined,
      })),
      groups: tournament.groups.map(g => ({
        id: g.id,
        name: g.name,
        teamIds: g.groupTeams.map(gt => gt.teamId),
        matches: tournament.matches
          .filter(m => m.groupId === g.id)
          .map(m => ({
            id: m.id,
            homeTeamId: m.homeTeamId,
            awayTeamId: m.awayTeamId,
            homeTeamName: m.homeTeamName || undefined,
            awayTeamName: m.awayTeamName || undefined,
            startTime: m.startTime.toISOString(),
            status: m.status as 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED',
            result: m.result as MatchResult,
            round: m.round,
            leg: (m.leg as 1 | 2) || undefined,
            aggregateMatchId: m.aggregateMatchId || undefined,
            groupName: g.name,
            tournamentId: m.tournamentId,
          })),
      })),
      knockoutMatches: tournament.matches
        .filter(m => m.groupId === null)
        .map(m => ({
          id: m.id,
          homeTeamId: m.homeTeamId,
          awayTeamId: m.awayTeamId,
          homeTeamName: m.homeTeamName || undefined,
          awayTeamName: m.awayTeamName || undefined,
          startTime: m.startTime.toISOString(),
          status: m.status as 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED',
          result: m.result as MatchResult,
          round: m.round,
          leg: (m.leg as 1 | 2) || undefined,
          aggregateMatchId: m.aggregateMatchId || undefined,
          tournamentId: m.tournamentId,
        })),
    };

    return { success: true, tournament: transformedTournament };
  } catch (error) {
    console.error('Error getting tournament:', error);
    return { success: false, error: 'Failed to get tournament' };
  }
}

/**
 * List all tournaments
 */
export async function listTournaments() {
  try {
    const allTournaments = await db.query.tournaments.findMany({
      orderBy: [desc(tournaments.createdAt)],
      with: {
        teams: true,
      },
    });

    return {
      success: true,
      tournaments: allTournaments.map(t => ({
        id: t.id,
        name: t.name,
        status: t.status,
        config: t.config as TournamentConfig,
        teamCount: t.teams.length,
        createdAt: t.createdAt,
      })),
    };
  } catch (error) {
    console.error('Error listing tournaments:', error);
    return { success: false, error: 'Failed to list tournaments' };
  }
}

/**
 * Update tournament status
 */
export async function updateTournamentStatus(tournamentId: string, status: 'DRAFT' | 'ONGOING' | 'COMPLETED') {
  try {
    await db.update(tournaments)
      .set({ 
        status,
        updatedAt: new Date(),
      })
      .where(eq(tournaments.id, tournamentId));

    return { success: true };
  } catch (error) {
    console.error('Error updating tournament status:', error);
    return { success: false, error: 'Failed to update tournament status' };
  }
}

/**
 * Delete a tournament
 */
export async function deleteTournament(tournamentId: string) {
  try {
    await db.delete(tournaments).where(eq(tournaments.id, tournamentId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting tournament:', error);
    return { success: false, error: 'Failed to delete tournament' };
  }
}

/**
 * Save group matches with proper group association
 */
export async function saveGroupMatches(tournamentId: string, groupId: string, groupMatches: Match[]) {
  try {
    // Delete existing matches for this group
    await db.delete(matches).where(eq(matches.groupId, groupId));

    // Insert new matches
    if (groupMatches.length > 0) {
      await db.insert(matches).values(
        groupMatches.map(match => ({
          // id: match.id, // Let DB generate UUID
          tournamentId,
          groupId,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          startTime: new Date(match.startTime),
          status: match.status,
          result: match.result || null,
          round: match.round,
        }))
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving group matches:', error);
    return { success: false, error: 'Failed to save group matches' };
  }
}

/**
 * Save knockout matches
 */
export async function saveKnockoutMatches(tournamentId: string, knockoutMatches: Match[]) {
  try {
    // Delete existing knockout matches for this tournament
    const existingMatches = await db.query.matches.findMany({
      where: eq(matches.tournamentId, tournamentId),
    });
    
    const knockoutMatchIds = existingMatches
      .filter(m => m.groupId === null)
      .map(m => m.id);

    for (const id of knockoutMatchIds) {
      await db.delete(matches).where(eq(matches.id, id));
    }

    // Insert new knockout matches
    if (knockoutMatches.length > 0) {
      await db.insert(matches).values(
        knockoutMatches.map(match => ({
          // id: match.id, // Let DB generate UUID
          tournamentId,
          groupId: null,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          homeTeamName: match.homeTeamName,
          awayTeamName: match.awayTeamName,
          startTime: new Date(match.startTime),
          status: match.status,
          result: match.result || null,
          round: match.round,
          leg: match.leg,
          aggregateMatchId: match.aggregateMatchId,
        }))
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving knockout matches:', error);
    return { success: false, error: 'Failed to save knockout matches' };
  }
}
