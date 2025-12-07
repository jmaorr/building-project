"use server";

import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createDb, type D1Database } from "@/lib/db";
import { payments, stages, phases, contacts, generateId } from "@/lib/db/schema";
import { getD1Database } from "@/lib/cloudflare/get-env";
import type { Payment, NewPayment } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { canEditProject } from "@/lib/auth/permissions";

// =============================================================================
// PAYMENT ACTIONS
// =============================================================================

export async function getStagePayments(stageId: string): Promise<(Payment & { contactName: string | null })[]> {
    try {
        const d1 = await getD1Database() as D1Database | null;
        if (!d1) return [];

        const db = createDb(d1);
        const results = await db.select({
            payment: payments,
            contactName: contacts.name,
        })
            .from(payments)
            .leftJoin(contacts, eq(payments.contactId, contacts.id))
            .where(eq(payments.stageId, stageId))
            .orderBy(desc(payments.createdAt));

        return results.map(({ payment, contactName }) => ({
            ...payment,
            contactName,
        }));
    } catch (error) {
        console.error("Error fetching payments:", error);
        return [];
    }
}

export async function createPayment(data: {
    projectId: string;
    stageId: string;
    contactId: string;
    description: string;
    amount: number;
    dueDate?: Date;
    invoiceNumber?: string;
    notes?: string;
}): Promise<Payment> {
    const d1 = await getD1Database() as D1Database | null;
    if (!d1) throw new Error("D1 database not available");

    const user = await getCurrentUser();
    if (!user) throw new Error("You must be signed in to create payments");

    if (!await canEditProject(data.projectId)) {
        throw new Error("Unauthorized: You do not have permission to create payments");
    }

    const db = createDb(d1);

    // Verify stage exists
    const stage = await db.select().from(stages).where(eq(stages.id, data.stageId)).get();
    if (!stage) throw new Error("Stage not found");

    const now = new Date();
    const paymentId = generateId();

    const newPayment: NewPayment = {
        id: paymentId,
        stageId: data.stageId,
        moduleId: null, // Deprecated
        contactId: data.contactId,
        description: data.description,
        amount: data.amount,
        dueDate: data.dueDate || null,
        paidDate: null,
        status: "pending",
        invoiceNumber: data.invoiceNumber || null,
        invoiceUrl: null,
        notes: data.notes || null,
        roundNumber: stage.currentRound,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
    };

    await db.insert(payments).values(newPayment);

    const result = await db.select().from(payments).where(eq(payments.id, paymentId)).get();
    if (!result) throw new Error("Failed to create payment");

    revalidatePath(`/projects/${data.projectId}`);
    return result;
}

export async function updatePayment(id: string, data: Partial<NewPayment>): Promise<Payment | null> {
    try {
        const d1 = await getD1Database() as D1Database | null;
        if (!d1) return null;

        const db = createDb(d1);

        // Get payment to check permissions
        const payment = await db.select().from(payments).where(eq(payments.id, id)).get();
        if (!payment) return null;

        const stage = await db.select().from(stages).where(eq(stages.id, payment.stageId)).get();
        if (!stage) return null;

        const phase = await db.select().from(phases).where(eq(phases.id, stage.phaseId)).get();
        if (!phase) return null;

        if (!await canEditProject(phase.projectId)) {
            throw new Error("Unauthorized: You do not have permission to update payments");
        }

        const result = await db.update(payments)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(payments.id, id))
            .returning()
            .get();

        revalidatePath(`/projects/${phase.projectId}`);
        return result || null;
    } catch (error) {
        console.error("Error updating payment:", error);
        return null;
    }
}

export async function deletePayment(id: string): Promise<boolean> {
    try {
        const d1 = await getD1Database() as D1Database | null;
        if (!d1) return false;

        const db = createDb(d1);

        // Get payment to check permissions
        const payment = await db.select().from(payments).where(eq(payments.id, id)).get();
        if (!payment) return false;

        const stage = await db.select().from(stages).where(eq(stages.id, payment.stageId)).get();
        if (!stage) return false;

        const phase = await db.select().from(phases).where(eq(phases.id, stage.phaseId)).get();
        if (!phase) return false;

        if (!await canEditProject(phase.projectId)) {
            return false;
        }

        const result = await db.delete(payments).where(eq(payments.id, id)).returning().get();

        if (result) {
            revalidatePath(`/projects/${phase.projectId}`);
        }

        return !!result;
    } catch (error) {
        console.error("Error deleting payment:", error);
        return false;
    }
}

export async function markPaymentAsPaid(id: string, paidDate: Date = new Date()): Promise<Payment | null> {
    return updatePayment(id, {
        status: "paid",
        paidDate,
    });
}
