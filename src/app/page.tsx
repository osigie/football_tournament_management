'use client';

import React, { useState, useEffect } from 'react';
import { CreateTournament } from '../components/CreateTournament';
import { StandingsTable } from '../components/StandingsTable';
import { BracketViewer } from '../components/BracketViewer';
import { FixturesGrid } from '../components/FixturesGrid';
import { MatchResultModal } from '../components/MatchResultModal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Tournament, Group, Match, MatchResult, TournamentListItem } from '../types';
import { generateFixtures } from '../utils/tournamentEngine';
import { calculateStandings } from '../utils/rankingEngine';
import { generateBracket, updateKnockoutBracket } from '../utils/knockoutEngine';
import {
  getTournament,
  listTournaments,
  updateMatchResult,
  saveGroupMatches,
  saveKnockoutMatches,
  updateTournamentStatus,
  deleteTournament,
} from './actions';

import { TournamentList } from '../components/TournamentList';

export default function Home() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [tournaments, setTournaments] = useState<TournamentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Sync tournament from URL on mount and list tournaments
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const listPromise = listTournaments();
      
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      
      if (id) {
        const result = await getTournament(id);
        if (result.success && result.tournament) {
          setTournament(result.tournament);
        }
      }
      
      const listResult = await listPromise;
      if (listResult.success && listResult.tournaments) {
        setTournaments(listResult.tournaments);
      }
      
      setLoading(false);
    };
    init();
  }, []);

  // Update URL when tournament changes
  useEffect(() => {
    const url = new URL(window.location.href);
    if (tournament) {
      url.searchParams.set('id', tournament.id);
    } else {
      url.searchParams.delete('id');
    }
    window.history.pushState({}, '', url);
  }, [tournament]);

  const loadTournaments = async () => {
    const result = await listTournaments();
    if (result.success && result.tournaments) {
      setTournaments(result.tournaments);
    }
  };

  const loadTournament = async (tournamentId: string) => {
    setLoading(true);
    const result = await getTournament(tournamentId);
    if (result.success && result.tournament) {
      setTournament(result.tournament);
      setShowCreateForm(false);
    }
    setLoading(false);
  };

  const handleTournamentCreated = async (t: Tournament) => {
    // Optimistically set the tournament to show the structure immediately if possible
    // But we need fixtures first, so let's generate them
    const groupsWithMatches = t.groups.map(g => ({
      ...g,
      matches: generateFixtures(g, t.id)
    }));
    
    const preparedTournament = { ...t, groups: groupsWithMatches, status: 'ONGOING' as const };
    setTournament(preparedTournament);
    
    // Save to DB in background
    Promise.all([
      ...groupsWithMatches.map(group => saveGroupMatches(t.id, group.id, group.matches)),
      updateTournamentStatus(t.id, 'ONGOING')
    ]).then(() => {
      loadTournaments();
    });
  };

  const [editingMatch, setEditingMatch] = useState<{ match: Match, groupIndex?: number } | null>(null);

  const handleUpdateResult = async (matchId: string, result: MatchResult) => {
    if (!tournament) return;

    // OPTIMISTIC UPDATE: Update local state immediately
    const isKnockout = tournament.knockoutMatches.some(m => m.id === matchId);

    if (isKnockout) {
      let updatedMatches = tournament.knockoutMatches.map(m => {
        if (m.id === matchId) {
          return { ...m, status: 'COMPLETED' as const, result };
        }
        return m;
      });
      
      updatedMatches = updateKnockoutBracket(updatedMatches);
      setTournament({ ...tournament, knockoutMatches: updatedMatches });
      
      // Save in background
      updateMatchResult(matchId, result);
      saveKnockoutMatches(tournament.id, updatedMatches);
    } else {
      const newGroups = tournament.groups.map(group => {
        const matchIndex = group.matches.findIndex(m => m.id === matchId);
        if (matchIndex === -1) return group;

        const updatedMatches = [...group.matches];
        updatedMatches[matchIndex] = {
          ...updatedMatches[matchIndex],
          status: 'COMPLETED',
          result
        };
        
        // Save in background
        updateMatchResult(matchId, result);
        saveGroupMatches(tournament.id, group.id, updatedMatches);
        
        return { ...group, matches: updatedMatches };
      });
      
      setTournament({ ...tournament, groups: newGroups });
    }

    setEditingMatch(null);
  };

  const handleDeleteTournament = async (tournamentId: string) => {
    if (confirm('Are you sure you want to delete this tournament? Permanent action.')) {
      await deleteTournament(tournamentId);
      if (tournament?.id === tournamentId) {
        setTournament(null);
      }
      await loadTournaments();
    }
  };
    
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-xl font-bold opacity-70 tracking-widest uppercase">Initializing Arena...</div>
      </div>
    );
  }

  // Home View: Fancy List or Create Form
  if (!tournament) {
    return (
      <div className="py-6 md:py-10 animate-in fade-in duration-700 px-4">
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-center mb-4 primary-gradient-text tracking-tighter italic px-2">
          Tournament Flow
        </h1>
        <p className="text-center text-base md:text-lg opacity-50 mb-8 md:mb-12 max-w-2xl mx-auto px-4">
          The ultimate platform for managing football tournaments. Seamless, social, and professional.
        </p>
        
        {showCreateForm ? (
          <div className="animate-in slide-in-from-bottom duration-500">
            <div className="max-w-3xl mx-auto mb-8 px-4">
              <Button variant="ghost" onClick={() => setShowCreateForm(false)} className="mb-4">
                ← Back to Tournament List
              </Button>
            </div>
            <CreateTournament onCreate={handleTournamentCreated} />
          </div>
        ) : (
          <TournamentList 
            tournaments={tournaments}
            onOpen={loadTournament}
            onDelete={handleDeleteTournament}
            onCreateNew={() => setShowCreateForm(true)}
          />
        )}
      </div>
    );
  }

  // Tournament View
  const getGroupStandings = (group: Group) => {
    const groupTeams = tournament.teams.filter(t => group.teamIds.includes(t.id));
    return calculateStandings(groupTeams, group.matches);
  };

  const isGroupStageComplete = tournament.groups.every(g => 
    g.matches.every(m => m.status === 'COMPLETED')
  );

  const startKnockoutStage = async () => {
    const allStandings = tournament.groups.map(g => getGroupStandings(g));
    let bracket = generateBracket(allStandings, tournament.id, tournament.config);
    bracket = updateKnockoutBracket(bracket);
    
    // Optimistic update
    setTournament({ ...tournament, knockoutMatches: bracket });
    
    // Background save
    saveKnockoutMatches(tournament.id, bracket);
  };

  return (
    <div className="pb-20 animate-in fade-in zoom-in-95 duration-500 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-12 py-4 md:py-6 border-b border-[var(--glass-border)] gap-6">
        <div>
          <Button variant="ghost" onClick={() => setTournament(null)} className="mb-2 p-0 h-auto hover:bg-transparent opacity-50 hover:opacity-100">
            ← Home
          </Button>
          <h2 className="text-2xl md:text-4xl font-black tracking-tight">{tournament.name}</h2>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <Button 
            variant="outline" 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('Share link copied to clipboard!');
            }}
          >
            Share Link
          </Button>
          {isGroupStageComplete && tournament.knockoutMatches.length === 0 && (
             <Button onClick={startKnockoutStage} className="pulse-animation">Generate Knockout Bracket</Button>
          )}
          <Button variant="primary" onClick={() => setTournament(null)}>Switch Tournament</Button>
        </div>
      </header>
      
      <div className="flex flex-col gap-10 md:gap-16">
        <section>
          <div className="flex items-center gap-4 mb-6 md:mb-8">
            <h3 className="text-xl md:text-2xl font-bold opacity-90">Group Stage</h3>
            <div className="h-px flex-1 bg-gradient-to-r from-[var(--glass-border)] to-transparent" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            {tournament.groups.map((group, idx) => (
              <div key={group.id} className="flex flex-col gap-6">
                <StandingsTable 
                  groupName={`Group ${group.name}`} 
                  standings={getGroupStandings(group)} 
                />
                
                <Card title="Fixtures" className="glass-card">
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
          <section className="animate-in slide-in-from-bottom duration-700">
            <div className="flex items-center gap-4 mb-8">
              <h3 className="text-2xl font-bold opacity-90">Knockout Stage</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-[var(--glass-border)] to-transparent" />
            </div>
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
