import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a secure random password
function generatePassword(length = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let password = "";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }
  // Ensure at least one of each type
  password = password.slice(0, -4) + "Aa1!";
  return password;
}

// Email sending functionality removed - admin will manually send credentials

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing required environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role (admin access)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse request body with error handling
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Received request body:", JSON.stringify(requestBody));
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid request body. Expected JSON." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { orgName, orgDescription, orgWebsite, contactEmail, contactName } = requestBody;

    if (!orgName || !orgName.trim()) {
      return new Response(
        JSON.stringify({ error: "Organization name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!contactEmail || !contactEmail.trim()) {
      return new Response(
        JSON.stringify({ error: "Contact email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a secure password
    const tempPassword = generatePassword(12);

    // 1. Create the user account using Admin API
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: contactEmail,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: contactName || orgName + " Admin",
        role: "org_admin",
      },
    });

    if (userError) {
      console.error("Error creating user:", JSON.stringify(userError, null, 2));
      
      // Check if user already exists
      if (userError.message?.includes("already been registered") || 
          userError.message?.includes("already registered") ||
          userError.status === 422) {
        return new Response(
          JSON.stringify({ 
            error: "A user with this email already exists",
            details: userError.message 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to create user account",
          details: userError.message || JSON.stringify(userError)
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user?.id;
    if (!userId) {
      throw new Error("Failed to create user - no user ID returned");
    }

    // 2. Create the organization
    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: orgName,
        description: orgDescription || null,
        website: orgWebsite || null,
        contact_email: contactEmail,
      })
      .select()
      .single();

    if (orgError) {
      console.error("Error creating organization:", JSON.stringify(orgError, null, 2));
      // Rollback: delete the created user
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (deleteError) {
        console.error("Error deleting user during rollback:", deleteError);
      }
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to create organization",
          details: orgError.message || JSON.stringify(orgError)
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Update the user's profile with org_id and role
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        org_id: orgData.id,
        role: "org_admin",
        full_name: contactName || orgName + " Admin",
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      // Continue anyway, profile might be created by trigger
    }

    // 4. Add user to org_members
    const { error: memberError } = await supabase
      .from("org_members")
      .insert({
        org_id: orgData.id,
        user_id: userId,
        role: "admin",
      });

    if (memberError) {
      console.error("Error adding to org_members:", memberError);
      // Continue anyway
    }

    // Email sending removed - admin will manually send credentials to organization

    return new Response(
      JSON.stringify({
        success: true,
        organization: orgData,
        user: {
          id: userId,
          email: contactEmail,
          tempPassword: tempPassword, // Return password for admin to share manually
        },
        message: "Organization created successfully. Please share the login credentials with the organization administrator.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Unexpected error in create-org-admin:", error);
    console.error("Error stack:", error?.stack);
    console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    // Return detailed error for debugging
    const errorMessage = error?.message || error?.toString() || "Internal server error";
    const errorDetails = {
      message: errorMessage,
      type: error?.constructor?.name || typeof error,
      ...(error?.code && { code: error.code }),
      ...(error?.status && { status: error.status }),
    };
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: errorDetails
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

