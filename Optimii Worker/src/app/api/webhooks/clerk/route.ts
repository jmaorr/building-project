import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { getD1Database } from "@/lib/cloudflare/get-env";
import { createDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import type { UserType } from "@/lib/db/schema";

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

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url, unsafe_metadata } = evt.data;
    
    const primaryEmail = email_addresses.find(e => e.id === evt.data.primary_email_address_id)?.email_address;
    
    if (!primaryEmail) {
      console.error("No primary email found for user:", id);
      return new Response("No primary email found", { status: 400 });
    }

    // Get user type from unsafe_metadata (set during signup)
    const userType = (unsafe_metadata?.userType as UserType) || null;

    try {
      const d1 = getD1Database();
      if (!d1) {
        console.error("D1 database not available");
        return new Response("Database not available", { status: 500 });
      }

      const db = createDb(d1);

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
      const newUser = {
        id: crypto.randomUUID(),
        clerkId: id,
        email: primaryEmail,
        firstName: first_name || null,
        lastName: last_name || null,
        avatarUrl: image_url || null,
        userType,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(schema.users).values(newUser).run();

      console.log("Created user:", newUser.id, "with type:", userType);

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
              userId: newUser.id,
              updatedAt: new Date(),
            })
            .where(eq(schema.contacts.id, contact.id))
            .run();

          console.log("Linked contact:", contact.id, "to user:", newUser.id);
        }
      }

      return new Response("User created and contacts merged", { status: 200 });

    } catch (error) {
      console.error("Error processing user.created webhook:", error);
      return new Response("Error processing webhook", { status: 500 });
    }
  }

  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url, unsafe_metadata } = evt.data;
    
    const primaryEmail = email_addresses.find(e => e.id === evt.data.primary_email_address_id)?.email_address;

    try {
      const d1 = getD1Database();
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

      // Update user type if it was set in metadata
      const userType = (unsafe_metadata?.userType as UserType) || existingUser.userType;

      // Update the user record
      await db
        .update(schema.users)
        .set({
          email: primaryEmail || existingUser.email,
          firstName: first_name || null,
          lastName: last_name || null,
          avatarUrl: image_url || null,
          userType,
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

  if (eventType === "user.deleted") {
    const { id } = evt.data;

    try {
      const d1 = getD1Database();
      if (!d1) {
        return new Response("Database not available", { status: 500 });
      }

      const db = createDb(d1);

      // Soft delete: unlink from contacts but keep user record
      // Or hard delete depending on requirements
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

  // Return 200 for unhandled events
  return new Response("Webhook received", { status: 200 });
}

