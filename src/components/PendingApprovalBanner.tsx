import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const PendingApprovalBanner = () => {
  return (
    <Alert variant="default" className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
      <AlertCircle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800 dark:text-yellow-200">Aguardando aprovação</AlertTitle>
      <AlertDescription className="text-yellow-700 dark:text-yellow-300">
        Sua conta está pendente de aprovação pelo administrador. 
        Enquanto isso, você pode visualizar as estatísticas e histórico de partidas.
      </AlertDescription>
    </Alert>
  );
};

export default PendingApprovalBanner;
