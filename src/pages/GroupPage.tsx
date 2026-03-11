import { useParams } from "react-router-dom";
import { useGroup } from "@/hooks/useGroup";
import Index from "./Index";
import NotFound from "./NotFound";

const GroupPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { group, loading, notFound } = useGroup(slug);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-pulse">
            <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 animate-spin">
              <span className="text-white font-black text-xl">F</span>
            </div>
          </div>
          <p className="text-slate-500 font-bold animate-pulse">Carregando grupo...</p>
        </div>
      </div>
    );
  }

  if (notFound || !group) {
    return <NotFound />;
  }

  return <Index group={group} />;
};

export default GroupPage;
