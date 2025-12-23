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

  // Calculate team count for display
  const teamsList = teamNames.split('\n').filter(n => n.trim());
  const teamCount = teamsList.length;

  const handleCreate = () => {
    const teams: Team[] = teamsList.map((n, i) => ({
      id: `team-${i}-${Date.now()}`,
      name: n.trim(),
    }));

    if (teams.length < 2) {
      alert('Please enter at least 2 teams');
      return;
    }

    const groups = generateGroups(teams);

    const newTournament: Tournament = {
      id: `tourney-${Date.now()}`,
      name,
      status: 'DRAFT',
      config: {
        name,
        format: 'GROUP_KNOCKOUT',
        knockoutFormat,
        matchDurationMinutes: 90,
        advancement: { teamsPerGroup: 2, bestThirdPlaced: false }
      },
      teams,
      groups,
      knockoutMatches: []
    };

    onCreate(newTournament);
  };

  return (
    <Card title="Create New Tournament" className="max-w-3xl mx-auto mt-12 p-8 shadow-2xl">
      <div className="flex flex-col gap-8">
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
            className="w-full h-48 p-4 rounded-xl bg-[hsla(220,15%,8%,0.4)] border border-[var(--glass-border)] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))] transition-all resize-none font-mono text-sm leading-6"
            placeholder="Enter one team name per line...&#10;Real Madrid&#10;Barcelona&#10;Bayern Munich"
            value={teamNames}
            onChange={(e) => setTeamNames(e.target.value)}
          />
          <p className="text-xs text-[hsl(var(--foreground))] opacity-50">
             Minimum 2 teams required. The system will automatically generate groups.
          </p>
        </div>

        <div className="pt-4">
            <Button onClick={handleCreate} disabled={!name || teamCount < 2} className="w-full py-4 text-lg shadow-xl">
            Launch Tournament
            </Button>
        </div>
      </div>
    </Card>
  );
};
