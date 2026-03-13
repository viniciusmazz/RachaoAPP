import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserGroups } from "@/hooks/useGroup";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Plus, Users, ExternalLink, Shield, Search, User } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Landing from "./Landing";
import type { Group } from "@/types/football";
import { toast } from "@/hooks/use-toast";
import { useAppSettings } from "@/hooks/useAppSettings";
import logoUrl from "/logo.png";

const LogoImage = ({ size, fallbackText }: { size: string, fallbackText: string }) => {
  const [error, setError] = useState(false);
  const { appLogo, loading } = useAppSettings();
  
  if (loading) {
    return (
      <div className={`${size} flex items-center justify-center bg-slate-100/50 rounded-2xl animate-pulse`}>
        <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

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
      onError={() => {
        console.error('LogoImage: Error loading image');
        setError(true);
      }}
      referrerPolicy="no-referrer"
    />
  );
};

const Home = () => {
  return <Landing />;
};

export default Home;
