'use client';

import React, { useState } from 'react';
import { CreateTournament } from '../components/CreateTournament';
import { StandingsTable } from '../components/StandingsTable';
import { BracketViewer } from '../components/BracketViewer';
import { FixturesGrid } from '../components/FixturesGrid';
import { MatchResultModal } from '../components/MatchResultModal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Tournament, Group, Match } from '../types';
import { generateFixtures } from '../utils/tournamentEngine';
import { calculateStandings } from '../utils/rankingEngine';
import { generateBracket, updateKnockoutBracket } from '../utils/knockoutEngine';

export default function Home() {
  const [tournament, setTournament] = useState<Tournament | null>(null);

  const handleTournamentCreated = (t: Tournament) => {
    // Auto-generate fixtures for groups
    const groupsWithMatches = t.groups.map(g => ({
      ...g,
      matches: generateFixtures(g, t.id)
    }));
    
    setTournament({ ...t, groups: groupsWithMatches, status: 'ONGOING' });
  };

  // State for manual score entry
  const [editingMatch, setEditingMatch] = useState<{ match: Match, groupIndex?: number } | null>(null);

  const handleUpdateResult = (matchId: string, result: any) => {
    if (!tournament) return;

    // Check if it's a Knockout match
    const isKnockout = tournament.knockoutMatches.some(m => m.id === matchId);

    if (isKnockout) {
        let updatedMatches = tournament.knockoutMatches.map(m => {
            if (m.id === matchId) {
                return { ...m, status: 'COMPLETED' as const, result };
            }
            return m;
        });
        
        // Auto-Adjacency logic using the new engine function
        updatedMatches = updateKnockoutBracket(updatedMatches);

        setTournament({ ...tournament, knockoutMatches: updatedMatches });
    } else {
        // Group Stage Match
        const newGroups = tournament.groups.map(group => {
            const matchIndex = group.matches.findIndex(m => m.id === matchId);
            if (matchIndex === -1) return group;
      
            const updatedMatches = [...group.matches];
            updatedMatches[matchIndex] = {
              ...updatedMatches[matchIndex],
              status: 'COMPLETED',
              result
            };
            return { ...group, matches: updatedMatches };
          });
          
          setTournament({ ...tournament, groups: newGroups });
    }

    setEditingMatch(null);
  };
    
  if (!tournament) {

    return (
      <div className="py-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-10 primary-gradient-text tracking-tight">
          TournamentFlow
        </h1>
        <CreateTournament onCreate={handleTournamentCreated} />
      </div>
    );
  }

  // Get current standings based on matches
  // Helper to find teams in a group
  const getGroupStandings = (group: Group) => {
    const groupTeams = tournament.teams.filter(t => group.teamIds.includes(t.id));
    return calculateStandings(groupTeams, group.matches);
  };

  // Determine if group stage is complete to show bracket button
  const isGroupStageComplete = tournament.groups.every(g => 
    g.matches.every(m => m.status === 'COMPLETED')
  );

  const startKnockoutStage = () => {
    // Generate bracket based on current standings
    const allStandings = tournament.groups.map(g => getGroupStandings(g));
    let bracket = generateBracket(allStandings, tournament.id, tournament.config);
    
    // Auto-advance byes immediately
    bracket = updateKnockoutBracket(bracket);
    
    setTournament({ ...tournament, knockoutMatches: bracket });
  };

  return (
    <div className="pb-20">
      <header className="flex justify-between items-center mb-8 py-4 border-b border-[var(--glass-border)]">
        <h2 className="text-2xl font-bold">{tournament.name}</h2>
        <div className="flex gap-4">
          {isGroupStageComplete && tournament.knockoutMatches.length === 0 && (
             <Button onClick={startKnockoutStage}>Generate Knockout Bracket</Button>
          )}
          <Button variant="outline" onClick={() => setTournament(null)}>New Tournament</Button>
        </div>
      </header>
      
      <div className="flex flex-col gap-12">
        <section>
          <h3 className="text-xl font-semibold mb-4 opacity-80">Group Stage</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {tournament.groups.map((group, idx) => (
              <div key={group.id} className="flex flex-col gap-4">
                <StandingsTable 
                  groupName={group.name} 
                  standings={getGroupStandings(group)} 
                />
                
                <Card title="Fixtures" className="overflow-x-auto">
                   <FixturesGrid 
                      group={group} 
                      teams={tournament.teams} 
                      onEditMatch={(match) => setEditingMatch({ match, groupIndex: idx })}
                   />
                </Card>
              </div>
            ))}
          </div>
        </section>

        {tournament.knockoutMatches && tournament.knockoutMatches.length > 0 && (
          <section>
            <h3 className="text-xl font-semibold mb-4 opacity-80">Knockout Stage</h3>
             <BracketViewer 
                 matches={tournament.knockoutMatches} 
                 teams={tournament.teams} 
                 onEditMatch={(match) => setEditingMatch({ match })}
             />
          </section>
        )}
      </div>

      {editingMatch && (
        <MatchResultModal 
          isOpen={!!editingMatch}
          onClose={() => setEditingMatch(null)}
          match={editingMatch.match}
          homeTeamName={tournament.teams.find(t => t.id === editingMatch.match.homeTeamId)?.name || 'Home'}
          awayTeamName={tournament.teams.find(t => t.id === editingMatch.match.awayTeamId)?.name || 'Away'}
          onSave={handleUpdateResult}
        />
      )}
    </div>
  );
}
