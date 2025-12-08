import { NextRequest, NextResponse } from "next/server";
import { getProjects } from "@/lib/actions/projects";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") as any;

    const projects = await getProjects({
      search,
      status,
      includeShared: true,
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

