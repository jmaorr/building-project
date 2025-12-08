"use client"

import {
    Toast,
    ToastClose,
    ToastDescription,
    ToastProvider,
    ToastTitle,
    ToastViewport,
    type ToastProps,
    type ToastActionElement,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { CheckCircle2 } from "lucide-react"

export function Toaster() {
    const { toasts } = useToast()

    return (
        <ToastProvider>
            {toasts.map(function (toast) {
                const { id, title, description, action, variant, ...props } = toast;
                return (
                    <Toast key={id} variant={variant || undefined} {...props}>
                        <div className="grid gap-1">
                            <div className="flex items-center gap-2">
                                {variant === "success" && (
                                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                                )}
                                {title && <ToastTitle>{title}</ToastTitle>}
                            </div>
                            {description && (
                                <ToastDescription>{description}</ToastDescription>
                            )}
                        </div>
                        {action}
                        <ToastClose />
                    </Toast>
                )
            })}
            <ToastViewport />
        </ToastProvider>
    )
}
