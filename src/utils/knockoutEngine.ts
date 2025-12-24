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
  // Sort by Rank (asc), then Points (desc), GD (desc), GF (desc)
  const sortedTeams = [...qualifiedTeams].sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank; // Rank 1 better than 2
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
  });

  const byeTeams = sortedTeams.slice(0, numByes);
  const playTeams = sortedTeams.slice(numByes);

  // 2. Generate Pairings for Play Teams
  // We need (qualifiedTeams.length - numByes) / 2 matches.
  // Actually, we are forming `numMatches` total pairings. `numByes` of them are (Team vs null).
  // The rest are (Team vs Team).
  
  const pairings: { home: typeof qualifiedTeams[0]; away: typeof qualifiedTeams[0] | null }[] = [];

  // Add Byes first
  byeTeams.forEach(team => {
      pairings.push({ home: team, away: null });
  });

  // Pair remaining teams: Winners vs Runners logic
  // Separate into Winners and Runners (relative to the play pool)
  // Note: playTeams might contain some Rank 1s if not all got byes, and Rank 2s.
  const poolWinners = playTeams.filter(t => t.rank === 1);
  const poolRunners = playTeams.filter(t => t.rank === 2);
  
  // If we have unbalanced lists (e.g. 3rd place enabled later, or odd specific formats), 
  // we treat them as generic pool. But here we assume Rank 1 & 2.
  // If `poolWinners` is empty (all got byes), we pair runners vs runners.
  
  let pWin = [...poolWinners];
  let pRun = [...poolRunners];
  
  // Shuffle for randomization
  const shuffle = (arr: any[]) => {
      for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
      }
  };
  shuffle(pWin);
  shuffle(pRun);

  const finalPairs: { home: typeof qualifiedTeams[0]; away: typeof qualifiedTeams[0] }[] = [];

  // Greedy matching: Winner vs Runner (diff group)
  while (pWin.length > 0) {
      const w = pWin.pop()!;
      // Find eligible runner
      const rIdx = pRun.findIndex(r => r.groupIndex !== w.groupIndex);
      if (rIdx !== -1) {
          const r = pRun.splice(rIdx, 1)[0];
          finalPairs.push({ home: w, away: r });
      } else {
          // No eligible runner (all remaining runners are same group - rare/impossible for N>=2)
          // Fallback: Pick any runner
          if (pRun.length > 0) {
             const r = pRun.pop()!;
             finalPairs.push({ home: w, away: r });
          } else {
             // No runners left? Wait, pairings must be even?
             // If odd number of teams in play pool? (Impossible if total is even and byes are even?)
             // Total = rank1 + rank2 = even.
             // Byes = even usually (bracket size 8 - 6 = 2).
             // So playPool is even.
             // So if no runners, maybe we have leftover winners pairing with each other?
             // Put w back?
             pRun.push(w as any); // Treat as runner for pairing purposes
          }
      }
  }

  // Pair remaining teams (Runners vs Runners or leftover Winners)
  while (pRun.length >= 2) {
      const t1 = pRun.pop()!;
      // Try to find non-same-group
      const t2Idx = pRun.findIndex(t => t.groupIndex !== t1.groupIndex);
      if (t2Idx !== -1) {
          const t2 = pRun.splice(t2Idx, 1)[0];
          finalPairs.push({ home: t1, away: t2 });
      } else {
          const t2 = pRun.pop()!;
          finalPairs.push({ home: t1, away: t2 });
      }
  }

  // Add Real Pairs to Pairings list
  finalPairs.forEach(p => pairings.push(p));

  // 3. Assign Pairings to Bracket Slots (Separation Logic)
  // We have `numMatches` pairings.
  // Slots: 0, 1, ... numMatches-1.
  // Tree Structure:
  // Top Half: 0 .. numMatches/2 - 1
  // Bottom Half: numMatches/2 .. numMatches - 1
  
  const layout: (typeof pairings)[] = new Array(numMatches).fill(null);
  
  // Sort pairings by "Home Team Group" to help deterministically separate? 
  // No, we want randomization.
  // But we want to enforce separation: P1(GrA) and P2(GrA) should separate.
  
  // Strategy: Place pairings one by one into the "least conflicted" half.
  // Simplified: Two lists for Top and Bottom.
  const topHalf: typeof pairings = [];
  const botHalf: typeof pairings = [];
  
  // Helper: check if half contains group
  const hasGroup = (half: typeof pairings, gIdx: number) => {
      return half.some(p => 
          (p.home.groupIndex === gIdx) || 
          (p.away && p.away.groupIndex === gIdx)
      );
  };

  // Shuffle pairings before placement
  shuffle(pairings);

  pairings.forEach(p => {
      // Count conflicts
      // Conflict = Group of Home/Away is already in the Half.
      let topConflicts = 0;
      if (hasGroup(topHalf, p.home.groupIndex)) topConflicts++;
      if (p.away && hasGroup(topHalf, p.away.groupIndex)) topConflicts++;

      let botConflicts = 0;
      if (hasGroup(botHalf, p.home.groupIndex)) botConflicts++;
      if (p.away && hasGroup(botHalf, p.away.groupIndex)) botConflicts++;

      // Balance size first?
      // Max capacity per half = numMatches / 2.
      // Note: If numMatches is odd (e.g. 2 matches? 1 match?), halves logic applies to 4+ matches.
      // If numMatches = 2 (Bracket 4), Top=1 match, Bot=1 match.
      // If numMatches = 4 (Bracket 8), Top=2, Bot=2.
      
      const halfParams = Math.ceil(numMatches / 2); // Split point
      
      const topFull = topHalf.length >= halfParams;
      const botFull = botHalf.length >= (numMatches - halfParams);
      
      if (topFull) {
          botHalf.push(p);
      } else if (botFull) {
          topHalf.push(p);
      } else {
          // Prefer lower conflict
          if (topConflicts < botConflicts) topHalf.push(p);
          else if (botConflicts < topConflicts) botHalf.push(p);
          else {
              // Equal conflicts, random or balance size
              if (Math.random() < 0.5) topHalf.push(p);
              else botHalf.push(p);
          }
      }
  });
  
  const orderedPairings = [...topHalf, ...botHalf];

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
