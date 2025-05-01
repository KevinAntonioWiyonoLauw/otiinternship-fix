"use client";

import { toast } from "@/components/ui/use-toast";

interface ToastProps {
  title: string;
  description: string;
  variant: "success" | "error";
}

export const showToast = ({ title, description, variant }: ToastProps) => {
  toast({
    title,
    description,
    variant,
  });
}; 