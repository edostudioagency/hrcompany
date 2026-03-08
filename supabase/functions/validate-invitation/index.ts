import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rate-limiter.ts";

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

interface ValidateRequest {
  token: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("validate-invitation function called");

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

    // Rate limiting: 5 attempts per minute per IP
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const rateLimitResult = checkRateLimit(`validate-invitation:${clientIp}`, {
      windowMs: 60_000,
      maxRequests: 5,
    });

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: "Trop de tentatives. Veuillez réessayer dans quelques instants." }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders, ...getRateLimitHeaders(rateLimitResult.retryAfterMs) },
        }
      );
    }

  try {
    const { token }: ValidateRequest = await req.json();

    if (!token) {
      console.log("Missing token");
      return new Response(
        JSON.stringify({ error: "Token d'invitation manquant" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase admin client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Find invitation with this token from the secure employee_invitations table
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from("employee_invitations")
      .select("id, employee_id, invitation_token, expires_at")
      .eq("invitation_token", token)
      .maybeSingle();

    if (invitationError) {
      console.error("Error fetching invitation:", invitationError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la validation" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!invitation) {
    console.log("No invitation found for provided token");
      return new Response(
        JSON.stringify({ error: "Invitation invalide ou expirée" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if invitation has expired
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      console.log("Invitation expired");
      return new Response(
        JSON.stringify({ error: "Cette invitation a expiré" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get employee details
    const { data: employee, error: fetchError } = await supabaseAdmin
      .from("employees")
      .select("id, email, first_name, last_name, status")
      .eq("id", invitation.employee_id)
      .maybeSingle();

    if (fetchError || !employee) {
      console.error("Error fetching employee:", fetchError);
      return new Response(
        JSON.stringify({ error: "Employé non trouvé" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (employee.status === "active") {
      console.log("Account already activated for:", employee.email);
      return new Response(
        JSON.stringify({ error: "Ce compte a déjà été activé" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Invitation validated for:", employee.email);
    return new Response(
      JSON.stringify({
        id: employee.id,
        first_name: employee.first_name,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in validate-invitation function:", error);
    return new Response(
      JSON.stringify({ error: "Une erreur s'est produite. Veuillez réessayer." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);