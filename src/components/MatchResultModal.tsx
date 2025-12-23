import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Match, MatchResult } from '../types';

interface MatchResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  homeTeamName: string;
  awayTeamName: string;
  onSave: (matchId: string, result: MatchResult) => void;
}

export const MatchResultModal: React.FC<MatchResultModalProps> = ({
  isOpen,
  onClose,
  match,
  homeTeamName,
  awayTeamName,
  onSave
}) => {
  const [homeGoals, setHomeGoals] = useState('0');
  const [awayGoals, setAwayGoals] = useState('0');

  useEffect(() => {
    if (match && match.result) {
      setHomeGoals(String(match.result.homeGoals));
      setAwayGoals(String(match.result.awayGoals));
    } else {
      setHomeGoals('');
      setAwayGoals('');
    }
  }, [match]);

  const handleSave = () => {
    if (!match) return;
    
    const hFunction = parseInt(homeGoals);
    const aFunction = parseInt(awayGoals);

    if (isNaN(hFunction) || isNaN(aFunction)) {
      alert("Please enter valid scores");
      return;
    }

    onSave(match.id, {
      homeGoals: hFunction,
      awayGoals: aFunction
    });
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Enter Match Result"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Result</Button>
        </>
      }
    >
      <div className="flex items-center justify-between gap-4 py-4">
        <div className="flex-1 text-center">
          <label className="block mb-2 font-bold truncate" title={homeTeamName}>{homeTeamName}</label>
          <Input 
            type="number" 
            min="0" 
            value={homeGoals}
            onChange={(e) => setHomeGoals(e.target.value)}
            className="text-center text-2xl font-mono"
          />
        </div>
        
        <div className="text-2xl font-bold opacity-50">-</div>

        <div className="flex-1 text-center">
          <label className="block mb-2 font-bold truncate" title={awayTeamName}>{awayTeamName}</label>
          <Input 
             type="number" 
             min="0"
             value={awayGoals}
             onChange={(e) => setAwayGoals(e.target.value)}
             className="text-center text-2xl font-mono"
          />
        </div>
      </div>
    </Modal>
  );
};
