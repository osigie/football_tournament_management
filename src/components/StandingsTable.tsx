import React from 'react';
import { GroupStanding } from '../types';
import styles from './StandingsTable.module.css';

interface StandingsTableProps {
  standings: GroupStanding[];
  groupName?: string;
}

export const StandingsTable: React.FC<StandingsTableProps> = ({ standings, groupName }) => {
  return (
    <div className={styles.container}>
      {groupName && <div className={styles.header}>Group {groupName}</div>}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.rankCol}>#</th>
              <th className={styles.teamCol}>Team</th>
              <th>P</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th>GF</th>
              <th>GA</th>
              <th>GD</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((team, idx) => (
              <tr key={team.teamId} className={`${idx < 2 ? styles.qualified : ''}`}>
                <td className={styles.rankCol}>{team.rank}</td>
                <td className={styles.teamCol}>
                  <span className={styles.teamName}>{team.teamName}</span>
                </td>
                <td>{team.played}</td>
                <td>{team.won}</td>
                <td>{team.drawn}</td>
                <td>{team.lost}</td>
                <td>{team.goalsFor}</td>
                <td>{team.goalsAgainst}</td>
                <td>{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</td>
                <td className={styles.points}>{team.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
