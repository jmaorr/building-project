"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Receipt, Calendar, AlertCircle, CheckCircle2, Loader2, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StageHeader, StageEmptyState } from "@/components/projects/stage-tabs";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { getStagePayments, createPayment, deletePayment, markPaymentAsPaid } from "@/lib/actions/payments";
import { getProjectContacts } from "@/lib/actions/contacts";
import type { Payment, Contact } from "@/lib/db/schema";

interface PaymentsStageProps {
  stageId: string;
  stageName: string;
  projectId: string;
}

type PaymentWithContact = Payment & { contactName: string | null };

const statusConfig = {
  draft: { label: "Draft", className: "bg-gray-500/10 text-gray-600", icon: Receipt },
  pending: { label: "Pending", className: "bg-yellow-500/10 text-yellow-600", icon: Calendar },
  paid: { label: "Paid", className: "bg-green-500/10 text-green-600", icon: CheckCircle2 },
  overdue: { label: "Overdue", className: "bg-red-500/10 text-red-600", icon: AlertCircle },
  cancelled: { label: "Cancelled", className: "bg-gray-500/10 text-gray-600", icon: AlertCircle },
};

export function PaymentsStage({ stageId, stageName, projectId }: PaymentsStageProps) {
  const [payments, setPayments] = useState<PaymentWithContact[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // New payment form state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [contactId, setContactId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [paymentsData, contactsData] = await Promise.all([
        getStagePayments(stageId),
        getProjectContacts(projectId),
      ]);
      setPayments(paymentsData);
      setContacts(contactsData.map(c => c.contact));
    } catch (error) {
      console.error("Failed to load data:", error);
      toast({
        title: "Error",
        description: "Failed to load payments data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [stageId, projectId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || !contactId) return;

    setIsCreating(true);
    try {
      await createPayment({
        projectId,
        stageId,
        contactId,
        description,
        amount: parseFloat(amount),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        invoiceNumber: invoiceNumber || undefined,
      });

      setDescription("");
      setAmount("");
      setDueDate("");
      setContactId("");
      setInvoiceNumber("");
      setIsDialogOpen(false);
      loadData();

      toast({
        title: "Success",
        description: "Payment created successfully.",
      });
    } catch (error) {
      console.error("Failed to create payment:", error);
      toast({
        title: "Error",
        description: "Failed to create payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payment?")) return;

    // Optimistic update
    setPayments(payments.filter(p => p.id !== id));

    try {
      await deletePayment(id);
      toast({
        title: "Success",
        description: "Payment deleted successfully.",
      });
    } catch (error) {
      console.error("Failed to delete payment:", error);
      loadData(); // Revert
      toast({
        title: "Error",
        description: "Failed to delete payment.",
        variant: "destructive",
      });
    }
  };

  const handleMarkPaid = async (id: string) => {
    // Optimistic update
    setPayments(payments.map(p => p.id === id ? { ...p, status: "paid", paidDate: new Date() } : p));

    try {
      await markPaymentAsPaid(id);
      toast({
        title: "Success",
        description: "Payment marked as paid.",
      });
    } catch (error) {
      console.error("Failed to update payment:", error);
      loadData(); // Revert
      toast({
        title: "Error",
        description: "Failed to update payment status.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date?: Date | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  };

  const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const paidAmount = payments.filter(p => p.status === "paid").reduce((sum, p) => sum + (p.amount || 0), 0);
  const pendingAmount = payments.filter(p => p.status === "pending" || p.status === "overdue").reduce((sum, p) => sum + (p.amount || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const AddPaymentDialog = () => (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Payment</DialogTitle>
          <DialogDescription>
            Record a new invoice or payment request.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreatePayment}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Initial Deposit"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact">Payee</Label>
              <Select value={contactId} onValueChange={setContactId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select payee" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name} {contact.company ? `(${contact.company})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invoiceNumber">Invoice Number (Optional)</Label>
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g., INV-001"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  if (payments.length === 0) {
    return (
      <>
        <StageHeader
          title={stageName}
          description="Track invoices and payment status"
          actions={<AddPaymentDialog />}
        />
        <StageEmptyState
          icon={Receipt}
          title="No payments recorded"
          description="Track invoices and payments to monitor cash flow for this phase."
          action={<Button onClick={() => setIsDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Payment</Button>}
        />
        <AddPaymentDialog />
      </>
    );
  }

  return (
    <>
      <StageHeader
        title={stageName}
        description="Track invoices and payment status"
        actions={<AddPaymentDialog />}
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
          const status = statusConfig[payment.status as keyof typeof statusConfig] || statusConfig.pending;
          const StatusIcon = status.icon;

          return (
            <Card key={payment.id} className="group">
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
                    {payment.contactName || "Unknown Payee"} • Due {formatDate(payment.dueDate)}
                  </p>
                </div>

                <div className="text-right shrink-0 flex items-center gap-4">
                  <div>
                    <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                    <Badge variant="secondary" className={status.className}>
                      {status.label}
                    </Badge>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {payment.status !== "paid" && (
                        <DropdownMenuItem onClick={() => handleMarkPaid(payment.id)}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Mark as Paid
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDeletePayment(payment.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}




