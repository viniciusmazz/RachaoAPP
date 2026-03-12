import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";
import { paymentService } from "@/services/paymentService";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PaymentButtonProps {
  amount: number;
  description: string;
  playerId: string;
  groupId: string;
  month: number;
  year: number;
  playerName: string;
}

export function PaymentButton({ 
  amount, 
  description, 
  playerId, 
  groupId, 
  month, 
  year,
  playerName
}: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      // 1. Get current user session for email
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado");

      // 2. Create or get payment record in Supabase to get an ID
      // We need a payment record to track the status via webhook
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .upsert({
          player_id: playerId,
          group_id: groupId,
          month,
          year,
          amount,
          paid: false,
          notes: "Iniciado via Cielo Checkout"
        }, { onConflict: 'player_id,group_id,month,year' })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // 3. Create Cielo Checkout session
      const checkout = await paymentService.createCheckout({
        amount,
        description,
        customerName: playerName || session.user.user_metadata?.name || "Jogador",
        customerEmail: session.user.email || "",
        paymentId: paymentData.id
      });

      // 4. Redirect to Cielo
      if (checkout.paymentUrl) {
        window.location.href = checkout.paymentUrl;
      } else {
        throw new Error("URL de pagamento não recebida");
      }

    } catch (error: unknown) {
      console.error("Payment error:", error);
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro ao processar seu pagamento.";
      toast({
        title: "Erro ao iniciar pagamento",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      size="sm" 
      className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all"
      onClick={handlePayment}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <CreditCard className="h-4 w-4 mr-2" />
      )}
      Pagar Agora
    </Button>
  );
}
