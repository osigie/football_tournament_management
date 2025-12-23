import React from 'react';
import { Group, Match, Team } from '../types';
import styles from './FixturesGrid.module.css';

interface FixturesGridProps {
  group: Group;
  teams: Team[];
  onEditMatch: (match: Match) => void;
}

export const FixturesGrid: React.FC<FixturesGridProps> = ({ group, teams, onEditMatch }) => {
  const getTeamName = (id: string) => teams.find(t => t.id === id)?.name || 'Unknown';

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {group.matches.map(match => (
            <div 
                key={match.id} 
                className={styles.matchCard}
                onClick={() => onEditMatch(match)}
                role="button"
                tabIndex={0}
            >
                {/* Match Info Header */}
                <div className={styles.status}>
                    {match.status === 'COMPLETED' ? 'Finished' : 'Upcoming'}
                </div>

                <div className={styles.teams}>
                    {/* Home */}
                    <div className={styles.teamRow}>
                        <span className={styles.teamName}>{getTeamName(match.homeTeamId!)}</span>
                        {match.status === 'COMPLETED' && match.result && (
                            <span className={styles.score}>{match.result.homeGoals}</span>
                        )}
                    </div>

                    {/* Away */}
                    <div className={styles.teamRow}>
                        <span className={styles.teamName}>{getTeamName(match.awayTeamId!)}</span>
                        {match.status === 'COMPLETED' && match.result && (
                            <span className={styles.score}>{match.result.awayGoals}</span>
                        )}
                    </div>
                </div>

                {match.status !== 'COMPLETED' && (
                    <div className={styles.vs}>v/s</div>
                )}
            </div>
        ))}
      </div>
    </div>
  );
};
