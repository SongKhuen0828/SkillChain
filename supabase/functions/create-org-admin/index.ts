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

// SMTP Email Sending Function
// Note: Deno Edge Functions have limitations with direct TCP/TLS connections
// This function supports multiple SMTP providers via HTTP API or direct SMTP
interface SMTPConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  html: string;
  useTLS: boolean;
}

async function sendEmailViaSMTP(config: SMTPConfig): Promise<boolean> {
  try {
    // Check if this is a Mailgun SMTP server (smtp.mailgun.org)
    // Mailgun supports both SMTP and HTTP API - we'll use HTTP API for reliability
    if (config.host.includes("mailgun.org") || config.host.includes("mailgun.com")) {
      // Extract domain from username (Mailgun format: postmaster@mg.yourdomain.com)
      const domainMatch = config.user.match(/@(.+)/);
      const domain = domainMatch ? domainMatch[1] : null;
      
      if (domain) {
        // Use Mailgun HTTP API (more reliable in Edge Functions)
        const mailgunApiKey = config.password; // Mailgun uses password as API key for SMTP
        const mailgunDomain = domain.replace("mg.", ""); // Remove mg. prefix if present
        
        const formData = new FormData();
        formData.append("from", `${config.fromName} <${config.from}>`);
        formData.append("to", config.to);
        formData.append("subject", config.subject);
        formData.append("html", config.html);
        
        const mailgunResponse = await fetch(
          `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
          {
            method: "POST",
            headers: {
              "Authorization": `Basic ${btoa(`api:${mailgunApiKey}`)}`,
            },
            body: formData,
          }
        );
        
        if (mailgunResponse.ok) {
          console.log("Email sent via Mailgun HTTP API");
          return true;
        } else {
          const errorText = await mailgunResponse.text();
          throw new Error(`Mailgun API error: ${errorText}`);
        }
      }
    }
    
    // For other SMTP providers, try using a simple HTTP-to-SMTP gateway
    // Or use SMTP2GO, which provides HTTP API
    if (config.host.includes("smtp2go.com") || config.host.includes("smtp2go")) {
      const smtp2goResponse = await fetch("https://api.smtp2go.com/v3/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: config.password, // SMTP2GO uses password as API key
          to: [config.to],
          sender: config.from,
          subject: config.subject,
          html_body: config.html,
        }),
      });
      
      if (smtp2goResponse.ok) {
        console.log("Email sent via SMTP2GO HTTP API");
        return true;
      } else {
        const errorText = await smtp2goResponse.text();
        throw new Error(`SMTP2GO API error: ${errorText}`);
      }
    }
    
    // For Gmail, Outlook, or other standard SMTP servers
    // Note: Direct SMTP in Deno Edge Functions is limited
    // We'll use a workaround: try to use the SMTP server's HTTP API if available
    // Otherwise, we'll need to use a service like EmailJS or similar
    
    // Gmail SMTP workaround: Use Gmail API (requires OAuth, complex)
    // For now, throw an error suggesting to use a service with HTTP API
    if (config.host.includes("gmail.com") || config.host.includes("smtp.gmail.com")) {
      throw new Error(
        "Gmail SMTP requires OAuth2. Please use Gmail API or a service like Mailgun/SendGrid. " +
        "Alternatively, use Gmail's 'App Password' with a service that supports SMTP-to-HTTP gateway."
      );
    }
    
    // For other SMTP servers, we can't directly connect in Edge Functions
    // Suggest using a service with HTTP API
    throw new Error(
      `Direct SMTP connections are not supported in Deno Edge Functions. ` +
      `Please use a service with HTTP API like Mailgun, SendGrid, or SMTP2GO. ` +
      `Your SMTP server: ${config.host}:${config.port}`
    );
  } catch (error: any) {
    console.error("SMTP error details:", error);
    throw error;
  }
}

// Generate beautiful HTML email
function generateWelcomeEmail(orgName: string, adminName: string, email: string, password: string, loginUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to SkillChain</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
          
          <!-- Header with gradient -->
          <tr>
            <td style="padding: 0;">
              <div style="background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%); padding: 40px; text-align: center;">
                <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 16px; padding: 16px 24px; margin-bottom: 20px;">
                  <span style="font-size: 32px;">🎓</span>
                </div>
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                  Welcome to SkillChain
                </h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
                  Your Organization Account is Ready
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi <strong style="color: #06b6d4;">${adminName || 'Admin'}</strong>,
              </p>
              
              <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Great news! Your organization <strong style="color: white;">${orgName}</strong> has been created on SkillChain. 
                You've been assigned as the Organization Administrator.
              </p>
              
              <!-- Credentials Card -->
              <div style="background: linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                <h3 style="color: #06b6d4; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                  🔐 Your Login Credentials
                </h3>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;">Email:</td>
                    <td style="padding: 8px 0; color: white; font-size: 14px; font-weight: 600;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;">Password:</td>
                    <td style="padding: 8px 0;">
                      <code style="background: rgba(6, 182, 212, 0.2); color: #06b6d4; padding: 4px 12px; border-radius: 6px; font-size: 14px; font-family: 'Courier New', monospace;">${password}</code>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Warning -->
              <div style="background: rgba(251, 191, 36, 0.1); border-left: 4px solid #fbbf24; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 30px;">
                <p style="color: #fbbf24; margin: 0; font-size: 14px;">
                  ⚠️ <strong>Important:</strong> Please change your password after your first login for security.
                </p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 10px 25px -5px rgba(6, 182, 212, 0.4);">
                  Login to Your Dashboard →
                </a>
              </div>
              
              <!-- Features -->
              <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 30px; margin-top: 30px;">
                <h3 style="color: white; margin: 0 0 20px 0; font-size: 16px;">What you can do as an Org Admin:</h3>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; vertical-align: top; width: 30px;">
                      <span style="font-size: 20px;">👥</span>
                    </td>
                    <td style="padding: 10px 0; color: #94a3b8; font-size: 14px;">
                      <strong style="color: white;">Manage Members</strong> - Invite learners and educators to join your organization
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; vertical-align: top;">
                      <span style="font-size: 20px;">📚</span>
                    </td>
                    <td style="padding: 10px 0; color: #94a3b8; font-size: 14px;">
                      <strong style="color: white;">Create Courses</strong> - Build and publish courses exclusive to your organization
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; vertical-align: top;">
                      <span style="font-size: 20px;">📊</span>
                    </td>
                    <td style="padding: 10px 0; color: #94a3b8; font-size: 14px;">
                      <strong style="color: white;">Track Progress</strong> - Monitor learning progress and completion rates
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; vertical-align: top;">
                      <span style="font-size: 20px;">🏆</span>
                    </td>
                    <td style="padding: 10px 0; color: #94a3b8; font-size: 14px;">
                      <strong style="color: white;">Issue Certificates</strong> - Award blockchain-verified certificates to learners
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: rgba(0,0,0,0.3); padding: 30px; text-align: center;">
              <p style="color: #64748b; font-size: 12px; margin: 0 0 10px 0;">
                This email was sent by SkillChain. If you didn't expect this email, please contact support.
              </p>
              <p style="color: #475569; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} SkillChain. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

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
    const loginUrl = `${req.headers.get("origin") || "https://skillchain.app"}/login`;

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

    // 5. Send welcome email (supports multiple providers)
    let emailSent = false;
    let emailError = null;
    let emailProvider = "none";
    
    const emailHtml = generateWelcomeEmail(
      orgName,
      contactName || "",
      contactEmail,
      tempPassword,
      loginUrl
    );
    
    const emailSubject = `🎉 Welcome to SkillChain - Your ${orgName} Account is Ready!`;
    
    // Try SendGrid first (if configured)
    const sendGridApiKey = Deno.env.get("SENDGRID_API_KEY");
    if (sendGridApiKey) {
      try {
        const fromEmail = Deno.env.get("SENDGRID_FROM_EMAIL") || "noreply@skillchain.app";
        const fromName = Deno.env.get("SENDGRID_FROM_NAME") || "SkillChain";
        
        const emailResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${sendGridApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [{
              to: [{ email: contactEmail }],
              subject: emailSubject,
            }],
            from: {
              email: fromEmail,
              name: fromName,
            },
            content: [{
              type: "text/html",
              value: emailHtml,
            }],
          }),
        });

        if (emailResponse.ok) {
          emailSent = true;
          emailProvider = "SendGrid";
          console.log("Welcome email sent successfully via SendGrid");
        } else {
          const errorText = await emailResponse.text();
          emailError = `SendGrid API error: ${errorText}`;
          console.error("Failed to send email via SendGrid:", errorText);
        }
      } catch (err) {
        emailError = `SendGrid error: ${err.message || "Unknown error"}`;
        console.error("Error sending email via SendGrid:", err);
      }
    }
    
    // Fallback to SMTP (if SendGrid failed or not configured)
    if (!emailSent) {
      const smtpHost = Deno.env.get("SMTP_HOST");
      const smtpUser = Deno.env.get("SMTP_USER");
      const smtpPassword = Deno.env.get("SMTP_PASSWORD");
      const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
      const smtpFrom = Deno.env.get("SMTP_FROM") || smtpUser || "noreply@skillchain.app";
      const smtpFromName = Deno.env.get("SMTP_FROM_NAME") || "SkillChain";
      const useTLS = Deno.env.get("SMTP_SECURE") !== "false"; // Default to true
      
      if (smtpHost && smtpUser && smtpPassword) {
        try {
          emailSent = await sendEmailViaSMTP({
            host: smtpHost,
            port: smtpPort,
            user: smtpUser,
            password: smtpPassword,
            from: smtpFrom,
            fromName: smtpFromName,
            to: contactEmail,
            subject: emailSubject,
            html: emailHtml,
            useTLS: useTLS,
          });
          
          if (emailSent) {
            emailProvider = "SMTP";
            console.log(`Welcome email sent successfully via SMTP (${smtpHost}:${smtpPort})`);
          } else {
            emailError = "SMTP connection failed";
          }
        } catch (err) {
          emailError = `SMTP error: ${err.message || "Unknown error"}`;
          console.error("Error sending email via SMTP:", err);
        }
      }
    }
    
    if (!emailSent && !emailError) {
      emailError = "No email service configured. Please set SENDGRID_API_KEY or SMTP credentials.";
      console.log("No email service configured, skipping email");
    }

    return new Response(
      JSON.stringify({
        success: true,
        organization: orgData,
        user: {
          id: userId,
          email: contactEmail,
          tempPassword: tempPassword, // Return password so admin can share it if email fails
        },
        emailSent,
        emailProvider: emailProvider,
        emailError: emailError || null,
        message: emailSent 
          ? `Organization created and welcome email sent via ${emailProvider}!` 
          : emailError 
            ? `Organization created. Email failed: ${emailError}. Please share credentials manually.`
            : "Organization created. Email service not configured. Please share the login credentials manually.",
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

