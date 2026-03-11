import { Card } from "@/components/ui/card";
import type { Group } from "@/types/football";

interface ScoreboardProps {
  azul: number;
  vermelho: number;
  group: Group;
}

export default function Scoreboard({ azul, vermelho, group }: ScoreboardProps) {
  const homeConfig = group.settings.sides.home;
  const awayConfig = group.settings.sides.away;

  return (
    <section aria-label="Placar da Partida" className="mb-4">
      <Card className="p-4">
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="text-sm font-bold uppercase tracking-widest text-slate-400" style={{ color: homeConfig.color }}>{homeConfig.name}</div>
            <div className="text-4xl font-black tracking-tight" style={{ color: homeConfig.color }}>{azul}</div>
          </div>
          <div className="text-3xl font-black text-slate-200">x</div>
          <div className="text-center">
            <div className="text-sm font-bold uppercase tracking-widest text-slate-400" style={{ color: awayConfig.color }}>{awayConfig.name}</div>
            <div className="text-4xl font-black tracking-tight" style={{ color: awayConfig.color }}>{vermelho}</div>
          </div>
        </div>
      </Card>
    </section>
  );
}
