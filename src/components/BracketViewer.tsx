import React from 'react';
import { Match, Team } from '../types';
import { Card } from './ui/Card';
import styles from './BracketViewer.module.css';

interface BracketViewerProps {
  matches: Match[];
  teams: Team[];
  onEditMatch?: (match: Match) => void;
}

export const BracketViewer: React.FC<BracketViewerProps> = ({ matches, teams, onEditMatch }) => {
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
    <Card title="Knockout Bracket" className={styles.container}>
      <div className={styles.bracket}>
        {sortedRoundKeys.map(round => (
          <div key={round} className={styles.round}>
             <h4 className={styles.roundHeader}>
               {getRoundName(round)}
             </h4>
             {rounds[round].map(match => (
               <div key={match.id} className={styles.matchWrapper}>
                 <div className={styles.match}>
                   {match.leg && (
                    <div className={styles.legBadge}>
                        Leg {match.leg}
                    </div>
                   )}
                   
                   {/* Home */}
                   <div className={styles.teamRow}>
                      <span className={`${styles.teamName} ${match.result && match.result.homeGoals > match.result.awayGoals ? styles.winner : ''}`}>
                        {getTeamName(match.homeTeamId)}
                      </span>
                      {match.result && <span className={styles.score}>{match.result.homeGoals}</span>}
                   </div>
                   
                   <div className={styles.divider}></div>

                   {/* Away */}
                   <div className={styles.teamRow}>
                      <span className={`${styles.teamName} ${match.result && match.result.awayGoals > match.result.homeGoals ? styles.winner : ''}`}>
                        {getTeamName(match.awayTeamId)}
                      </span>
                      {match.result && <span className={styles.score}>{match.result.awayGoals}</span>}
                   </div>

                   {/* Action Button */}
                   {match.homeTeamId && match.awayTeamId && (
                    <button 
                        className="absolute bottom-2 right-2 text-[10px] uppercase font-bold text-[hsl(var(--primary))] opacity-50 hover:opacity-100"
                        onClick={() => onEditMatch && onEditMatch(match)}
                    >
                        {match.status === 'COMPLETED' ? 'Edit' : 'Enter'}
                    </button>
                   )}
                 </div>
               </div>
             ))}
          </div>
        ))}
      </div>
    </Card>
  );
};
