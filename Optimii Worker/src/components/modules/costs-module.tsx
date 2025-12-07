"use client";

import { useState } from "react";
import { Plus, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModuleHeader, ModuleEmptyState } from "@/components/projects/module-tabs";
import { cn } from "@/lib/utils";

interface CostsModuleProps {
  moduleId: string;
  moduleName: string;
}

interface CostItem {
  id: string;
  category: string;
  description: string;
  estimatedAmount: number;
  actualAmount?: number;
  status: "estimated" | "quoted" | "approved" | "paid";
}

const mockCosts: CostItem[] = [
  { id: "1", category: "Architectural Fees", description: "Design and documentation", estimatedAmount: 45000, actualAmount: 42000, status: "paid" },
  { id: "2", category: "Engineering", description: "Structural engineering", estimatedAmount: 15000, actualAmount: 15500, status: "paid" },
  { id: "3", category: "Council Fees", description: "DA and approval fees", estimatedAmount: 8000, actualAmount: 7850, status: "paid" },
  { id: "4", category: "Surveys", description: "Site and boundary surveys", estimatedAmount: 3500, status: "approved" },
  { id: "5", category: "Consultants", description: "Energy and BAL assessments", estimatedAmount: 4500, status: "quoted" },
];

const statusConfig = {
  estimated: { label: "Estimated", className: "bg-gray-500/10 text-gray-600" },
  quoted: { label: "Quoted", className: "bg-blue-500/10 text-blue-600" },
  approved: { label: "Approved", className: "bg-yellow-500/10 text-yellow-600" },
  paid: { label: "Paid", className: "bg-green-500/10 text-green-600" },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CostsModule({ moduleId, moduleName }: CostsModuleProps) {
  const [costs] = useState(mockCosts);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalEstimated = costs.reduce((sum, c) => sum + c.estimatedAmount, 0);
  const totalActual = costs.reduce((sum, c) => sum + (c.actualAmount || 0), 0);
  const variance = totalActual - totalEstimated;
  const variancePercent = totalEstimated > 0 ? ((variance / totalEstimated) * 100).toFixed(1) : "0";

  if (costs.length === 0) {
    return (
      <>
        <ModuleHeader 
          title={moduleName}
          description="Track budget items, quotes, and expenses"
          actions={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Cost Item
            </Button>
          }
        />
        <ModuleEmptyState
          icon={DollarSign}
          title="No costs tracked"
          description="Add budget items to track estimated and actual costs for this phase."
          action={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Cost Item
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <ModuleHeader 
        title={moduleName}
        description="Track budget items, quotes, and expenses"
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Cost Item
          </Button>
        }
      />
      
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Estimated</p>
            <p className="text-2xl font-bold">{formatCurrency(totalEstimated)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Actual</p>
            <p className="text-2xl font-bold">{formatCurrency(totalActual)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Variance</p>
            <div className="flex items-center gap-2">
              <p className={cn(
                "text-2xl font-bold",
                variance > 0 ? "text-red-600" : "text-green-600"
              )}>
                {variance > 0 ? "+" : ""}{formatCurrency(variance)}
              </p>
              {variance !== 0 && (
                variance > 0 ? (
                  <TrendingUp className="h-5 w-5 text-red-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-green-600" />
                )
              )}
            </div>
            <p className="text-xs text-muted-foreground">{variancePercent}%</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Cost Items Table */}
      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Estimated</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actual</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {costs.map((cost) => {
                const status = statusConfig[cost.status];
                const itemVariance = cost.actualAmount 
                  ? cost.actualAmount - cost.estimatedAmount 
                  : null;
                
                return (
                  <tr key={cost.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{cost.category}</td>
                    <td className="px-4 py-3 text-muted-foreground">{cost.description}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(cost.estimatedAmount)}</td>
                    <td className="px-4 py-3 text-right">
                      {cost.actualAmount ? (
                        <span className={cn(
                          itemVariance && itemVariance > 0 ? "text-red-600" : 
                          itemVariance && itemVariance < 0 ? "text-green-600" : ""
                        )}>
                          {formatCurrency(cost.actualAmount)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="secondary" className={status.className}>
                        {status.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-medium">
                <td className="px-4 py-3" colSpan={2}>Total</td>
                <td className="px-4 py-3 text-right">{formatCurrency(totalEstimated)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(totalActual)}</td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}




