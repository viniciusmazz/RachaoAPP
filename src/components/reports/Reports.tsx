import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Trophy, Shield, AlertTriangle, Target, Calendar, Crosshair, Users } from "lucide-react";
import type { Match, Player, Group } from "@/types/football";
import SeasonSummary from "./SeasonSummary";

interface PlayerStats {
  id: string;
  nome: string;
  pontos: number;
  jogos: number;
  vitorias: number;
  derrotas: number;
  empates: number;
  aproveitamento: number;
  golsPro: number;
  golsSofridos: number;
  gols: number;
  assistencias: number;
  fieldGoals: number;
  pontosAzul: number;
  jogosAzul: number;
  pontosVermelho: number;
  jogosVermelho: number;
  sequenciaAtual: number;
  maiorSequenciaVitorias: number;
  maiorSequenciaDerrotas: number;
  ultimosResultados: ('v' | 'e' | 'd')[];
  evolucaoPontos: number[];
}

interface ReportsProps {
  matches: Match[];
  players: Player[];
  group: Group;
}

export default function Reports({ matches, players, group }: ReportsProps) {
  const homeConfig = group.settings.sides.home;
  const awayConfig = group.settings.sides.away;
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Extrair anos disponíveis das partidas
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    matches.forEach(m => {
      const year = new Date(m.date).getFullYear();
      years.add(year);
    });
    // Sempre incluir o ano atual
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [matches, currentYear]);

  // Filtrar partidas pelo ano selecionado
  const filteredMatches = useMemo(() => {
    return matches.filter(m => new Date(m.date).getFullYear() === selectedYear);
  }, [matches, selectedYear]);

  const playerNameMap = useMemo(() => new Map(players.map(p => [p.id, p.name])), [players]);
  const playerTypeMap = useMemo(() => new Map(players.map(p => [p.id, p.type])), [players]);

  const nameById = (id: string) => playerNameMap.get(id) ?? "";
  const playerTypeById = (id: string) => playerTypeMap.get(id) ?? "mensalista";

  // Filtrar jogadores por tipo
  const mensalistas = players.filter(p => p.type === "mensalista");

  // Calcular estatísticas completas para cada jogador
  const calculatePlayerStats = (playerType?: "mensalista" | "convidado"): PlayerStats[] => {
    const playerStatsMap = new Map<string, PlayerStats>();

    // Inicializar estatísticas para todos os jogadores que participaram
    const allPlayerIds = new Set<string>();
    filteredMatches.forEach(m => {
      m.teams.azul.forEach(t => allPlayerIds.add(t.playerId));
      m.teams.vermelho.forEach(t => allPlayerIds.add(t.playerId));
      m.events.forEach(e => {
        allPlayerIds.add(e.scorerId);
        if (e.assistId) allPlayerIds.add(e.assistId);
      });
    });

    // Filtrar por tipo se especificado
    const filteredPlayerIds = playerType ? 
      Array.from(allPlayerIds).filter(id => playerTypeById(id) === playerType) :
      Array.from(allPlayerIds);

    filteredPlayerIds.forEach(id => {
      playerStatsMap.set(id, {
        id,
        nome: nameById(id),
        pontos: 0,
        jogos: 0,
        vitorias: 0,
        derrotas: 0,
        empates: 0,
        aproveitamento: 0,
        golsPro: 0,
        golsSofridos: 0,
        gols: 0,
        assistencias: 0,
        fieldGoals: 0,
        pontosAzul: 0,
        jogosAzul: 0,
        pontosVermelho: 0,
        jogosVermelho: 0,
        sequenciaAtual: 0,
        maiorSequenciaVitorias: 0,
        maiorSequenciaDerrotas: 0,
        ultimosResultados: [],
        evolucaoPontos: [],
      });
    });

    // Ordenar partidas cronologicamente para cálculo de sequências
    const sortedMatches = [...filteredMatches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const playerResults = new Map<string, ('v' | 'e' | 'd')[]>();
    const playerCumulativePoints = new Map<string, number[]>();

    // Processar cada partida
    sortedMatches.forEach(match => {
      const hasEvents = match.events && match.events.length > 0;
      // Calculate score
      const golsAzul = hasEvents
        ? match.events.filter(e => e.team === 'azul' && !e.isDummyGoal).length
        : (match.teams.azul || []).reduce((sum, p) => sum + (p.goals || 0), 0) +
          (match.teams.vermelho || []).reduce((sum, p) => sum + (p.ownGoals || 0), 0);
      const golsVermelho = hasEvents
        ? match.events.filter(e => e.team === 'vermelho' && !e.isDummyGoal).length
        : (match.teams.vermelho || []).reduce((sum, p) => sum + (p.goals || 0), 0) +
          (match.teams.azul || []).reduce((sum, p) => sum + (p.ownGoals || 0), 0);

      // Determinar resultado
      let azulPts = 0, vermelhoPts = 0;
      let azulResult: 'vitoria' | 'empate' | 'derrota' = 'empate';
      let vermelhoResult: 'vitoria' | 'empate' | 'derrota' = 'empate';

      if (golsAzul > golsVermelho) {
        azulPts = 3;
        azulResult = 'vitoria';
        vermelhoResult = 'derrota';
      } else if (golsVermelho > golsAzul) {
        vermelhoPts = 3;
        vermelhoResult = 'vitoria';
        azulResult = 'derrota';
      } else {
        azulPts = 1;
        vermelhoPts = 1;
      }

      // Atualizar estatísticas dos jogadores do time azul
      match.teams.azul.forEach((teamItem) => {
        if (!playerType || playerTypeById(teamItem.playerId) === playerType) {
          const stats = playerStatsMap.get(teamItem.playerId);
          if (stats) {
            stats.jogos++;
            stats.pontos += azulPts;
            stats.golsPro += golsAzul;
            stats.golsSofridos += golsVermelho;
            stats.fieldGoals += teamItem.fieldGoals || 0;
            stats.jogosAzul++;
            stats.pontosAzul += azulPts;
            if (azulResult === 'vitoria') stats.vitorias++;
            else if (azulResult === 'derrota') stats.derrotas++;
            else stats.empates++;

            const azRes: 'v' | 'e' | 'd' = azulResult === 'vitoria' ? 'v' : azulResult === 'derrota' ? 'd' : 'e';
            const azResList = playerResults.get(teamItem.playerId) || [];
            azResList.push(azRes);
            playerResults.set(teamItem.playerId, azResList);
            const azPtHist = playerCumulativePoints.get(teamItem.playerId) || [];
            azPtHist.push((azPtHist.length > 0 ? azPtHist[azPtHist.length - 1] : 0) + azulPts);
            playerCumulativePoints.set(teamItem.playerId, azPtHist);

            // Contar gols e assistências
            if (hasEvents) {
              stats.gols += match.events.filter(e => e.scorerId === teamItem.playerId && !e.isOwnGoal && !e.isDummyGoal).length;
              stats.assistencias += match.events.filter(e => e.assistId === teamItem.playerId).length
                + match.events.reduce((sum, e) => sum + (e.extraAssistIds?.filter(id => id === teamItem.playerId).length ?? 0), 0);
            } else {
              stats.gols += teamItem.goals || 0;
              stats.assistencias += teamItem.assists || 0;
            }
          }
        }
      });

      // Atualizar estatísticas dos jogadores do time vermelho
      match.teams.vermelho.forEach((teamItem) => {
        if (!playerType || playerTypeById(teamItem.playerId) === playerType) {
          const stats = playerStatsMap.get(teamItem.playerId);
          if (stats) {
            stats.jogos++;
            stats.pontos += vermelhoPts;
            stats.golsPro += golsVermelho;
            stats.golsSofridos += golsAzul;
            stats.fieldGoals += teamItem.fieldGoals || 0;
            stats.jogosVermelho++;
            stats.pontosVermelho += vermelhoPts;
            if (vermelhoResult === 'vitoria') stats.vitorias++;
            else if (vermelhoResult === 'derrota') stats.derrotas++;
            else stats.empates++;

            const vmRes: 'v' | 'e' | 'd' = vermelhoResult === 'vitoria' ? 'v' : vermelhoResult === 'derrota' ? 'd' : 'e';
            const vmResList = playerResults.get(teamItem.playerId) || [];
            vmResList.push(vmRes);
            playerResults.set(teamItem.playerId, vmResList);
            const vmPtHist = playerCumulativePoints.get(teamItem.playerId) || [];
            vmPtHist.push((vmPtHist.length > 0 ? vmPtHist[vmPtHist.length - 1] : 0) + vermelhoPts);
            playerCumulativePoints.set(teamItem.playerId, vmPtHist);

            // Contar gols e assistências
            if (hasEvents) {
              stats.gols += match.events.filter(e => e.scorerId === teamItem.playerId && !e.isOwnGoal && !e.isDummyGoal).length;
              stats.assistencias += match.events.filter(e => e.assistId === teamItem.playerId).length
                + match.events.reduce((sum, e) => sum + (e.extraAssistIds?.filter(id => id === teamItem.playerId).length ?? 0), 0);
            } else {
              stats.gols += teamItem.goals || 0;
              stats.assistencias += teamItem.assists || 0;
            }
          }
        }
      });
    });

    // Calcular aproveitamento e sequências
    playerStatsMap.forEach((stats, id) => {
      if (stats.jogos > 0) {
        stats.aproveitamento = (stats.pontos / (stats.jogos * 3)) * 100;
      }

      const results = playerResults.get(id) || [];
      stats.evolucaoPontos = playerCumulativePoints.get(id) || [];
      stats.ultimosResultados = results.slice(-5);

      if (results.length > 0) {
        const lastResult = results[results.length - 1];
        let currentStreak = 0;
        for (let i = results.length - 1; i >= 0; i--) {
          if (results[i] === lastResult) currentStreak++;
          else break;
        }
        stats.sequenciaAtual = lastResult === 'v' ? currentStreak : lastResult === 'd' ? -currentStreak : 0;

        let maxWin = 0, curWin = 0;
        for (const r of results) {
          if (r === 'v') { curWin++; if (curWin > maxWin) maxWin = curWin; }
          else curWin = 0;
        }
        stats.maiorSequenciaVitorias = maxWin;

        let maxLoss = 0, curLoss = 0;
        for (const r of results) {
          if (r === 'd') { curLoss++; if (curLoss > maxLoss) maxLoss = curLoss; }
          else curLoss = 0;
        }
        stats.maiorSequenciaDerrotas = maxLoss;
      }
    });

    return Array.from(playerStatsMap.values()).sort((a, b) =>
      b.pontos - a.pontos ||
      b.vitorias - a.vitorias ||
      b.gols - a.gols ||
      b.assistencias - a.assistencias ||
      b.aproveitamento - a.aproveitamento ||
      a.nome.localeCompare(b.nome)
    );
  };

  const playerStatsMensalistas = useMemo(() => calculatePlayerStats("mensalista"), [filteredMatches, playerNameMap, playerTypeMap]);

  // Artilharia (apenas gols normais, excluindo gols contra) - separado por tipo
  const createGoalsRanking = (playerType: "mensalista" | "convidado") => {
    const goalsByPlayer = new Map<string, number>();
    const gamesByPlayer = new Map<string, number>();
    
    filteredMatches.forEach((m) => {
      const hasEvents = m.events && m.events.length > 0;
      // Contar jogos
      m.teams.azul.forEach(t => {
        if (playerTypeById(t.playerId) === playerType) {
          gamesByPlayer.set(t.playerId, (gamesByPlayer.get(t.playerId) || 0) + 1);
        }
      });
      m.teams.vermelho.forEach(t => {
        if (playerTypeById(t.playerId) === playerType) {
          gamesByPlayer.set(t.playerId, (gamesByPlayer.get(t.playerId) || 0) + 1);
        }
      });
      
      // Contar gols
      if (hasEvents) {
        m.events.forEach(e => {
          if (!e.isOwnGoal && !e.isDummyGoal && playerTypeById(e.scorerId) === playerType) {
            goalsByPlayer.set(e.scorerId, (goalsByPlayer.get(e.scorerId) || 0) + 1);
          }
        });
      } else {
        m.teams.azul.forEach(p => {
          if (playerTypeById(p.playerId) === playerType && (p.goals || 0) > 0) {
            goalsByPlayer.set(p.playerId, (goalsByPlayer.get(p.playerId) || 0) + p.goals!);
          }
        });
        m.teams.vermelho.forEach(p => {
          if (playerTypeById(p.playerId) === playerType && (p.goals || 0) > 0) {
            goalsByPlayer.set(p.playerId, (goalsByPlayer.get(p.playerId) || 0) + p.goals!);
          }
        });
      }
    });
    
    return Array.from(goalsByPlayer.entries())
      .map(([id, gols]) => {
        const jogos = gamesByPlayer.get(id) || 0;
        const media = jogos > 0 ? gols / jogos : 0;
        return { id, gols, jogos, media, nome: nameById(id) };
      })
      .sort((a, b) => b.gols - a.gols);
  };

  // Assistências - separado por tipo
  const createAssistsRanking = (playerType: "mensalista" | "convidado") => {
    const assistsByPlayer = new Map<string, number>();
    const gamesByPlayer = new Map<string, number>();
    
    filteredMatches.forEach((m) => {
      const hasEvents = m.events && m.events.length > 0;
      // Contar jogos
      m.teams.azul.forEach(t => {
        if (playerTypeById(t.playerId) === playerType) {
          gamesByPlayer.set(t.playerId, (gamesByPlayer.get(t.playerId) || 0) + 1);
        }
      });
      m.teams.vermelho.forEach(t => {
        if (playerTypeById(t.playerId) === playerType) {
          gamesByPlayer.set(t.playerId, (gamesByPlayer.get(t.playerId) || 0) + 1);
        }
      });
      
      // Contar assistências
      if (hasEvents) {
        m.events.forEach(e => {
          if (e.assistId && playerTypeById(e.assistId) === playerType) {
            assistsByPlayer.set(e.assistId, (assistsByPlayer.get(e.assistId) || 0) + 1);
          }
          e.extraAssistIds?.forEach(id => {
            if (playerTypeById(id) === playerType) {
              assistsByPlayer.set(id, (assistsByPlayer.get(id) || 0) + 1);
            }
          });
        });
      } else {
        m.teams.azul.forEach(p => {
          if (playerTypeById(p.playerId) === playerType && (p.assists || 0) > 0) {
            assistsByPlayer.set(p.playerId, (assistsByPlayer.get(p.playerId) || 0) + p.assists!);
          }
        });
        m.teams.vermelho.forEach(p => {
          if (playerTypeById(p.playerId) === playerType && (p.assists || 0) > 0) {
            assistsByPlayer.set(p.playerId, (assistsByPlayer.get(p.playerId) || 0) + p.assists!);
          }
        });
      }
    });
    
    return Array.from(assistsByPlayer.entries())
      .map(([id, assistencias]) => {
        const jogos = gamesByPlayer.get(id) || 0;
        const media = jogos > 0 ? assistencias / jogos : 0;
        return { id, assistencias, jogos, media, nome: nameById(id) };
      })
      .sort((a, b) => b.assistencias - a.assistencias);
  };

  // Gols contra por jogador - separado por tipo
  const createOwnGoalsRanking = (playerType: "mensalista" | "convidado") => {
    const ownGoalsByPlayer = new Map<string, number>();
    filteredMatches.forEach((m) => {
      const hasEvents = m.events && m.events.length > 0;
      // Contar gols contra
      if (hasEvents) {
        m.events.forEach(e => {
          if (e.isOwnGoal && playerTypeById(e.scorerId) === playerType) {
            ownGoalsByPlayer.set(e.scorerId, (ownGoalsByPlayer.get(e.scorerId) || 0) + 1);
          }
        });
      } else {
        m.teams.azul.forEach(t => {
          if (playerTypeById(t.playerId) === playerType && (t.ownGoals || 0) > 0) {
            ownGoalsByPlayer.set(t.playerId, (ownGoalsByPlayer.get(t.playerId) || 0) + (t.ownGoals || 0));
          }
        });
        m.teams.vermelho.forEach(t => {
          if (playerTypeById(t.playerId) === playerType && (t.ownGoals || 0) > 0) {
            ownGoalsByPlayer.set(t.playerId, (ownGoalsByPlayer.get(t.playerId) || 0) + (t.ownGoals || 0));
          }
        });
      }
    });
    return Array.from(ownGoalsByPlayer.entries())
      .map(([id, g]) => ({ id, gols: g, nome: nameById(id) }))
      .sort((a, b) => b.gols - a.gols);
  };

  // Goleiros - separado por tipo
  const createGoalkeeperRanking = (playerType: "mensalista" | "convidado") => {
    const concededByGK = new Map<string, number>();
    const gamesByGK = new Map<string, number>();
    const winsByGK = new Map<string, number>();
    const drawsByGK = new Map<string, number>();
    const lossesByGK = new Map<string, number>();

    filteredMatches.forEach((m) => {
      const hasEvents = m.events && m.events.length > 0;
      const golsAzul = hasEvents
        ? m.events.filter(e => e.team === 'azul' && !e.isDummyGoal).length
        : (m.teams.azul || []).reduce((sum, p) => sum + (p.goals || 0), 0) +
          (m.teams.vermelho || []).reduce((sum, p) => sum + (p.ownGoals || 0), 0);
      const golsVermelho = hasEvents
        ? m.events.filter(e => e.team === 'vermelho' && !e.isDummyGoal).length
        : (m.teams.vermelho || []).reduce((sum, p) => sum + (p.goals || 0), 0) +
          (m.teams.azul || []).reduce((sum, p) => sum + (p.ownGoals || 0), 0);

      const azulRes: 'v' | 'e' | 'd' = golsAzul > golsVermelho ? 'v' : golsAzul < golsVermelho ? 'd' : 'e';
      const vmRes: 'v' | 'e' | 'd' = golsVermelho > golsAzul ? 'v' : golsVermelho < golsAzul ? 'd' : 'e';

      const trackGK = (gkId: string | undefined, conceded: number, res: 'v' | 'e' | 'd') => {
        if (!gkId || playerTypeById(gkId) !== playerType) return;
        concededByGK.set(gkId, (concededByGK.get(gkId) || 0) + conceded);
        gamesByGK.set(gkId, (gamesByGK.get(gkId) || 0) + 1);
        if (res === 'v') winsByGK.set(gkId, (winsByGK.get(gkId) || 0) + 1);
        else if (res === 'e') drawsByGK.set(gkId, (drawsByGK.get(gkId) || 0) + 1);
        else lossesByGK.set(gkId, (lossesByGK.get(gkId) || 0) + 1);
      };

      const gkAzul = m.teams.azul.find((t) => t.isGoalkeeper)?.playerId;
      const gkVermelho = m.teams.vermelho.find((t) => t.isGoalkeeper)?.playerId;
      trackGK(gkAzul, golsVermelho, azulRes);
      trackGK(gkVermelho, golsAzul, vmRes);
    });

    // Média bayesiana: puxa amostras pequenas para a média geral
    const totalSofridos = Array.from(concededByGK.values()).reduce((a, b) => a + b, 0);
    const totalJogos = Array.from(gamesByGK.values()).reduce((a, b) => a + b, 0);
    const leagueAvg = totalJogos > 0 ? totalSofridos / totalJogos : 0;
    const k = 5;

    return Array.from(concededByGK.entries())
      .map(([id, sofridos]) => {
        const jogos = gamesByGK.get(id) || 0;
        const media = jogos > 0 ? sofridos / jogos : 0;
        const mediaAjustada = (sofridos + k * leagueAvg) / (jogos + k);
        const vitorias = winsByGK.get(id) || 0;
        const empates = drawsByGK.get(id) || 0;
        const derrotas = lossesByGK.get(id) || 0;
        const aproveitamento = jogos > 0 ? ((vitorias * 3 + empates) / (jogos * 3)) * 100 : 0;
        return { id, sofridos, jogos, media, mediaAjustada, vitorias, empates, derrotas, aproveitamento, nome: nameById(id) };
      })
      .filter(gk => gk.jogos >= 3)
      .sort((a, b) => b.aproveitamento - a.aproveitamento || a.mediaAjustada - b.mediaAjustada);
  };

  // Field Goals por jogador - separado por tipo
  const createFieldGoalsRanking = (playerType: "mensalista" | "convidado") => {
    const fgByPlayer = new Map<string, number>();
    const gamesByPlayer = new Map<string, number>();
    
    filteredMatches.forEach((m) => {
      m.teams.azul.forEach(t => {
        if (playerTypeById(t.playerId) === playerType) {
          gamesByPlayer.set(t.playerId, (gamesByPlayer.get(t.playerId) || 0) + 1);
          if (t.fieldGoals) {
            fgByPlayer.set(t.playerId, (fgByPlayer.get(t.playerId) || 0) + t.fieldGoals);
          }
        }
      });
      m.teams.vermelho.forEach(t => {
        if (playerTypeById(t.playerId) === playerType) {
          gamesByPlayer.set(t.playerId, (gamesByPlayer.get(t.playerId) || 0) + 1);
          if (t.fieldGoals) {
            fgByPlayer.set(t.playerId, (fgByPlayer.get(t.playerId) || 0) + t.fieldGoals);
          }
        }
      });
    });
    
    return Array.from(fgByPlayer.entries())
      .map(([id, fg]) => {
        const jogos = gamesByPlayer.get(id) || 0;
        const media = jogos > 0 ? fg / jogos : 0;
        return { id, fieldGoals: fg, jogos, media, nome: nameById(id) };
      })
      .sort((a, b) => b.fieldGoals - a.fieldGoals);
  };

  // Participações em gols (gols + assistências) - separado por tipo
  const createGoalContributionsRanking = (playerType: "mensalista" | "convidado") => {
    const goalsByPlayer = new Map<string, number>();
    const assistsByPlayer = new Map<string, number>();
    const gamesByPlayer = new Map<string, number>();
    
    filteredMatches.forEach((m) => {
      const hasEvents = m.events && m.events.length > 0;
      m.teams.azul.forEach(t => {
        if (playerTypeById(t.playerId) === playerType) {
          gamesByPlayer.set(t.playerId, (gamesByPlayer.get(t.playerId) || 0) + 1);
        }
      });
      m.teams.vermelho.forEach(t => {
        if (playerTypeById(t.playerId) === playerType) {
          gamesByPlayer.set(t.playerId, (gamesByPlayer.get(t.playerId) || 0) + 1);
        }
      });
      
      // Contar gols e assistências
      if (hasEvents) {
        m.events.forEach(e => {
          if (!e.isOwnGoal && !e.isDummyGoal && playerTypeById(e.scorerId) === playerType) {
            goalsByPlayer.set(e.scorerId, (goalsByPlayer.get(e.scorerId) || 0) + 1);
          }
          if (!e.isOwnGoal) {
            if (e.assistId && playerTypeById(e.assistId) === playerType) {
              assistsByPlayer.set(e.assistId, (assistsByPlayer.get(e.assistId) || 0) + 1);
            }
            e.extraAssistIds?.forEach(id => {
              if (playerTypeById(id) === playerType) {
                assistsByPlayer.set(id, (assistsByPlayer.get(id) || 0) + 1);
              }
            });
          }
        });
      } else {
        m.teams.azul.forEach(p => {
          if (playerTypeById(p.playerId) === playerType) {
            if ((p.goals || 0) > 0) goalsByPlayer.set(p.playerId, (goalsByPlayer.get(p.playerId) || 0) + p.goals!);
            if ((p.assists || 0) > 0) assistsByPlayer.set(p.playerId, (assistsByPlayer.get(p.playerId) || 0) + p.assists!);
          }
        });
        m.teams.vermelho.forEach(p => {
          if (playerTypeById(p.playerId) === playerType) {
            if ((p.goals || 0) > 0) goalsByPlayer.set(p.playerId, (goalsByPlayer.get(p.playerId) || 0) + p.goals!);
            if ((p.assists || 0) > 0) assistsByPlayer.set(p.playerId, (assistsByPlayer.get(p.playerId) || 0) + p.assists!);
          }
        });
      }
    });
    
    // Merge all player IDs that have goals or assists
    const allIds = new Set([...goalsByPlayer.keys(), ...assistsByPlayer.keys()]);
    
    return Array.from(allIds)
      .map(id => {
        const gols = goalsByPlayer.get(id) || 0;
        const assistencias = assistsByPlayer.get(id) || 0;
        const total = gols + assistencias;
        const jogos = gamesByPlayer.get(id) || 0;
        const media = jogos > 0 ? total / jogos : 0;
        return { id, gols, assistencias, total, jogos, media, nome: nameById(id) };
      })
      .sort((a, b) => b.total - a.total);
  };

  const StatCard = ({ title, data, icon: Icon, type }: {
    title: string;
    data: { id: string; nome: string; gols?: number; assistencias?: number; fieldGoals?: number; total?: number; media?: number; sofridos?: number; jogos?: number; vitorias?: number; empates?: number; derrotas?: number; aproveitamento?: number; mediaAjustada?: number }[];
    icon: React.ElementType;
    type: 'gols' | 'sofridos' | 'golscontra' | 'assistencias' | 'fieldgoals' | 'participacoes';
  }) => {
    const top3 = data.slice(0, 3);
    
    const isGoalkeeper = type === 'sofridos';

    const getDisplayValue = (item: { gols?: number; assistencias?: number; fieldGoals?: number; total?: number; media?: number; sofridos?: number; aproveitamento?: number }) => {
      if (isGoalkeeper) return `${Math.round(item.aproveitamento ?? 0)}%`;
      if (type === 'gols') return item.gols;
      if (type === 'assistencias') return item.assistencias;
      if (type === 'fieldgoals') return item.fieldGoals;
      if (type === 'participacoes') return item.total;
      return item.gols;
    };
    
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base font-bold text-foreground">{title}</CardTitle>
          <Icon className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          {top3.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
          ) : (
            <div className="space-y-2">
              {top3.map((item, index) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      #{index + 1}
                    </span>
                    <span className="text-sm">{item.nome}</span>
                  </div>
                  <span className="font-bold">
                    {getDisplayValue(item)}
                    {isGoalkeeper && <span className="text-xs font-normal text-muted-foreground ml-1">aprov.</span>}
                  </span>
                </div>
              ))}
              
              {/* Botão de detalhes - sempre visível para goleiros, ou quando há mais de 3 jogadores */}
              {(isGoalkeeper || data.length > 3) && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      {isGoalkeeper ? 'Detalhes' : `Ver todos (${data.length})`}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl w-full max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{title}</DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto max-h-96">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pos.</TableHead>
                            <TableHead>Jogador</TableHead>
                            {isGoalkeeper ? (
                              <>
                                <TableHead className="text-center">Jogos</TableHead>
                                <TableHead className="text-center">V</TableHead>
                                <TableHead className="text-center">E</TableHead>
                                <TableHead className="text-center">D</TableHead>
                                <TableHead className="text-center">Aprov.%</TableHead>
                                <TableHead className="text-center">GS</TableHead>
                                <TableHead className="text-center">Méd. Real</TableHead>
                                <TableHead className="text-center font-bold">Méd. Adj.</TableHead>
                              </>
                            ) : type === 'participacoes' ? (
                              <>
                                <TableHead className="text-center">Jogos</TableHead>
                                <TableHead className="text-center">Gols</TableHead>
                                <TableHead className="text-center">Assist.</TableHead>
                                <TableHead className="text-center">Média</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </>
                            ) : (type === 'gols' || type === 'assistencias' || type === 'fieldgoals') ? (
                              <>
                                <TableHead className="text-center">Jogos</TableHead>
                                <TableHead className="text-center">Média</TableHead>
                                <TableHead className="text-right">
                                  {type === 'gols' ? 'Gols' : type === 'assistencias' ? 'Assistências' : 'FG'}
                                </TableHead>
                              </>
                            ) : (
                              <TableHead className="text-right">Gols contra</TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.map((item, index) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">#{index + 1}</TableCell>
                              <TableCell>{item.nome}</TableCell>
                              {isGoalkeeper ? (
                                <>
                                  <TableCell className="text-center">{item.jogos}</TableCell>
                                  <TableCell className="text-center text-green-600">{item.vitorias}</TableCell>
                                  <TableCell className="text-center text-yellow-600">{item.empates}</TableCell>
                                  <TableCell className="text-center text-red-600">{item.derrotas}</TableCell>
                                  <TableCell className="text-center font-bold">{Math.round(item.aproveitamento ?? 0)}%</TableCell>
                                  <TableCell className="text-center">{item.sofridos}</TableCell>
                                  <TableCell className="text-center text-muted-foreground">{item.media?.toFixed(2)}</TableCell>
                                  <TableCell className="text-center font-bold">{item.mediaAjustada?.toFixed(2)}</TableCell>
                                </>
                              ) : type === 'participacoes' ? (
                                <>
                                  <TableCell className="text-center">{item.jogos}</TableCell>
                                  <TableCell className="text-center">{item.gols}</TableCell>
                                  <TableCell className="text-center">{item.assistencias}</TableCell>
                                  <TableCell className="text-center">{item.media?.toFixed(2)}</TableCell>
                                  <TableCell className="text-right font-bold">{item.total}</TableCell>
                                </>
                              ) : (type === 'gols' || type === 'assistencias' || type === 'fieldgoals') ? (
                                <>
                                  <TableCell className="text-center">{item.jogos}</TableCell>
                                  <TableCell className="text-center">{item.media?.toFixed(2)}</TableCell>
                                  <TableCell className="text-right">
                                    {type === 'gols' ? item.gols : type === 'assistencias' ? item.assistencias : item.fieldGoals}
                                  </TableCell>
                                </>
                              ) : (
                                <TableCell className="text-right">{item.gols}</TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const FormBadges = ({ results }: { results: ('v' | 'e' | 'd')[] }) => (
    <div className="flex gap-0.5 justify-center">
      {results.map((r, i) => (
        <span key={i} className={`w-4 h-4 rounded-sm text-[8px] font-black flex items-center justify-center text-white ${
          r === 'v' ? 'bg-green-500' : r === 'd' ? 'bg-red-500' : 'bg-yellow-500'
        }`}>
          {r === 'v' ? 'V' : r === 'd' ? 'D' : 'E'}
        </span>
      ))}
    </div>
  );

  const Sparkline = ({ points }: { points: number[] }) => {
    if (points.length < 2) return null;
    const max = Math.max(...points);
    if (max === 0) return null;
    const w = 50, h = 18;
    const xStep = w / (points.length - 1);
    const pts = points.map((p, i) => `${(i * xStep).toFixed(1)},${(h - (p / max) * h).toFixed(1)}`).join(' ');
    return (
      <svg width={w} height={h} className="text-primary overflow-visible">
        <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  };

  const RankingCard = ({ playerStats, title }: { playerStats: PlayerStats[], title: string }) => {
    const top3 = playerStats.slice(0, 3);
    
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base font-bold text-foreground">{title}</CardTitle>
          <BarChart3 className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          {top3.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
          ) : (
            <div className="space-y-2">
              {top3.map((player, index) => (
                <div key={player.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      #{index + 1}
                    </span>
                    <span className="text-sm">{player.nome}</span>
                  </div>
                  <span className="font-bold">{player.pontos}</span>
                </div>
              ))}
              {playerStats.length > 3 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      Ver todos ({playerStats.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[90vw] max-w-[90vw] max-h-[85vh] overflow-hidden">
                    <DialogHeader>
                      <DialogTitle>{title} - Detalhes</DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto max-h-[70vh]">
                      <Table>
                         <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                           <TableRow>
                             <TableHead className="w-12">Pos.</TableHead>
                             <TableHead>Jogador</TableHead>
                             <TableHead className="text-center w-16">Pts</TableHead>
                             <TableHead className="text-center w-16">Jogos</TableHead>
                             <TableHead className="text-center w-12">V</TableHead>
                             <TableHead className="text-center w-12">E</TableHead>
                             <TableHead className="text-center w-12">D</TableHead>
                             <TableHead className="text-center w-14">Seq.</TableHead>
                             <TableHead className="text-center w-20">Aprov.%</TableHead>
                             <TableHead className="text-center w-28">Forma</TableHead>
                             <TableHead className="text-center w-16" style={{ color: homeConfig.color }}>{homeConfig.name.substring(0, 2)}%</TableHead>
                             <TableHead className="text-center w-16" style={{ color: awayConfig.color }}>{awayConfig.name.substring(0, 2)}%</TableHead>
                             <TableHead className="text-center w-12">GP</TableHead>
                             <TableHead className="text-center w-12">GS</TableHead>
                             <TableHead className="text-center w-12">Gols</TableHead>
                             <TableHead className="text-center w-12">Ass</TableHead>
                             <TableHead className="text-center w-12">FG</TableHead>
                             <TableHead className="text-center w-16">Evolução</TableHead>
                           </TableRow>
                         </TableHeader>
                         <TableBody>
                           {playerStats.map((player, index) => {
                             const azAprov = player.jogosAzul > 0 ? Math.round((player.pontosAzul / (player.jogosAzul * 3)) * 100) : null;
                             const vmAprov = player.jogosVermelho > 0 ? Math.round((player.pontosVermelho / (player.jogosVermelho * 3)) * 100) : null;
                             return (
                             <TableRow key={player.id}>
                               <TableCell className="font-medium">#{index + 1}</TableCell>
                               <TableCell className="font-medium">{player.nome}</TableCell>
                               <TableCell className="text-center font-bold">{player.pontos}</TableCell>
                               <TableCell className="text-center">{player.jogos}</TableCell>
                               <TableCell className="text-center text-green-600">{player.vitorias}</TableCell>
                               <TableCell className="text-center text-yellow-600">{player.empates}</TableCell>
                               <TableCell className="text-center text-red-600">{player.derrotas}</TableCell>
                               <TableCell className="text-center">
                                 {player.sequenciaAtual !== 0 ? (
                                   <span className={`text-xs font-bold ${player.sequenciaAtual > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                     {Math.abs(player.sequenciaAtual)}{player.sequenciaAtual > 0 ? 'V' : 'D'}
                                   </span>
                                 ) : <span className="text-muted-foreground text-xs">—</span>}
                               </TableCell>
                               <TableCell className="text-center">{Math.round(player.aproveitamento)}%</TableCell>
                               <TableCell className="text-center">
                                 <FormBadges results={player.ultimosResultados} />
                               </TableCell>
                               <TableCell className="text-center" style={{ color: homeConfig.color }}>{azAprov !== null ? `${azAprov}%` : '—'}</TableCell>
                               <TableCell className="text-center" style={{ color: awayConfig.color }}>{vmAprov !== null ? `${vmAprov}%` : '—'}</TableCell>
                               <TableCell className="text-center">{player.golsPro}</TableCell>
                               <TableCell className="text-center">{player.golsSofridos}</TableCell>
                               <TableCell className="text-center font-medium">{player.gols}</TableCell>
                               <TableCell className="text-center">{player.assistencias}</TableCell>
                               <TableCell className="text-center">{player.fieldGoals}</TableCell>
                               <TableCell className="text-center">
                                 <Sparkline points={player.evolucaoPontos} />
                               </TableCell>
                             </TableRow>
                             );
                           })}
                         </TableBody>
                      </Table>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      {/* Seletor de Ano */}
      <div className="flex items-center gap-3">
        <Calendar className="h-5 w-5 text-primary" />
        <span className="font-medium text-foreground">Temporada:</span>
        <Select
          value={selectedYear.toString()}
          onValueChange={(value) => setSelectedYear(parseInt(value))}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          ({filteredMatches.length} partida{filteredMatches.length !== 1 ? 's' : ''})
        </span>
      </div>

      <div className="space-y-8">
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-bold">Resumo da Temporada</h2>
          </div>
          <SeasonSummary matches={filteredMatches} players={players} selectedYear={selectedYear} group={group} />
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Destaques Principais</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <RankingCard playerStats={playerStatsMensalistas} title="Ranking Geral" />
            <StatCard 
              title="Artilharia" 
              data={createGoalsRanking("mensalista")} 
              icon={Trophy} 
              type="gols"
            />
            <StatCard 
              title="Assistências" 
              data={createAssistsRanking("mensalista")} 
              icon={Target} 
              type="assistencias"
            />
            <StatCard 
              title="Participações" 
              data={createGoalContributionsRanking("mensalista")} 
              icon={Users} 
              type="participacoes"
            />
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-bold">Outras Estatísticas</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Field Goals"
              data={createFieldGoalsRanking("mensalista")}
              icon={Crosshair}
              type="fieldgoals"
            />
            <StatCard
              title="Goleiros"
              data={createGoalkeeperRanking("mensalista")}
              icon={Shield}
              type="sofridos"
            />
            <StatCard
              title="Gols Contra"
              data={createOwnGoalsRanking("mensalista")}
              icon={AlertTriangle}
              type="golscontra"
            />
          </div>
        </section>

      </div>
    </div>
  );
}
