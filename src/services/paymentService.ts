export interface CheckoutParams {
  amount: number;
  description: string;
  customerName: string;
  customerEmail: string;
  paymentId: string;
}

export const paymentService = {
  async createCheckout(params: CheckoutParams) {
    try {
      const response = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Erro ao criar checkout");
      }

      return data;
    } catch (error) {
      console.error("Payment Service Error:", error);
      throw error;
    }
  },
};
