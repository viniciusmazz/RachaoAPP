import { useParams } from "react-router-dom";
import { useEffect } from "react";
import { useGroup } from "@/hooks/useGroup";
import Index from "./Index";
import NotFound from "./NotFound";

const GroupPage = () => {
  const { slug } = useParams<{ slug: string }>();
  console.log('GroupPage rendering for slug:', slug);
  const { group, loading, notFound, refreshGroup } = useGroup(slug);

  useEffect(() => {
    if (!loading) {
      console.log('GroupPage load complete. Group found:', !!group, 'NotFound:', notFound);
    }
  }, [loading, group, notFound]);

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

  return <Index group={group} refreshGroup={refreshGroup} />;
};

export default GroupPage;
