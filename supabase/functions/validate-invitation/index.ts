import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidateRequest {
  token: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("validate-invitation function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    // Find employee with this invitation token
    const { data: employee, error: fetchError } = await supabaseAdmin
      .from("employees")
      .select("id, email, first_name, last_name, status, invitation_token")
      .eq("invitation_token", token)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching employee:", fetchError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la validation" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!employee) {
      console.log("No employee found with token:", token);
      return new Response(
        JSON.stringify({ error: "Invitation invalide ou expirée" }),
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
        email: employee.email,
        first_name: employee.first_name,
        last_name: employee.last_name,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in validate-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
