import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { getD1Database } from "@/lib/cloudflare/get-env";
import { createDb, schema, type D1Database } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Debug endpoint - GET /api/webhooks/clerk
export async function GET() {
  const results: Record<string, unknown> = {};
  
  try {
    // Try getCloudflareContext
    try {
      const ctx = await getCloudflareContext({ async: true });
      results.hasContext = !!ctx;
      results.hasEnv = !!ctx?.env;
      results.envKeys = ctx?.env ? Object.keys(ctx.env) : [];
      results.hasDB = !!(ctx?.env as Record<string, unknown>)?.DB;
      
      const db = (ctx?.env as Record<string, unknown>)?.DB;
      if (db) {
        results.dbType = typeof db;
        const testResult = await (db as D1Database).prepare("SELECT 1 as test").first();
        results.dbTest = testResult;
        results.dbWorks = true;
      }
    } catch (ctxErr) {
      results.contextError = String(ctxErr);
    }
    
    // Also try getD1Database
    try {
      const d1 = await getD1Database();
      results.getD1DatabaseResult = d1 ? "got binding" : "null";
    } catch (d1Err) {
      results.getD1DatabaseError = String(d1Err);
    }
    
  } catch (err) {
    results.error = String(err);
  }
  
  return NextResponse.json(results);
}

