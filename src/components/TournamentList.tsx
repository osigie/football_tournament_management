import React from 'react';
import styles from './TournamentList.module.css';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

import { TournamentListItem } from '../types';

interface TournamentListProps {
  tournaments: TournamentListItem[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onCreateNew: () => void;
}

export const TournamentList: React.FC<TournamentListProps> = ({ 
  tournaments, 
  onOpen, 
  onDelete,
  onCreateNew 
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Your Glory Awaits</h2>
        <p className={styles.subtitle}>Select an active arena or forge a new destiny</p>
      </div>

      <div className={styles.grid}>
        {/* Create Card */}
        <div className={`${styles.card} ${styles.createCard}`} onClick={onCreateNew}>
          <div className={styles.plusIcon}>+</div>
          <span className={styles.createText}>Forge New Tournament</span>
        </div>

        {/* Tournament Cards */}
        {tournaments.map((t) => (
          <div key={t.id} className={styles.card} onClick={() => onOpen(t.id)}>
            <div className={styles.cardGlow} />
            <div className={styles.cardContent}>
              <div className={styles.tournamentStatus}>
                <span className={`${styles.dot} ${styles[t.status.toLowerCase()]}`} />
                {t.status}
              </div>
              <h3 className={styles.tournamentName}>{t.name}</h3>
              <div className={styles.meta}>
                <span className={styles.teamCount}>{t.teamCount} Teams</span>
                <span className={styles.date}>{new Date(t.createdAt).toLocaleDateString()}</span>
              </div>
              <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" className={styles.deleteBtn} onClick={() => onDelete(t.id)}>
                  Retire
                </Button>
                <Button variant="outline" className={styles.openBtn} onClick={() => onOpen(t.id)}>
                  Enter Arena
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
