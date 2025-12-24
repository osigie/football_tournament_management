'use client';

import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { generateGroups } from '../utils/tournamentEngine';
import { Team, Tournament } from '../types';

interface CreateTournamentProps {
  onCreate: (tournament: Tournament) => void;
}

export const CreateTournament: React.FC<CreateTournamentProps> = ({ onCreate }) => {
  const [name, setName] = useState('');
  const [teamNames, setTeamNames] = useState<string>(''); // Textarea input for now
  const [knockoutFormat, setKnockoutFormat] = useState<'SINGLE' | 'HOME_AND_AWAY'>('SINGLE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate team count for display
  const teamsList = teamNames.split('\n').filter(n => n.trim());
  const teamCount = teamsList.length;

  const handleCreate = async () => {
    const teams: Team[] = teamsList.map((n) => ({
      name: n.trim(),
    })) as Team[];

    if (teams.length < 2) {
      alert('Please enter at least 2 teams');
      return;
    }

    setIsSubmitting(true);
    try {
      // Generate temporary IDs for groups
      const tempTeams: Team[] = teamsList.map((n, i) => ({
        id: `temp-team-${i}`,
        name: n.trim(),
      }));

      const groups = generateGroups(tempTeams);

      // Create a map from temp IDs to team names
      const tempIdToName = new Map<string, string>();
      tempTeams.forEach((t) => tempIdToName.set(t.id, t.name));

      // Import the server action
      const { createTournament } = await import('../app/actions');

      // Call server action to create tournament in database
      // Map temp IDs back to team names for the server
      const result = await createTournament({
        name,
        config: {
          name,
          format: 'GROUP_KNOCKOUT',
          knockoutFormat,
          matchDurationMinutes: 90,
          advancement: { teamsPerGroup: 2, bestThirdPlaced: false },
        },
        teams: teams,
        groups: groups.map((g) => ({
          name: g.name,
          teamIds: g.teamIds.map((tempId) => tempIdToName.get(tempId)!),
        })),
      });

      if (result.success && result.tournament) {
        onCreate(result.tournament);
      } else {
        alert(result.error || 'Failed to create tournament. Please try again.');
      }
    } catch (err) {
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card title="Create New Tournament" className="max-w-3xl mx-auto mt-6 md:mt-12 p-4 md:p-8 shadow-2xl overflow-hidden">
      <div className="flex flex-col gap-6 md:gap-8">
        <Input 
          label="Tournament Name" 
          placeholder="e.g. Summer Cup 2024" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-lg"
        />
        
        <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--foreground))] opacity-70">Knockout Format</span>
            <div className="flex gap-6 p-4 bg-[hsla(220,15%,10%,0.3)] rounded-lg border border-[var(--glass-border)]">
                <label className="flex items-center gap-3 cursor-pointer select-none group">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${knockoutFormat === 'SINGLE' ? 'border-[hsl(var(--primary))]' : 'border-[hsl(var(--foreground))] opacity-50'}`}>
                        {knockoutFormat === 'SINGLE' && <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--primary))]" />}
                    </div>
                    <input 
                        type="radio" 
                        name="knockoutStyle" 
                        value="SINGLE"
                        checked={knockoutFormat === 'SINGLE'} 
                        onChange={() => setKnockoutFormat('SINGLE')}
                        className="hidden"
                    />
                    <span className="group-hover:text-[hsl(var(--primary))] transition-colors">Single Match</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer select-none group">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${knockoutFormat === 'HOME_AND_AWAY' ? 'border-[hsl(var(--primary))]' : 'border-[hsl(var(--foreground))] opacity-50'}`}>
                        {knockoutFormat === 'HOME_AND_AWAY' && <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--primary))]" />}
                    </div>
                    <input 
                        type="radio" 
                        name="knockoutStyle" 
                        value="HOME_AND_AWAY"
                        checked={knockoutFormat === 'HOME_AND_AWAY'} 
                        onChange={() => setKnockoutFormat('HOME_AND_AWAY')}
                        className="hidden"
                    />
                    <span className="group-hover:text-[hsl(var(--primary))] transition-colors">Home & Away</span>
                </label>
            </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-end">
             <label className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--foreground))] opacity-70">Participating Teams </label>
             <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${teamCount < 2 ? 'bg-red-500/20 text-red-500' : 'bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))]'}`}>
               {teamCount} Teams Added
             </span>
          </div>
          <textarea 
            className="w-full h-44 md:h-48 p-3 md:p-4 rounded-xl bg-[hsla(220,15%,8%,0.4)] border border-[var(--glass-border)] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))] transition-all resize-none font-mono text-sm leading-6"
            placeholder="Enter one team name per line...&#10;Real Madrid&#10;Barcelona&#10;Bayern Munich"
            value={teamNames}
            onChange={(e) => setTeamNames(e.target.value)}
          />
          <p className="text-[10px] md:text-xs text-[hsl(var(--foreground))] opacity-50">
             Minimum 2 teams required. The system will automatically generate groups.
          </p>
        </div>

        <div className="pt-4">
            <Button 
              onClick={handleCreate} 
              disabled={!name || teamCount < 2 || isSubmitting} 
              className="w-full py-4 text-lg shadow-xl relative overflow-hidden"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                'Launch Tournament'
              )}
            </Button>
        </div>
      </div>
    </Card>
  );
};
