import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rate-limiter.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const allowedOrigins = [
  Deno.env.get("SITE_URL") || "",
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

interface ResetPasswordRequest {
  employeeId: string;
  employeeEmail: string;
  employeeName: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("reset-password function called");

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the user is authenticated and has admin/manager role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Authenticated user:", user.id);

    // Check if user has admin or manager role
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || !roleData || (roleData.role !== "admin" && roleData.role !== "manager")) {
      console.error("Role check failed:", roleError || "Not admin/manager");
      return new Response(
        JSON.stringify({ error: "Accès refusé - Admin ou Manager requis" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("User role verified:", roleData.role);

    // Rate limiting: 5 reset requests per hour per user
    const rateLimitResult = checkRateLimit(`reset-password:${user.id}`, {
      windowMs: 3_600_000,
      maxRequests: 5,
    });

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: "Trop de demandes de réinitialisation. Veuillez réessayer plus tard." }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders, ...getRateLimitHeaders(rateLimitResult.retryAfterMs) },
        }
      );
    }

    const { employeeId, employeeEmail, employeeName }: ResetPasswordRequest = await req.json();

    if (!employeeId || !employeeEmail) {
      return new Response(
        JSON.stringify({ error: "ID et email de l'employé requis" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if the employee has a user account
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from("employees")
      .select("user_id")
      .eq("id", employeeId)
      .single();

    if (employeeError) {
      console.error("Error fetching employee:", employeeError);
      return new Response(
        JSON.stringify({ error: "Employé non trouvé" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate password reset link
    const baseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const siteUrl = req.headers.get("origin") || Deno.env.get("SITE_URL") || "";
    
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: employeeEmail,
      options: {
        redirectTo: `${siteUrl}/auth/reset-password`,
      },
    });

    if (linkError) {
      console.error("Error generating reset link:", linkError);
      
      // If user doesn't exist in auth, inform the admin
      if (linkError.message?.includes("User not found")) {
        return new Response(
          JSON.stringify({ 
            error: "Cet employé n'a pas encore de compte. Envoyez-lui une invitation à la place." 
          }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erreur lors de la génération du lien" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Reset link generated for:", employeeEmail);

    // Extract the token from the link and create a proper reset URL
    const resetUrl = linkData.properties?.action_link || "";
    
    // Send the password reset email
    const emailResponse = await resend.emails.send({
      from: "HR Manager <onboarding@resend.dev>",
      to: [employeeEmail],
      subject: "Réinitialisation de votre mot de passe - HR Manager",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">HR Manager</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px;">Bonjour ${employeeName},</p>
            <p>Un administrateur a demandé la réinitialisation de votre mot de passe.</p>
            <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 28px; 
                        text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px;">
                Réinitialiser mon mot de passe
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Ce lien est valide pendant 24 heures.</p>
            <p style="color: #666; font-size: 14px;">Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              Cet email a été envoyé par HR Manager
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Reset email sent:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email de réinitialisation envoyé" 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in reset-password function:", error);
    return new Response(
      JSON.stringify({ error: "Une erreur s'est produite. Veuillez réessayer." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
