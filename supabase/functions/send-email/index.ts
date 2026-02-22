import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Allowed origins for CORS
const allowedOrigins = [
  Deno.env.get("SITE_URL") || "https://d75adb96-b288-4d7a-9037-411af3c65085.lovableproject.com",
  "https://bsdccrcdfunhoempbzdl.supabase.co",
];

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/\/$/, '')));
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
};

interface EmailRequest {
  type: "invitation" | "schedule_change" | "time_off" | "shift_swap" | "commissions";
  recipientEmail: string;
  recipientName: string;
  data: Record<string, unknown>;
}

const VALID_EMAIL_TYPES = ["invitation", "schedule_change", "time_off", "shift_swap", "commissions"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

const getEmailContent = (type: string, recipientName: string, data: Record<string, unknown>) => {
  const baseUrl = Deno.env.get("SITE_URL") || "https://d75adb96-b288-4d7a-9037-411af3c65085.lovableproject.com";
  
  switch (type) {
    case "invitation":
      return {
        subject: "Invitation à rejoindre HR Manager",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">Bienvenue sur HR Manager!</h1>
            <p>Bonjour ${escapeHtml(recipientName)},</p>
            <p>Vous avez été invité(e) à rejoindre l'équipe sur HR Manager.</p>
            <p>Cliquez sur le lien ci-dessous pour créer votre compte :</p>
            <a href="${baseUrl}/accept-invitation?token=${encodeURIComponent(String(data.invitationToken || ''))}" 
               style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 8px; margin: 16px 0;">
              Créer mon compte
            </a>
            <p style="color: #666; font-size: 14px;">
              Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.
            </p>
          </div>
        `,
      };
    
    case "schedule_change":
      return {
        subject: "Modification de votre planning",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">Votre planning a été modifié</h1>
            <p>Bonjour ${escapeHtml(recipientName)},</p>
            <p>Votre planning de travail a été mis à jour.</p>
            <p><strong>Détails :</strong></p>
            <p>${escapeHtml(String(data.details || "Consultez l'application pour voir les changements."))}</p>
            <a href="${baseUrl}/shifts" 
               style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 8px; margin: 16px 0;">
              Voir mon planning
            </a>
          </div>
        `,
      };
    
    case "time_off":
      const timeOffStatus = data.status === "approved" ? "approuvée" : "refusée";
      return {
        subject: `Demande de congé ${timeOffStatus}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">Demande de congé ${timeOffStatus}</h1>
            <p>Bonjour ${escapeHtml(recipientName)},</p>
            <p>Votre demande de congé du ${escapeHtml(String(data.startDate))} au ${escapeHtml(String(data.endDate))} a été <strong>${timeOffStatus}</strong>.</p>
            ${data.reason ? `<p><strong>Commentaire :</strong> ${escapeHtml(String(data.reason))}</p>` : ""}
            <a href="${baseUrl}/time-off" 
               style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 8px; margin: 16px 0;">
              Voir mes demandes
            </a>
          </div>
        `,
      };
    
    case "shift_swap":
      const swapAction = data.action as string;
      let swapMessage = "";
      
      if (swapAction === "request") {
        swapMessage = `${escapeHtml(String(data.requesterName))} souhaite échanger son shift du ${escapeHtml(String(data.originalDate))} avec votre shift du ${escapeHtml(String(data.swapDate))}.`;
      } else if (swapAction === "approved") {
        swapMessage = `Votre demande d'échange a été approuvée.`;
      } else if (swapAction === "rejected") {
        swapMessage = `Votre demande d'échange a été refusée.`;
      }
      
      return {
        subject: "Demande d'échange de shift",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">Échange de shift</h1>
            <p>Bonjour ${escapeHtml(recipientName)},</p>
            <p>${swapMessage}</p>
            <a href="${baseUrl}/swaps" 
               style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 8px; margin: 16px 0;">
              Voir les échanges
            </a>
          </div>
        `,
      };
    
    case "commissions":
      const commissionsData = data.commissions as string || "";
      const commissionsTotal = data.total as number || 0;
      const commissionsMonth = data.month as string || "";
      const commissionsYear = data.year as number || new Date().getFullYear();
      
      return {
        subject: `Commissions - ${commissionsMonth} ${commissionsYear}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">Commissions du mois</h1>
            <p>Bonjour ${escapeHtml(recipientName)},</p>
            <p>Voici le récapitulatif des commissions pour <strong>${escapeHtml(commissionsMonth)} ${commissionsYear}</strong> :</p>
            <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <pre style="white-space: pre-wrap; font-family: monospace; margin: 0;">${escapeHtml(commissionsData)}</pre>
            </div>
            <p style="font-size: 18px; font-weight: bold; color: #6366f1;">
              Total : ${commissionsTotal.toFixed(2)} €
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #666; font-size: 14px;">
              Cet email a été généré automatiquement par HR Manager.
            </p>
          </div>
        `,
      };
    
    default:
      return {
        subject: "Notification HR Manager",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">Notification</h1>
            <p>Bonjour ${escapeHtml(recipientName)},</p>
            <p>Vous avez une nouvelle notification sur HR Manager.</p>
          </div>
        `,
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-email function called");
  
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Check origin for non-OPTIONS requests
  if (req.method !== "OPTIONS" && origin && !allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/\/$/, '')))) {
    console.error("Forbidden origin:", origin);
    return new Response(JSON.stringify({ error: "Forbidden origin" }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user token
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error("Invalid token:", authError);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Authenticated user:", user.id);

    // Check user role - only admin and manager can send emails
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || !roleData) {
      console.error("Role lookup error:", roleError);
      return new Response(JSON.stringify({ error: "User role not found" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!["admin", "manager"].includes(roleData.role)) {
      console.error("Insufficient permissions for role:", roleData.role);
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("User role verified:", roleData.role);

    // Parse and validate request body
    const body = await req.json();
    const { type, recipientEmail, recipientName, data }: EmailRequest = body;

    // Input validation
    if (!type || !recipientEmail || !recipientName) {
      console.error("Missing required fields");
      return new Response(JSON.stringify({ error: "Missing required fields: type, recipientEmail, recipientName" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!VALID_EMAIL_TYPES.includes(type)) {
      console.error("Invalid email type:", type);
      return new Response(JSON.stringify({ error: `Invalid email type. Must be one of: ${VALID_EMAIL_TYPES.join(", ")}` }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!EMAIL_REGEX.test(recipientEmail)) {
      console.error("Invalid email format:", recipientEmail);
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (recipientName.length > 200) {
      console.error("Recipient name too long");
      return new Response(JSON.stringify({ error: "Recipient name too long" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    console.log(`Sending ${type} email to ${recipientEmail}`);
    
    const { subject, html } = getEmailContent(type, recipientName, data || {});

    const emailResponse = await resend.emails.send({
      from: "HR Manager <noreply@notifications.e-do.studio>",
      to: [recipientEmail],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);
    
    // Log the email in the database using service role key
    await supabase.from("email_notifications").insert({
      recipient_email: recipientEmail,
      subject,
      type,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error in send-email function:", error);
    
    return new Response(
      JSON.stringify({ success: false, error: "Une erreur s'est produite lors de l'envoi de l'email. Veuillez réessayer." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
