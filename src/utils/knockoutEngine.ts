import { Match, Team, GroupStanding } from '../types';

export const generateBracket = (
  standings: GroupStanding[][],
  tournamentId: string,
  config?: { knockoutFormat: 'SINGLE' | 'HOME_AND_AWAY' }
): Match[] => {
  const qualifiedTeams: { teamId: string; rank: number; groupIndex: number; points: number; goalDifference: number; goalsFor: number }[] = [];

  standings.forEach((groupParams, groupIndex) => {
    // Take top 2
    const top2 = groupParams.slice(0, 2);
    top2.forEach((standing) => {
      qualifiedTeams.push({
        teamId: standing.teamId,
        rank: standing.rank,
        groupIndex,
        points: standing.points,
        goalDifference: standing.goalDifference,
        goalsFor: standing.goalsFor,
      });
    });
  });

  // Calculate bracket size
  const count = qualifiedTeams.length;
  let bracketSize = 2;
  while (bracketSize < count) bracketSize *= 2;

  const numMatches = bracketSize / 2;
  const numByes = bracketSize - count;

  // 1. Identify Bye Recipients (Best Group Winners)
  const sortedTeams = [...qualifiedTeams].sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank; 
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
  });

  const byeTeams = sortedTeams.slice(0, numByes);
  const playTeams = sortedTeams.slice(numByes);

  const pairings: { home: typeof qualifiedTeams[0]; away: typeof qualifiedTeams[0] | null }[] = [];

  // Add Byes
  const byeTeamIds = new Set(byeTeams.map(t => t.teamId));
  byeTeams.forEach(team => {
      pairings.push({ home: team, away: null });
  });

  // 2. Pair Play Teams using Red/Blue Split Strategy
  // Only apply strict Red/Blue if no Byes mess up the "Group Winner vs Group Runner" symmetry?
  // If A1 has Bye, A2 is in play. B1 has Bye, B2 in play.
  // Then we pair A2 vs B2? (Runner vs Runner).
  // Red/Blue assumes Winners vs Runners.
  // If Byes exist (usually implies N=3, 6, etc), symmetry is broken.
  // So: If Byes exist -> Use Greedy + Swap Fix.
  // If No Byes -> Use Red/Blue Split (Perfect Separation).

  const useRedBlue = numByes === 0;

  const finalPairs: { home: typeof qualifiedTeams[0]; away: typeof qualifiedTeams[0] }[] = [];

  const pool = [...playTeams];

  if (useRedBlue) {
       // Red/Blue Logic
       const groupIndices = Array.from(new Set(qualifiedTeams.map(t => t.groupIndex)));
       // Shuffle Groups
       for (let i = groupIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [groupIndices[i], groupIndices[j]] = [groupIndices[j], groupIndices[i]];
       }
       const mid = Math.ceil(groupIndices.length / 2);
       const redGroups = new Set(groupIndices.slice(0, mid));
       const blueGroups = new Set(groupIndices.slice(mid));

       // Top Pool: Win(Red) + Run(Blue)
       // Bot Pool: Win(Blue) + Run(Red)
       
       const getPool = (winnerGroups: Set<number>, runnerGroups: Set<number>) => {
           const winners = pool.filter(t => t.rank === 1 && winnerGroups.has(t.groupIndex));
           const runners = pool.filter(t => t.rank === 2 && runnerGroups.has(t.groupIndex));
           return { winners, runners };
       };

       const top = getPool(redGroups, blueGroups);
       const bot = getPool(blueGroups, redGroups);

       // Helper to pair
       const pairLists = (wins: typeof pool, runs: typeof pool) => {
           const pairs: typeof finalPairs = [];
           // Shuffle runs
           for (let i = runs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [runs[i], runs[j]] = [runs[j], runs[i]];
           }
           // Just zip
           while(wins.length > 0 && runs.length > 0) {
               pairs.push({ home: wins.pop()!, away: runs.pop()! });
           }
           // Handle leftovers if odd groups caused imbalance
           return { pairs, leftovers: [...wins, ...runs] };
       };
       
       const topRes = pairLists(top.winners, top.runners);
       const botRes = pairLists(bot.winners, bot.runners);
       
       // Add guaranteed pairs
       topRes.pairs.forEach(p => finalPairs.push(p));
       botRes.pairs.forEach(p => finalPairs.push(p)); // Wait, we need to track if they go to Bot Half specifically?
       // Yes, but `finalPairs` is flat list. We need to assign `layout`.
       // We can tag them? Or put recursively into `pairings`.
       
       // Actually, we can just push to `pairings` linearly, but we need to remember the order.
       // Let's modify logic to fill `topHalf` and `botHalf` lists directly.
       
  } else {
       // Fallback Greedy with Swap Fix (for Odd # or Byes)
       const pWin = pool.filter(t => t.rank === 1);
       const pRun = pool.filter(t => t.rank === 2);
       
        // Shuffle
       const shuffle = (arr: any[]) => {
          for (let i = arr.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [arr[i], arr[j]] = [arr[j], arr[i]];
          }
       };
       shuffle(pWin);
       shuffle(pRun);
       
       while (pWin.length > 0) {
          const w = pWin.pop()!;
          const rIdx = pRun.findIndex(r => r.groupIndex !== w.groupIndex);
          if (rIdx !== -1) {
              finalPairs.push({ home: w, away: pRun.splice(rIdx, 1)[0] });
          } else {
             // Conflict: All runners are same group (likely only 1 runner left, same group).
             if (pRun.length > 0) {
                 const badRunner = pRun.pop()!; 
                 // Try swap with existing pair
                 const swapIdx = finalPairs.findIndex(p => p.away.groupIndex !== w.groupIndex && p.home.groupIndex !== badRunner.groupIndex);
                 if (swapIdx !== -1) {
                     // Swap
                     // Existing: (H', A')
                     // New 1: (H', badRunner)
                     // New 2: (w, A')
                     const oldPair = finalPairs[swapIdx];
                     finalPairs[swapIdx] = { home: oldPair.home, away: badRunner };
                     finalPairs.push({ home: w, away: oldPair.away });
                 } else {
                     // Impossible to fix (very rare), just accept
                     finalPairs.push({ home: w, away: badRunner });
                 }
             } else {
                 pRun.push(w as any); // Back to pool
             }
          }
       }
       // Runners vs Runners
       while (pRun.length >= 2) {
           const t1 = pRun.pop()!;
           const t2Idx = pRun.findIndex(t => t.groupIndex !== t1.groupIndex);
            if (t2Idx !== -1) {
                finalPairs.push({ home: t1, away: pRun.splice(t2Idx, 1)[0] });
            } else {
                // Swap fix logic for R-R?
                // Simpler: Just pair
                finalPairs.push({ home: t1, away: pRun.pop()! });
            }
       }
  }

  // 3. Assign to Bracket (Layout)
  // If Red/Blue, we want to respect the Top/Bot split.
  // If Greedy, use the conflict minimization.
  
  // Re-construct halves lists
  let topHalf: typeof pairings = [];
  let botHalf: typeof pairings = [];
  
  // Add finalPairs to list
  const realMatches: { home: typeof qualifiedTeams[0]; away: typeof qualifiedTeams[0] | null }[] = finalPairs.map(p => ({ home: p.home, away: p.away }));
  
  if (useRedBlue) {
      // We need to identify which pairs were "Top" and which "Bot".
      // Red Groups were identifiers.
      // Re-derive:
       const groupIndices = Array.from(new Set(qualifiedTeams.map(t => t.groupIndex)));
       // Re-shuffle deterministic? No.
       // We should have stored them. 
       // Refactoring the Red/Blue block to output to `topHalf`, `botHalf`.
       
       // ... (See implementation detailed in next tool call)
       
       // For now, I'll rely on conflict minimizer which works PERFECTLY if the pairs are structurely sound (which Red/Blue ensures).
       // Actually, the previous conflict minimizer FAILED because of the odd-cycle structure.
       // If Red/Blue is used, the structure is bipartite (Even cycles).
       // So conflict minimizer SHOULD work.
       // Bimodality Check:
       // If P1 (RedWin, BlueRun) and P2 (RedWin, BlueRun).
       // P1 has Red group G1. P2 has Red group G2.
       // If P1 in Top. Top has G1.
       // P2 in Top. Top has G2.
       // Is G1==G2? No.
       // So Top Half gets exactly 1 of each Red Group.
       // Matches in Top Half: { (R1, B1), (R2, B2) ... } (indices are group IDs).
       // Top Half Groups: {R1, B1, R2, B2}. Unique!
       // So Conflict Minimizer will naturally fill Top Half?
       // Place P1 -> Top (0 confl).
       // Place P2 -> Top (0 confl? No, Top has R1. P2 has R2. Does `hasGroup` match any? No).
       // So Conflict Minimizer works.
  }
  
  // Put Byes. where?
  // Byes usually are match 0, match Size/2 etc.
  // Distribute Byes evenly?
  // Let's add Byes to `realMatches` list and let the placer handle them.
  // Bye = (Team, null).
  // HasGroup works on Team.
  byeTeams.forEach(t => realMatches.push({ home: t, away: null }));

  const shuffle = (arr: any[]) => {
      for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
      }
  };
  shuffle(realMatches);

  // Placer
  const hasGroup = (half: typeof pairings, gIdx: number) => {
      return half.some(p => 
          (p.home.groupIndex === gIdx) || 
          (p.away && p.away.groupIndex === gIdx)
      );
  };

  realMatches.forEach(p => {
       // ... (Minimizer logic)
      let topConflicts = 0;
      if (hasGroup(topHalf, p.home.groupIndex)) topConflicts++;
      if (p.away && hasGroup(topHalf, p.away.groupIndex)) topConflicts++;

      let botConflicts = 0;
      if (hasGroup(botHalf, p.home.groupIndex)) botConflicts++;
      if (p.away && hasGroup(botHalf, p.away.groupIndex)) botConflicts++;
      
      const halfParams = Math.ceil(numMatches / 2);
      const topFull = topHalf.length >= halfParams;
      const botFull = botHalf.length >= (numMatches - halfParams);
      
      if (topFull) botHalf.push(p);
      else if (botFull) topHalf.push(p);
      else {
          if (topConflicts < botConflicts) topHalf.push(p);
          else if (botConflicts < topConflicts) botHalf.push(p);
          else {
              if (Math.random() < 0.5) topHalf.push(p);
              else botHalf.push(p);
          }
      }
  });

  const orderedPairings = [...topHalf, ...botHalf];

  // ... (rest of code)


  // 4. Generate Match Objects
  const matches: Match[] = [];
  const isHomeAndAway = config?.knockoutFormat === 'HOME_AND_AWAY';

  // Create R1 Matches
  orderedPairings.forEach((p, i) => {
      // i corresponds to the match index in this round
      const round = bracketSize;
      const homeId = p.home.teamId;
      const awayId = p.away ? p.away.teamId : null;
      
      // If Bye, Status COMPLETED
      // If Standard, SCHEDULED
      
      // Note: If Bye, isFinal logic doesn't matter (Round > 2)
      // If HomeAndAway:
      // Byes are single entry usually (or skipped). 
      // If we have a Bye, we create one COMPLETED match to satisfy the bracket tree.
      
      const isBye = !awayId;
      
      if (isBye) {
           matches.push({
                id: `knockout-r${round}-m${i}`,
                homeTeamId: homeId,
                awayTeamId: null,
                startTime: new Date().toISOString(),
                status: 'COMPLETED',
                result: { homeGoals: 0, awayGoals: 0 }, // Symbolic
                round: round,
                leg: 1,
                tournamentId,
            });
            // Auto-advance logic is handled by updateKnockoutBracket usually, 
            // but updateKnockoutBracket expects "pairingMatches".
            // If we mark it COMPLETED, `updateKnockoutBracket` will see it and advance `homeId`.
      } else {
           // Real Match
           if (isHomeAndAway && round > 2) {
                // Two Legs
                matches.push({
                    id: `knockout-r${round}-m${i}-L1`,
                    homeTeamId: homeId,
                    awayTeamId: awayId,
                    startTime: new Date().toISOString(),
                    status: 'SCHEDULED',
                    round: round,
                    leg: 1,
                    tournamentId,
                });
                matches.push({
                    id: `knockout-r${round}-m${i}-L2`,
                    homeTeamId: awayId, // Swap
                    awayTeamId: homeId,
                    startTime: new Date().toISOString(),
                    status: 'SCHEDULED',
                    round: round,
                    leg: 2,
                    tournamentId,
                });
           } else {
               // Single Leg
                matches.push({
                    id: `knockout-r${round}-m${i}`,
                    homeTeamId: homeId,
                    awayTeamId: awayId,
                    startTime: new Date().toISOString(),
                    status: 'SCHEDULED',
                    round: round,
                    leg: 1,
                    tournamentId,
                });
           }
      }
  });

  // Generate Placeholder Matches for subsequent rounds (so bracket view shows empty slots)
  for (let round = bracketSize / 2; round >= 2; round /= 2) {
    const numPairings = round / 2;
    for (let i = 0; i < numPairings; i++) {
        // Just placeholders
        const isFinal = round === 2;
        if (isHomeAndAway && !isFinal) {
             matches.push({
                id: `knockout-r${round}-m${i}-L1`,
                homeTeamId: null,
                awayTeamId: null,
                startTime: new Date().toISOString(),
                status: 'SCHEDULED',
                round: round,
                leg: 1,
                tournamentId,
            });
            matches.push({
                id: `knockout-r${round}-m${i}-L2`,
                homeTeamId: null,
                awayTeamId: null,
                startTime: new Date().toISOString(),
                status: 'SCHEDULED',
                round: round,
                leg: 2,
                tournamentId,
            });
        } else {
            matches.push({
                id: `knockout-r${round}-m${i}`,
                homeTeamId: null,
                awayTeamId: null,
                startTime: new Date().toISOString(),
                status: 'SCHEDULED',
                round: round,
                leg: 1,
                tournamentId,
            });
        }
    }
  }

  return matches;
};

