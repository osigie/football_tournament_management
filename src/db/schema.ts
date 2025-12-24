import { pgTable, text, timestamp, integer, jsonb, boolean, uuid, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Tournaments table
export const tournaments = pgTable('tournaments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  status: text('status').notNull().default('DRAFT'), // DRAFT, ONGOING, COMPLETED
  config: jsonb('config').notNull(), // Store TournamentConfig as JSON
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Teams table
export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: uuid('tournament_id').notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Groups table
export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: uuid('tournament_id').notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Group-Team junction table (many-to-many)
export const groupTeams = pgTable('group_teams', {
  groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.groupId, table.teamId] }),
}));

// Matches table (for both group stage and knockout)
export const matches = pgTable('matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: uuid('tournament_id').notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id').references(() => groups.id, { onDelete: 'cascade' }), // null for knockout matches
  homeTeamId: uuid('home_team_id').references(() => teams.id, { onDelete: 'set null' }),
  awayTeamId: uuid('away_team_id').references(() => teams.id, { onDelete: 'set null' }),
  homeTeamName: text('home_team_name'), // For placeholder teams
  awayTeamName: text('away_team_name'),
  startTime: timestamp('start_time').notNull(),
  status: text('status').notNull().default('SCHEDULED'), // SCHEDULED, IN_PROGRESS, COMPLETED
  result: jsonb('result'), // Store MatchResult as JSON
  round: integer('round').notNull().default(0), // 0 for group stage
  leg: integer('leg'), // 1 or 2 for home & away
  aggregateMatchId: uuid('aggregate_match_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations
export const tournamentsRelations = relations(tournaments, ({ many }) => ({
  teams: many(teams),
  groups: many(groups),
  matches: many(matches),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [teams.tournamentId],
    references: [tournaments.id],
  }),
  groupTeams: many(groupTeams),
  homeMatches: many(matches, { relationName: 'homeTeam' }),
  awayMatches: many(matches, { relationName: 'awayTeam' }),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [groups.tournamentId],
    references: [tournaments.id],
  }),
  groupTeams: many(groupTeams),
  matches: many(matches),
}));

export const groupTeamsRelations = relations(groupTeams, ({ one }) => ({
  group: one(groups, {
    fields: [groupTeams.groupId],
    references: [groups.id],
  }),
  team: one(teams, {
    fields: [groupTeams.teamId],
    references: [teams.id],
  }),
}));

export const matchesRelations = relations(matches, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [matches.tournamentId],
    references: [tournaments.id],
  }),
  group: one(groups, {
    fields: [matches.groupId],
    references: [groups.id],
  }),
  homeTeam: one(teams, {
    fields: [matches.homeTeamId],
    references: [teams.id],
    relationName: 'homeTeam',
  }),
  awayTeam: one(teams, {
    fields: [matches.awayTeamId],
    references: [teams.id],
    relationName: 'awayTeam',
  }),
}));
