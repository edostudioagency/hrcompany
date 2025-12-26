import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActivateRequest {
  token: string;
  password: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("activate-account function called");

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

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Le mot de passe doit contenir au moins 6 caractères" }),
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
      .select("id, email, first_name, last_name, status")
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

    // The DB trigger handle_new_user will automatically:
    // - Create the profile
    // - Add user role
    // - Link employee to user_id and set status to active
    
    // But we need to clear the invitation token manually since trigger might not do it
    const { error: updateError } = await supabaseAdmin
      .from("employees")
      .update({ 
        invitation_token: null,
        user_id: authData.user.id,
        status: "active"
      })
      .eq("id", employee.id);

    if (updateError) {
      console.error("Error updating employee:", updateError);
      // Don't fail the request - user was created successfully
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
