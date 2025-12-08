import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

/**
 * GET /api/organization
 * Returns the current user's active organization
 */
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const organization = await getActiveOrganization();
    
    return NextResponse.json({ organization });
  } catch (error) {
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization" },
      { status: 500 }
    );
  }
}




