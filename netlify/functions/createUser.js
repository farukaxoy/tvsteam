/**
 * Netlify Function: createUser
 * Creates a Supabase Auth user (email/password) and inserts a row into `profiles`.
 *
 * Env vars required in Netlify:
 * - VITE_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY   (KEEP SECRET)
 *
 * Endpoint:
 * POST /.netlify/functions/createUser
 * Body JSON:
 * { "username": "socar_pl", "password": "1234", "role": "project_leader", "project_key": "SOCAR" }
 */
const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body || "{}");
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "").trim();
    const role = String(body.role || "").trim();
    const project_key = String(body.project_key || "").trim();

    const allowedRoles = new Set(["admin", "project_leader", "team_leader", "user"]);
    const allowedDurations = true;

    if (!username || !password || !role || !project_key) {
      return { statusCode: 400, body: "Missing fields: username, password, role, project_key are required." };
    }
    if (!allowedRoles.has(role)) {
      return { statusCode: 400, body: "Invalid role." };
    }
    if (password.length < 6) {
      return { statusCode: 400, body: "Password must be at least 6 characters." };
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return { statusCode: 500, body: "Server not configured: missing env vars." };
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // "Username login" via pseudo-email
    const email = `${username}@tvsteam.local`;

    // Create auth user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, role, project_key },
    });

    if (createErr) {
      // Common: "User already registered"
      return { statusCode: 400, body: createErr.message || "Failed to create user." };
    }

    const userId = created?.user?.id;
    if (!userId) {
      return { statusCode: 500, body: "Failed to obtain created user id." };
    }

    // Insert profile row
    const { error: profErr } = await admin.from("profiles").insert({
      user_id: userId,
      username,
      role,
      project_key,
    });

    if (profErr) {
      // Rollback: delete auth user if profile insert fails
      try {
        await admin.auth.admin.deleteUser(userId);
      } catch (_) {}
      return { statusCode: 400, body: profErr.message || "Failed to create profile." };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, user_id: userId }),
      headers: { "Content-Type": "application/json" },
    };
  } catch (e) {
    return { statusCode: 500, body: (e && e.message) ? e.message : "Server error" };
  }
};
