import type { MatchEvent, TeamAssignmentItem, TeamSide } from "@/types/football";

export function createTeamEvents(
  teamPlayers: TeamAssignmentItem[],
  teamColor: TeamSide
): MatchEvent[] {
  const events: MatchEvent[] = [];

  const assistTracker = teamPlayers
    .filter(p => (p.assists || 0) > 0)
    .map(p => ({ playerId: p.playerId, remaining: p.assists! }));

  for (const player of teamPlayers) {
    for (let i = 0; i < (player.goals || 0); i++) {
      const event: MatchEvent = {
        id: `${player.playerId}-goal-${i}`,
        team: teamColor,
        scorerId: player.playerId,
      };

      if (assistTracker.length > 0) {
        const nonSelfIdx = assistTracker.findIndex(t => t.playerId !== player.playerId);
        const idx = nonSelfIdx !== -1 ? nonSelfIdx : 0;
        event.assistId = assistTracker[idx].playerId;
        assistTracker[idx].remaining--;
        if (assistTracker[idx].remaining === 0) assistTracker.splice(idx, 1);
      }

      events.push(event);
    }

    for (let i = 0; i < (player.ownGoals || 0); i++) {
      events.push({
        id: `${player.playerId}-owngoal-${i}`,
        team: teamColor === "azul" ? "vermelho" : "azul",
        scorerId: player.playerId,
        isOwnGoal: true,
      });
    }
  }

  for (const tracker of assistTracker) {
    while (tracker.remaining > 0) {
      events.push({
        id: `${tracker.playerId}-dummy-${Date.now()}-${Math.random()}`,
        team: teamColor,
        scorerId: tracker.playerId,
        assistId: tracker.playerId,
        isDummyGoal: true,
      });
      tracker.remaining--;
    }
  }

  return events;
}
