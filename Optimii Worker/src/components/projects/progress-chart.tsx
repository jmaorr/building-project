"use client";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { RadialBar, RadialBarChart, LabelList } from "recharts";

interface PhaseProgress {
  phase: {
    id: string;
    name: string;
  };
  progress: number;
  completed: number;
  total: number;
}

interface ProgressChartProps {
  phases: PhaseProgress[];
}

export function ProgressChart({ phases }: ProgressChartProps) {
  if (phases.length === 0) {
    return null;
  }

  // Get phase key for color mapping
  const getPhaseKey = (phaseName: string): "design" | "build" | "cert" => {
    const name = phaseName.toLowerCase();
    if (name.includes("build") || name.includes("construction")) {
      return "build";
    } else if (name.includes("cert") || name.includes("certification")) {
      return "cert";
    }
    return "design";
  };

  const chartData = phases.map(({ phase, progress, completed, total }) => {
    const key = getPhaseKey(phase.name);
    return {
      phase: phase.name,
      progress: progress, // This is already a percentage (0-100)
      completed,
      total,
      fill: `var(--color-${key})`,
    };
  });

  const chartConfig = {
    progress: {
      label: "Progress",
    },
    design: {
      label: "Design",
      color: "hsl(var(--chart-1))",
    },
    build: {
      label: "Build",
      color: "hsl(var(--chart-2))",
    },
    cert: {
      label: "Certification",
      color: "hsl(var(--chart-3))",
    },
  } satisfies import("@/components/ui/chart").ChartConfig;

  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square max-h-[200px]"
    >
      <RadialBarChart
        data={chartData}
        startAngle={-90}
        endAngle={380}
        innerRadius={30}
        outerRadius={90}
      >
        <ChartTooltip
          cursor={false}
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            const data = payload[0].payload as typeof chartData[0];
            return (
              <ChartTooltipContent hideLabel>
                <div className="space-y-1">
                  <div className="font-medium">{data.phase}</div>
                  <div className="text-sm text-muted-foreground">
                    {data.completed}/{data.total} steps ({data.progress}%)
                  </div>
                </div>
              </ChartTooltipContent>
            );
          }}
        />
        <RadialBar dataKey="progress" background>
          <LabelList
            position="insideStart"
            dataKey="phase"
            className="fill-white capitalize mix-blend-luminosity"
            fontSize={11}
          />
        </RadialBar>
      </RadialBarChart>
    </ChartContainer>
  );
}

