import React from 'react';
import { Match, Team } from '../types';
import { Card } from './ui/Card';

interface BracketViewerProps {
  matches: Match[];
  teams: Team[];
}

export const BracketViewer: React.FC<BracketViewerProps> = ({ matches, teams }) => {
  // Group matches by round
  const rounds = matches.reduce((acc, match) => {
    const roundKey = match.round;
    if (!acc[roundKey]) acc[roundKey] = [];
    acc[roundKey].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  // Sort rounds descending (e.g. 16 -> 8 -> 4 -> 2)
  const sortedRoundKeys = Object.keys(rounds).map(Number).sort((a, b) => b - a);
  
  const getRoundName = (round: number) => {
    if (round === 2) return 'Final';
    if (round === 4) return 'Semi-Finals';
    if (round === 8) return 'Quarter-Finals';
    return `Round of ${round}`;
  };

  const getTeamName = (id: string | null) => {
    if (!id) return 'TBD';
    return teams.find(t => t.id === id)?.name || 'Unknown';
  };

  return (
    <Card title="Knockout Bracket" className="overflow-x-auto">
      <div className="flex gap-12 min-w-max p-4">
        {sortedRoundKeys.map(round => (
          <div key={round} className="flex flex-col justify-around gap-8 min-w-[200px]">
             <h4 className="text-center font-bold text-[hsl(var(--primary))] uppercase text-sm tracking-wider mb-4 border-b border-[var(--glass-border)] pb-2">
               {getRoundName(round)}
             </h4>
             <div className="flex flex-col justify-around flex-grow gap-8">
               {rounds[round].map(match => (
                 <div key={match.id} className="relative bg-[hsla(220,15%,20%,0.4)] p-3 rounded border border-[var(--glass-border)] flex flex-col gap-2">
                   {/* Home */}
                   <div className="flex justify-between items-center text-sm">
                      <span className={match.result && match.result.homeGoals > match.result.awayGoals ? 'font-bold text-[hsl(var(--primary))]' : ''}>
                        {getTeamName(match.homeTeamId)}
                      </span>
                      {match.result && <span className="bg-[var(--surface)] px-1.5 rounded">{match.result.homeGoals}</span>}
                   </div>
                   
                   {/* Divider */}
                   <div className="h-[1px] bg-[var(--glass-border)] w-full my-0.5"></div>

                   {/* Away */}
                   <div className="flex justify-between items-center text-sm">
                      <span className={match.result && match.result.awayGoals > match.result.homeGoals ? 'font-bold text-[hsl(var(--primary))]' : ''}>
                        {getTeamName(match.awayTeamId)}
                      </span>
                      {match.result && <span className="bg-[var(--surface)] px-1.5 rounded">{match.result.awayGoals}</span>}
                   </div>
                   
                   {/* Leg Info */}
                   {match.leg && (
                    <div className="absolute top-0 right-0 bg-[var(--primary)] text-[var(--primary-foreground)] text-[10px] px-1 rounded-bl">
                        L{match.leg}
                    </div>
                   )}

                   {/* Connector lines (visual only, simplified) */}
                   <div className="absolute right-[-24px] top-1/2 w-6 h-[1px] bg-[var(--glass-border)] hidden md:block"></div>
                 </div>
               ))}
             </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