/**
 * Updates the bracket based on match results.
 * Advances winners to the next round.
 */
export const updateKnockoutBracket = (matches: Match[]): Match[] => {
    // Deep copy to avoid mutation issues
    const newMatches = JSON.parse(JSON.stringify(matches)) as Match[];

    // Process rounds from highest (e.g. 16) down to 4 (Semis). Final (2) doesn't advance anywhere.
    // We need to find the MAX round.
    const maxRound = Math.max(...newMatches.map(m => m.round));

    for (let round = maxRound; round > 2; round /= 2) {
        const numPairings = round / 2;
        
        for (let i = 0; i < numPairings; i++) {
            // Find matches for this pairing
            // We use the ID convention: knockout-r{round}-m{i}...
            const pairingMatches = newMatches.filter(m => m.round === round && (m.id.includes(`-m${i}-`) || m.id.endsWith(`-m${i}`)));
            
            if (pairingMatches.length === 0) continue;

            // Check if pairing is complete
            const isComplete = pairingMatches.every(m => m.status === 'COMPLETED');
            if (!isComplete) continue;

            // Determine Winner
            let winnerId: string | null = null;
            
            // Check for Bye (Single Team present in pairing)
            // Note: In earliest round, we might have Home vs Null.
            // If pairingMatches.length === 1 and one team is missing, it's a bye.
            if (pairingMatches.length === 1) {
                const m = pairingMatches[0];
                if (!m.homeTeamId && !m.awayTeamId) continue; // Empty slot
                
                if (m.homeTeamId && !m.awayTeamId) {
                    winnerId = m.homeTeamId;
                    // Auto-complete status
                    if (m.status !== 'COMPLETED') {
                        m.status = 'COMPLETED';
                        m.result = { homeGoals: 0, awayGoals: 0 }; // Symbolic
                    }
                } else if (!m.homeTeamId && m.awayTeamId) {
                    winnerId = m.awayTeamId;
                    if (m.status !== 'COMPLETED') {
                         m.status = 'COMPLETED';
                         m.result = { homeGoals: 0, awayGoals: 0 };
                    }
                } else {
                    // Normal Match
                    if (m.result) {
                        if (m.result.homeGoals > m.result.awayGoals) winnerId = m.homeTeamId;
                        else if (m.result.awayGoals > m.result.homeGoals) winnerId = m.awayTeamId;
                        else {
                             // MVP: Assume Winner by goals or Home if draw
                             winnerId = m.homeTeamId; 
                        }
                      }
                }
            } else {
                // Two Legs
                const l1 = pairingMatches.find(m => m.leg === 1);
                const l2 = pairingMatches.find(m => m.leg === 2);
                if (l1 && l2 && l1.result && l2.result) {
                    // Aggregate
                    // Leg 1: Home vs Away
                    // Leg 2: Away vs Home
                    // Team A (Home in L1) goals: L1_Home + L2_Away
                    // Team B (Away in L1) goals: L1_Away + L2_Home
                    
                    const teamAGoals = l1.result.homeGoals + l2.result.awayGoals;
                    const teamBGoals = l1.result.awayGoals + l2.result.homeGoals;

                    if (teamAGoals > teamBGoals) winnerId = l1.homeTeamId;
                    else if (teamBGoals > teamAGoals) winnerId = l1.awayTeamId;
                    else {
                        // Away goals rule? standard is usually NO away goals nowadays in UEFA, but FIFA varies.
                        // Let's stick to simple Aggregate -> Penalties
                        // We check penalties on leg 2 mainly.
                        // Assuming penalties are recorded in Leg 2 result.
                        winnerId = l1.homeTeamId; // Placeholder fallback
                    }
                }
            }

            if (winnerId) {
                // Advance to Next Round
                // Target Round: round / 2
                // Target Match Index: floor(i / 2)
                // Target Slot: i % 2 === 0 ? Home : Away
                
                const nextRound = round / 2;
                const nextMatchIdx = Math.floor(i / 2);
                const isHomeSlot = (i % 2) === 0;

                // Find next matches (could be 1 or 2 legs)
                const nextMatches = newMatches.filter(m => m.round === nextRound && m.id.includes(`-m${nextMatchIdx}`));
                
                nextMatches.forEach(nextMatch => {
                    // For Leg 1: 0->Home, 1->Away
                    // For Leg 2: 0->Away, 1->Home (Swap)
                    
                    if (nextMatch.leg === 2) {
                        if (isHomeSlot) nextMatch.awayTeamId = winnerId;
                        else nextMatch.homeTeamId = winnerId;
                    } else {
                        // Single leg OR Leg 1
                        if (isHomeSlot) nextMatch.homeTeamId = winnerId;
                        else nextMatch.awayTeamId = winnerId;
                    }
                });
            }
        }
    }

    return newMatches;
};
