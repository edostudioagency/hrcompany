import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface ActivateRequest {
  token: string;
  password: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("activate-account function called");

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, password }: ActivateRequest = await req.json();

    if (!token || !password) {
      console.log("Missing token or password");
      return new Response(
        JSON.stringify({ error: "Token et mot de passe requis" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Password complexity: min 10 chars, uppercase, lowercase, digit, special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{10,}$/;
    if (!passwordRegex.test(password)) {
      return new Response(
        JSON.stringify({ error: "Le mot de passe doit contenir au moins 10 caractères, incluant majuscules, minuscules, chiffres et caractères spéciaux" }),
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

    console.log("Creating auth user for:", employee.email);

    // Create the auth user with admin API (auto-confirmed)
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: employee.email,
      password: password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        first_name: employee.first_name,
        last_name: employee.last_name,
      },
    });

    if (createError) {
      console.error("Error creating auth user:", createError);
      
      // Check if user already exists - check both message and code
      if (createError.message?.includes("already been registered") || 
          createError.message?.includes("already exists") ||
          (createError as any).code === "email_exists") {
        console.log("User already exists, returning existingAccount flag");
        return new Response(
          JSON.stringify({ 
            error: "Un compte existe déjà avec cette adresse email",
            existingAccount: true 
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erreur lors de la création du compte" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Auth user created:", authData.user.id);

    // Update employee status and link to user
    const { error: updateError } = await supabaseAdmin
      .from("employees")
      .update({ 
        user_id: authData.user.id,
        status: "active"
      })
      .eq("id", employee.id);

    if (updateError) {
      console.error("Error updating employee:", updateError);
      // Don't fail the request - user was created successfully
    }

    // Delete the invitation token (it's been used)
    const { error: deleteInvitationError } = await supabaseAdmin
      .from("employee_invitations")
      .delete()
      .eq("id", invitation.id);

    if (deleteInvitationError) {
      console.error("Error deleting invitation:", deleteInvitationError);
      // Don't fail the request - account was created successfully
    }

    console.log("Account activated successfully for:", employee.email);
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Compte activé avec succès"
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in activate-account function:", error);
    return new Response(
      JSON.stringify({ error: "Une erreur s'est produite. Veuillez réessayer." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);