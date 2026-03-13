import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy initialize Supabase Admin
let supabaseAdminInstance: SupabaseClient | null = null;

function getSupabaseAdmin() {
  if (!supabaseAdminInstance) {
    const url = process.env.SUPABASE_URL || "https://wnrfyhedlryufcwnvbma.supabase.co";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!key) {
      console.warn("SUPABASE_SERVICE_ROLE_KEY is missing. Backend operations will fail.");
      return null;
    }
    
    supabaseAdminInstance = createClient(url, key);
  }
  return supabaseAdminInstance;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      message: "RachãoApp Backend is running",
      cieloConfigured: !!(process.env.CIELO_MERCHANT_ID && process.env.CIELO_MERCHANT_KEY)
    });
  });

  // Cielo Checkout Route
  app.post("/api/payments/create-checkout", async (req, res) => {
    try {
      const { amount, description, customerName, customerEmail, paymentId } = req.body;
      
      const merchantId = process.env.CIELO_MERCHANT_ID;
      const isSandbox = process.env.CIELO_SANDBOX === "true";
      const cieloUrl = isSandbox 
        ? "https://cieloecommerce.cielo.com.br/api/public/v1/orders" 
        : "https://cieloecommerce.cielo.com.br/api/public/v1/orders"; // Usually same for checkout

      // Cielo Checkout expects amount in cents (integer)
      const amountInCents = Math.round(amount * 100);

      const orderBody = {
        OrderNumber: paymentId, // We use the Supabase payment ID as order number
        SoftDescriptor: "RachaoApp",
        Cart: {
          Items: [
            {
              Name: description || "Mensalidade Rachão",
              Description: description || "Mensalidade do grupo",
              UnitPrice: amountInCents,
              Quantity: 1,
              Type: "Asset"
            }
          ]
        },
        Shipping: {
          Type: "WithoutShipping"
        },
        Payment: {
          BoletoDiscount: 0,
          DebitDiscount: 0
        },
        Customer: {
          Identity: "00000000000", // Placeholder if not provided
          FullName: customerName,
          Email: customerEmail
        },
        Options: {
          ReturnUrl: `${process.env.APP_URL}/profile`,
          NotificationUrl: `${process.env.APP_URL}/api/payments/webhook`
        }
      };

      console.log("Calling Cielo Checkout API...");
      
      const response = await fetch(cieloUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "MerchantId": merchantId || ""
        },
        body: JSON.stringify(orderBody)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Cielo Error:", data);
        return res.status(response.status).json({ success: false, error: data });
      }

      res.json({ 
        success: true, 
        paymentUrl: data.settings.checkoutUrl,
        orderId: data.orderNumber
      });
    } catch (error: unknown) {
      console.error("Payment creation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      res.status(500).json({ success: false, error: errorMessage });
    }
  });

  // Cielo API 3.0 - PIX Payment
  app.post("/api/payments/pix", async (req, res) => {
    try {
      const { amount, paymentId, customerName } = req.body;
      
      const merchantId = process.env.CIELO_MERCHANT_ID;
      const merchantKey = process.env.CIELO_MERCHANT_KEY;
      const apiUrl = process.env.CIELO_API_URL || "https://apisandbox.cieloecommerce.cielo.com.br";

      const amountInCents = Math.round(amount * 100);

      const body = {
        "MerchantOrderId": paymentId,
        "Customer": {
          "Name": customerName || "Jogador Rachão"
        },
        "Payment": {
          "Type": "Pix",
          "Amount": amountInCents
        }
      };

      const response = await fetch(`${apiUrl}/1/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "MerchantId": merchantId || "",
          "MerchantKey": merchantKey || ""
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Cielo PIX Error:", data);
        return res.status(response.status).json({ success: false, error: data });
      }

      res.json({ 
        success: true, 
        qrCodeBase64: data.Payment.QrCodeBase64Image,
        qrCodeString: data.Payment.QrCodeString,
        paymentId: data.Payment.PaymentId
      });
    } catch (error) {
      console.error("PIX creation error:", error);
      res.status(500).json({ success: false, error: "Erro ao gerar PIX" });
    }
  });

  // Cielo API 3.0 - Credit Card Payment
  app.post("/api/payments/credit-card", async (req, res) => {
    try {
      const { amount, paymentId, customerName, cardToken, securityCode } = req.body;
      
      const merchantId = process.env.CIELO_MERCHANT_ID;
      const merchantKey = process.env.CIELO_MERCHANT_KEY;
      const apiUrl = process.env.CIELO_API_URL || "https://apisandbox.cieloecommerce.cielo.com.br";

      const amountInCents = Math.round(amount * 100);

      const body = {
        "MerchantOrderId": paymentId,
        "Customer": {
          "Name": customerName
        },
        "Payment": {
          "Type": "CreditCard",
          "Amount": amountInCents,
          "Installments": 1,
          "CreditCard": {
            "CardToken": cardToken,
            "SecurityCode": securityCode,
            "Brand": "Visa" // Brand should be detected or passed
          }
        }
      };

      const response = await fetch(`${apiUrl}/1/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "MerchantId": merchantId || "",
          "MerchantKey": merchantKey || ""
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({ success: false, error: data });
      }

      res.json({ success: true, data });
    } catch (error) {
      console.error("Credit Card error:", error);
      res.status(500).json({ success: false, error: "Erro ao processar cartão" });
    }
  });

  // Webhook for Cielo notifications (API 3.0)
  app.post("/api/payments/webhook", async (req, res) => {
    try {
      // Cielo Checkout sends notification as form-data or JSON depending on config
      // Usually it's a POST with orderNumber and status
      const { orderNumber, status } = req.body;
      
      console.log(`Payment Webhook Received: Order ${orderNumber}, Status ${status}`);

      // Status 2 = Paid/Approved in Cielo Checkout
      if (status === 2 || status === "2") {
        const admin = getSupabaseAdmin();
        if (!admin) {
          console.error("Cannot update payment: SUPABASE_SERVICE_ROLE_KEY is missing");
          return res.status(500).send("Server Configuration Error");
        }

        const { error } = await admin
          .from("payments")
          .update({ 
            paid: true, 
            paid_at: new Date().toISOString(),
            notes: (req.body.paymentMethod || "") + " - Automático"
          })
          .eq("id", orderNumber); // We used payment ID as orderNumber

        if (error) {
          console.error("Error updating Supabase:", error);
          return res.status(500).send("DB Error");
        }
        
        console.log(`Payment ${orderNumber} marked as PAID`);
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).send("Error");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Error starting server:", err);
});
