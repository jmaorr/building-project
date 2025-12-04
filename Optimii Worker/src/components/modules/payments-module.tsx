"use client";

import { useState } from "react";
import { Plus, Receipt, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModuleHeader, ModuleEmptyState } from "@/components/projects/module-tabs";
import { cn } from "@/lib/utils";

interface PaymentsModuleProps {
  moduleId: string;
  moduleName: string;
}

interface Payment {
  id: string;
  description: string;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: "draft" | "pending" | "paid" | "overdue";
  invoiceNumber?: string;
  contactName: string;
}

const mockPayments: Payment[] = [
  { id: "1", description: "Design Documentation - Stage 1", amount: 15000, dueDate: new Date("2024-01-15"), paidDate: new Date("2024-01-14"), status: "paid", invoiceNumber: "INV-001", contactName: "Design Studio Architecture" },
  { id: "2", description: "Design Documentation - Stage 2", amount: 15000, dueDate: new Date("2024-02-15"), paidDate: new Date("2024-02-15"), status: "paid", invoiceNumber: "INV-002", contactName: "Design Studio Architecture" },
  { id: "3", description: "Structural Engineering", amount: 8000, dueDate: new Date("2024-02-28"), status: "pending", invoiceNumber: "INV-003", contactName: "Structural Engineering Solutions" },
  { id: "4", description: "Design Documentation - Final", amount: 12000, dueDate: new Date("2024-03-15"), status: "pending", contactName: "Design Studio Architecture" },
];

const statusConfig = {
  draft: { label: "Draft", className: "bg-gray-500/10 text-gray-600", icon: Receipt },
  pending: { label: "Pending", className: "bg-yellow-500/10 text-yellow-600", icon: Calendar },
  paid: { label: "Paid", className: "bg-green-500/10 text-green-600", icon: CheckCircle2 },
  overdue: { label: "Overdue", className: "bg-red-500/10 text-red-600", icon: AlertCircle },
};

export function PaymentsModule({ moduleId, moduleName }: PaymentsModuleProps) {
  const [payments] = useState(mockPayments);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const paidAmount = payments.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = payments.filter(p => p.status === "pending" || p.status === "overdue").reduce((sum, p) => sum + p.amount, 0);

  if (payments.length === 0) {
    return (
      <>
        <ModuleHeader 
          title={moduleName}
          description="Track invoices and payment status"
          actions={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Payment
            </Button>
          }
        />
        <ModuleEmptyState
          icon={Receipt}
          title="No payments recorded"
          description="Track invoices and payments to monitor cash flow for this phase."
          action={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Payment
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
        description="Track invoices and payment status"
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Payment
          </Button>
        }
      />
      
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Paid</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(pendingAmount)}</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Payments List */}
      <div className="space-y-3">
        {payments.map((payment) => {
          const status = statusConfig[payment.status];
          const StatusIcon = status.icon;
          
          return (
            <Card key={payment.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  payment.status === "paid" ? "bg-green-500/10" :
                  payment.status === "overdue" ? "bg-red-500/10" : "bg-muted"
                )}>
                  <StatusIcon className={cn(
                    "h-5 w-5",
                    payment.status === "paid" ? "text-green-600" :
                    payment.status === "overdue" ? "text-red-600" : "text-muted-foreground"
                  )} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{payment.description}</p>
                    {payment.invoiceNumber && (
                      <span className="text-sm text-muted-foreground">
                        #{payment.invoiceNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {payment.contactName} • Due {formatDate(payment.dueDate)}
                  </p>
                </div>
                
                <div className="text-right shrink-0">
                  <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                  <Badge variant="secondary" className={status.className}>
                    {status.label}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}




