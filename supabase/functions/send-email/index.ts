import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: "invitation" | "schedule_change" | "time_off" | "shift_swap";
  recipientEmail: string;
  recipientName: string;
  data: Record<string, unknown>;
}

const getEmailContent = (type: string, recipientName: string, data: Record<string, unknown>) => {
  const baseUrl = Deno.env.get("SITE_URL") || "https://d75adb96-b288-4d7a-9037-411af3c65085.lovableproject.com";
  
  switch (type) {
    case "invitation":
      return {
        subject: "Invitation à rejoindre HR Manager",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">Bienvenue sur HR Manager!</h1>
            <p>Bonjour ${recipientName},</p>
            <p>Vous avez été invité(e) à rejoindre l'équipe sur HR Manager.</p>
            <p>Cliquez sur le lien ci-dessous pour créer votre compte :</p>
            <a href="${baseUrl}/auth?token=${data.invitationToken}&email=${encodeURIComponent(data.email as string)}" 
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
            <p>Bonjour ${recipientName},</p>
            <p>Votre planning de travail a été mis à jour.</p>
            <p><strong>Détails :</strong></p>
            <p>${data.details || "Consultez l'application pour voir les changements."}</p>
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
            <p>Bonjour ${recipientName},</p>
            <p>Votre demande de congé du ${data.startDate} au ${data.endDate} a été <strong>${timeOffStatus}</strong>.</p>
            ${data.reason ? `<p><strong>Commentaire :</strong> ${data.reason}</p>` : ""}
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
        swapMessage = `${data.requesterName} souhaite échanger son shift du ${data.originalDate} avec votre shift du ${data.swapDate}.`;
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
            <p>Bonjour ${recipientName},</p>
            <p>${swapMessage}</p>
            <a href="${baseUrl}/swaps" 
               style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 8px; margin: 16px 0;">
              Voir les échanges
            </a>
          </div>
        `,
      };
    
    default:
      return {
        subject: "Notification HR Manager",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">Notification</h1>
            <p>Bonjour ${recipientName},</p>
            <p>Vous avez une nouvelle notification sur HR Manager.</p>
          </div>
        `,
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, recipientEmail, recipientName, data }: EmailRequest = await req.json();
    
    console.log(`Sending ${type} email to ${recipientEmail}`);
    
    const { subject, html } = getEmailContent(type, recipientName, data);

    const emailResponse = await resend.emails.send({
      from: "HR Manager <onboarding@resend.dev>",
      to: [recipientEmail],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log the email in the database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
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
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