export async function POST(req: Request) {
  // Get the webhook secret from environment variables
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET");
    return new Response("Missing webhook secret", { status: 500 });
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error verifying webhook", { status: 400 });
  }

  // Handle the webhook
  const eventType = evt.type;

  // =============================================================================
  // USER.CREATED - Create user record and personal organization
  // =============================================================================
  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    
    const primaryEmail = email_addresses.find(e => e.id === evt.data.primary_email_address_id)?.email_address;
    
    if (!primaryEmail) {
      console.error("No primary email found for user:", id);
      return new Response("No primary email found", { status: 400 });
    }

    // userType is no longer required - users get an org automatically without role selection

    try {
      const d1 = await getD1Database() as D1Database | null;
      if (!d1) {
        console.error("D1 database not available");
        return new Response("Database not available", { status: 500 });
      }

      const db = createDb(d1);
      const now = new Date();

      // Check if user already exists (by clerkId)
      const existingUser = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.clerkId, id))
        .get();

      if (existingUser) {
        console.log("User already exists:", id);
        return new Response("User already exists", { status: 200 });
      }

      // Create the user record
      const userId = crypto.randomUUID();
      const newUser = {
        id: userId,
        clerkId: id,
        email: primaryEmail,
        firstName: first_name || null,
        lastName: last_name || null,
        avatarUrl: image_url || null,
        userType: null, // No longer required - can be set later via tags if needed
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(schema.users).values(newUser).run();
      console.log("Created user:", userId);

      // Create a personal organization for the user
      const orgId = crypto.randomUUID();
      const orgName = first_name && last_name
        ? `${first_name} ${last_name}`
        : first_name
        ? first_name
        : primaryEmail.split("@")[0] || "My Organization";

      await db.insert(schema.organizations).values({
        id: orgId,
        name: orgName,
        createdAt: now,
        updatedAt: now,
      }).run();

      // Add user as owner of their personal organization
      await db.insert(schema.organizationMembers).values({
        id: crypto.randomUUID(),
        orgId: orgId,
        userId: userId,
        role: "owner",
        createdAt: now,
      }).run();

      console.log("Created personal org:", orgId, "for user:", userId);

      // Merge contacts: find all contacts with this email across all organizations
      const matchingContacts = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.email, primaryEmail))
        .all();

      if (matchingContacts.length > 0) {
        console.log(`Found ${matchingContacts.length} contacts to merge for email:`, primaryEmail);

        // Link each contact to this user
        for (const contact of matchingContacts) {
          await db
            .update(schema.contacts)
            .set({ 
              userId: userId,
              updatedAt: now,
            })
            .where(eq(schema.contacts.id, contact.id))
            .run();

          console.log("Linked contact:", contact.id, "to user:", userId);
        }
      }

      // Check for pending org invites for this email
      const pendingInvites = await db
        .select()
        .from(schema.orgInvites)
        .where(eq(schema.orgInvites.email, primaryEmail.toLowerCase()))
        .all();

      if (pendingInvites.length > 0) {
        console.log(`Found ${pendingInvites.length} pending org invites for:`, primaryEmail);
      }

      // Check for pending project shares for this user's org
      // (these would be created after user signs up via project sharing)

      return new Response("User created with personal organization", { status: 200 });

    } catch (error) {
      console.error("Error processing user.created webhook:", error);
      return new Response("Error processing webhook", { status: 500 });
    }
  }

  // =============================================================================
  // USER.UPDATED - Update user record
  // =============================================================================
  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    
    const primaryEmail = email_addresses.find(e => e.id === evt.data.primary_email_address_id)?.email_address;

    try {
      const d1 = await getD1Database() as D1Database | null;
      if (!d1) {
        return new Response("Database not available", { status: 500 });
      }

      const db = createDb(d1);

      // Find the user by clerkId
      const existingUser = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.clerkId, id))
        .get();

      if (!existingUser) {
        console.log("User not found for update:", id);
        return new Response("User not found", { status: 404 });
      }

      // Update the user record (userType is preserved, not updated from metadata)
      await db
        .update(schema.users)
        .set({
          email: primaryEmail || existingUser.email,
          firstName: first_name || null,
          lastName: last_name || null,
          avatarUrl: image_url || null,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.clerkId, id))
        .run();

      console.log("Updated user:", id);

      return new Response("User updated", { status: 200 });

    } catch (error) {
      console.error("Error processing user.updated webhook:", error);
      return new Response("Error processing webhook", { status: 500 });
    }
  }

  // =============================================================================
  // USER.DELETED - Delete user and clean up
  // =============================================================================
  if (eventType === "user.deleted") {
    const { id } = evt.data;

    try {
      const d1 = await getD1Database() as D1Database | null;
      if (!d1) {
        return new Response("Database not available", { status: 500 });
      }

      const db = createDb(d1);

      const existingUser = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.clerkId, id!))
        .get();

      if (existingUser) {
        // Unlink contacts
        await db
          .update(schema.contacts)
          .set({ userId: null, updatedAt: new Date() })
          .where(eq(schema.contacts.userId, existingUser.id))
          .run();

        // Note: We don't delete the user's org or memberships here
        // as they might want to retain org data. This could be a policy decision.
        // For now, we just delete the user record.

        // Delete user
        await db
          .delete(schema.users)
          .where(eq(schema.users.clerkId, id!))
          .run();

        console.log("Deleted user:", id);
      }

      return new Response("User deleted", { status: 200 });

    } catch (error) {
      console.error("Error processing user.deleted webhook:", error);
      return new Response("Error processing webhook", { status: 500 });
    }
  }

  // =============================================================================
  // ORGANIZATION EVENTS (for Clerk Organizations integration)
  // =============================================================================
  
  // Handle organization.created from Clerk
  if (eventType === "organization.created") {
    const { id, name, slug, image_url, public_metadata } = evt.data;

    try {
      const d1 = await getD1Database() as D1Database | null;
      if (!d1) {
        return new Response("Database not available", { status: 500 });
      }

      const db = createDb(d1);
      const now = new Date();

      // Check if org already exists
      const existingOrg = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, id))
        .get();

      if (existingOrg) {
        console.log("Organization already exists:", id);
        return new Response("Organization already exists", { status: 200 });
      }

      // Create organization synced from Clerk
      await db.insert(schema.organizations).values({
        id: id,
        name: name,
        logoUrl: image_url || null,
        accentColor: (public_metadata?.accentColor as string) || "#5e6ad2",
        createdAt: now,
        updatedAt: now,
      }).run();

      console.log("Created organization from Clerk:", id, name);

      return new Response("Organization created", { status: 200 });

    } catch (error) {
      console.error("Error processing organization.created webhook:", error);
      return new Response("Error processing webhook", { status: 500 });
    }
  }

  // Handle organizationMembership.created from Clerk
  if (eventType === "organizationMembership.created") {
    const { organization, public_user_data, role } = evt.data;

    try {
      const d1 = await getD1Database() as D1Database | null;
      if (!d1) {
        return new Response("Database not available", { status: 500 });
      }

      const db = createDb(d1);
      const now = new Date();

      // Find our user by their Clerk ID
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.clerkId, public_user_data.user_id))
        .get();

      if (!user) {
        console.log("User not found for membership:", public_user_data.user_id);
        return new Response("User not found", { status: 404 });
      }

      // Map Clerk role to our role
      const ourRole = role === "org:admin" ? "admin" : "member";

      // Check if membership already exists
      const existingMembership = await db
        .select()
        .from(schema.organizationMembers)
        .where(
          and(
            eq(schema.organizationMembers.orgId, organization.id),
            eq(schema.organizationMembers.userId, user.id)
          )
        )
        .get();

      if (existingMembership) {
        // Update role if changed
        await db
          .update(schema.organizationMembers)
          .set({ role: ourRole })
          .where(eq(schema.organizationMembers.id, existingMembership.id))
          .run();
        console.log("Updated membership for user:", user.id, "in org:", organization.id);
      } else {
        // Create new membership
        await db.insert(schema.organizationMembers).values({
          id: crypto.randomUUID(),
          orgId: organization.id,
          userId: user.id,
          role: ourRole,
          createdAt: now,
        }).run();
        console.log("Created membership for user:", user.id, "in org:", organization.id);
      }

      return new Response("Organization membership created", { status: 200 });

    } catch (error) {
      console.error("Error processing organizationMembership.created webhook:", error);
      return new Response("Error processing webhook", { status: 500 });
    }
  }

  // Handle organizationMembership.deleted from Clerk
  if (eventType === "organizationMembership.deleted") {
    const { organization, public_user_data } = evt.data;

    try {
      const d1 = await getD1Database() as D1Database | null;
      if (!d1) {
        return new Response("Database not available", { status: 500 });
      }

      const db = createDb(d1);

      // Find our user
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.clerkId, public_user_data.user_id))
        .get();

      if (user) {
        // Delete the membership
        await db
          .delete(schema.organizationMembers)
          .where(
            and(
              eq(schema.organizationMembers.orgId, organization.id),
              eq(schema.organizationMembers.userId, user.id)
            )
          )
          .run();

        console.log("Deleted membership for user:", user.id, "in org:", organization.id);
      }

      return new Response("Organization membership deleted", { status: 200 });

    } catch (error) {
      console.error("Error processing organizationMembership.deleted webhook:", error);
      return new Response("Error processing webhook", { status: 500 });
    }
  }

  // Return 200 for unhandled events
  return new Response("Webhook received", { status: 200 });
}
