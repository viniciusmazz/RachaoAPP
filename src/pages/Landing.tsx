import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logoUrl from "/logo.png";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Trophy, BarChart3, Users, DollarSign, Shield, 
  ChevronRight, Check, Zap
} from "lucide-react";

const FEATURES = [
  { icon: Users, title: "Gestão de Elenco", desc: "Cadastre jogadores, posições e habilidades do seu grupo." },
  { icon: BarChart3, title: "Estatísticas Completas", desc: "Artilharia, assistências, field goals, goleiros e mais." },
  { icon: Trophy, title: "Escalação Inteligente", desc: "Sugestão automática de times equilibrados por habilidade." },
  { icon: DollarSign, title: "Controle Financeiro", desc: "Mensalidades, convidados, caixa com entradas e saídas." },
  { icon: Shield, title: "URL Exclusiva", desc: "Seu grupo com endereço próprio e personalizado." },
  { icon: Zap, title: "Acesso Híbrido", desc: "Estatísticas públicas, gestão restrita ao dono do grupo." },
];

const LogoImage = ({ size, fallbackText }: { size: string, fallbackText: string }) => {
  const [error, setError] = useState(false);
  const { appLogo } = useAppSettings();
  
  if (error) {
    return (
      <div className={`${size} flex items-center justify-center text-primary font-black text-xl`}>
        {fallbackText}
      </div>
    );
  }

  return (
    <img 
      src={appLogo || logoUrl} 
      alt="Logo" 
      className={`${size} object-contain`}
      onError={() => setError(true)}
      referrerPolicy="no-referrer"
    />
  );
};

const PLANS = [
  { 
    name: "Grátis", 
    price: "R$ 0", 
    period: "", 
    groups: "1 grupo", 
    features: ["Jogadores ilimitados", "Estatísticas completas", "Controle financeiro", "URL exclusiva"],
    cta: "Começar Grátis",
    highlight: false,
  },
  { 
    name: "Trio", 
    price: "R$ 9,90", 
    period: "/mês", 
    groups: "Até 3 grupos", 
    features: ["Tudo do plano Grátis", "3 grupos simultâneos", "Suporte prioritário"],
    cta: "Assinar Trio",
    highlight: true,
  },
  { 
    name: "Liga", 
    price: "R$ 14,90", 
    period: "/mês", 
    groups: "Até 5 grupos", 
    features: ["Tudo do plano Trio", "5 grupos simultâneos", "Relatórios avançados"],
    cta: "Assinar Liga",
    highlight: false,
  },
];

const Landing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    console.log("Landing Page Loaded - Logo URL:", logoUrl);
  }, []);

  return (
    <div className="min-h-screen bg-white selection:bg-primary/20">
      {/* Nav */}
      <nav className="border-b bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container flex items-center justify-between h-20 max-w-6xl">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-12 h-12 bg-primary/5 rounded-xl shadow-md border border-slate-100 flex items-center justify-center overflow-hidden">
              <LogoImage size="h-12 w-12" fallbackText="R" />
            </div>
            <span className="font-black text-xl tracking-tighter text-slate-900">Rachão<span className="text-primary">App</span></span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" className="font-bold rounded-full" onClick={() => navigate("/auth")}>Entrar</Button>
            <Button className="font-bold rounded-full px-6 shadow-lg shadow-primary/20" onClick={() => navigate("/auth")}>Criar Conta</Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container max-w-6xl py-24 md:py-40 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>
        
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-xs font-black uppercase tracking-widest mb-8 animate-bounce">
          <Zap className="h-3 w-3 fill-current" />
          O app nº 1 para sua pelada
        </div>
        
        <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9] text-slate-900">
          Gerencie seu <span className="text-primary">futebol</span> <br className="hidden md:block" /> como profissional
        </h1>
        <p className="text-lg md:text-2xl text-slate-500 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
          Estatísticas, escalação inteligente, controle financeiro e URL exclusiva. Tudo o que seu grupo precisa em uma interface moderna e rápida.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button size="lg" onClick={() => navigate("/auth")} className="h-16 px-10 text-lg font-black rounded-2xl gap-3 shadow-2xl shadow-primary/30 hover:scale-105 transition-all">
            Começar Agora Grátis <ChevronRight className="h-6 w-6" />
          </Button>
          <p className="text-sm text-slate-400 font-medium">Sem cartão de crédito necessário</p>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-32">
        <div className="container max-w-6xl">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-slate-900">Tudo que seu time precisa</h2>
            <p className="text-slate-500 font-medium text-lg">Funcionalidades pensadas para quem leva a pelada a sério.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="border-none shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 rounded-[2rem] bg-white group overflow-hidden">
                <CardContent className="p-10 flex flex-col items-start">
                  <div className="rounded-2xl bg-primary/10 p-4 mb-6 group-hover:bg-primary group-hover:rotate-6 transition-all duration-300">
                    <f.icon className="h-8 w-8 text-primary group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-900">{f.title}</h3>
                  <p className="text-slate-500 font-medium leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="container max-w-5xl py-32" id="pricing">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-slate-900">Planos Simples</h2>
          <p className="text-slate-500 font-medium text-lg">Comece grátis. Escale conforme seu grupo cresce.</p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {PLANS.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative overflow-hidden rounded-[2.5rem] transition-all duration-500 ${plan.highlight ? "border-primary border-2 shadow-2xl scale-105 z-10 bg-white" : "border-slate-100 shadow-lg bg-white/50"}`}
            >
              {plan.highlight && (
                <div className="absolute top-0 inset-x-0 h-2 bg-primary" />
              )}
              <CardContent className="p-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-black text-2xl text-slate-900">{plan.name}</h3>
                    <p className="text-xs font-bold text-primary uppercase tracking-widest mt-1">{plan.groups}</p>
                  </div>
                  {plan.highlight && (
                    <span className="bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-full uppercase">Mais Popular</span>
                  )}
                </div>
                <div className="mb-10">
                  <span className="text-5xl font-black tracking-tighter text-slate-900">{plan.price}</span>
                  <span className="text-slate-400 font-bold text-lg">{plan.period}</span>
                </div>
                <ul className="space-y-4 mb-10 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-3 text-sm font-medium text-slate-600">
                      <div className="bg-emerald-500/10 p-1 rounded-full">
                        <Check className="h-3 w-3 text-emerald-600" />
                      </div>
                      {feat}
                    </li>
                  ))}
                </ul>
                <Button 
                  className={`w-full h-14 rounded-2xl font-black text-base transition-all ${plan.highlight ? "shadow-xl shadow-primary/30 hover:shadow-primary/50" : ""}`} 
                  variant={plan.highlight ? "default" : "outline"}
                  onClick={() => navigate("/auth")}
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-slate-50">
        <div className="container max-w-6xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/5 rounded-lg shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden">
              <LogoImage size="h-8 w-8" fallbackText="R" />
            </div>
            <span className="font-black text-lg tracking-tighter">Rachão<span className="text-primary">App</span></span>
          </div>
          <div className="text-slate-400 font-medium text-sm">
            © {new Date().getFullYear()} RachãoApp. Desenvolvido para craques.
          </div>
        </div>
      </footer>
    </div>

  );
};

export default Landing;
