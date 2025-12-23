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

  const handleCreate = () => {
    const teams: Team[] = teamNames.split('\n').filter(n => n.trim()).map((n, i) => ({
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
    <Card title="Create New Tournament" className="max-w-2xl mx-auto mt-10">
      <div className="flex flex-col gap-6">
        <Input 
          label="Tournament Name" 
          placeholder="e.g. Summer Cup 2024" 
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        
        <div className="flex flex-col gap-2">
            <span className="text-sm font-medium opacity-90">Knockout Stage Format</span>
            <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="radio" 
                        name="knockoutStyle" 
                        value="SINGLE"
                        checked={knockoutFormat === 'SINGLE'} 
                        onChange={() => setKnockoutFormat('SINGLE')}
                        className="accent-[hsl(var(--primary))]"
                    />
                    Single Match
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="radio" 
                        name="knockoutStyle" 
                        value="HOME_AND_AWAY"
                        checked={knockoutFormat === 'HOME_AND_AWAY'} 
                        onChange={() => setKnockoutFormat('HOME_AND_AWAY')}
                        className="accent-[hsl(var(--primary))]"
                    />
                    Home & Away
                </label>
            </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium opacity-90">Teams (One per line)</label>
          <textarea 
            className="w-full h-40 p-3 rounded-xl bg-[hsla(220,15%,8%,0.4)] border border-[var(--glass-border)] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--primary))]"
            placeholder="Real Madrid&#10;Barcelona&#10;Bayern Munich&#10;..."
            value={teamNames}
            onChange={(e) => setTeamNames(e.target.value)}
          />
        </div>

        <Button onClick={handleCreate} disabled={!name || !teamNames}>
          Start Tournament
        </Button>
      </div>
    </Card>
  );
};
