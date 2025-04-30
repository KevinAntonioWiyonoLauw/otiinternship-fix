"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AspirasiForm } from "./AspirasiForm";

interface AddAspirasiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void; // Add onSuccess prop
}

export function AddAspirasiDialog({ open, onOpenChange, onSuccess }: AddAspirasiDialogProps) {
  const handleSuccess = () => {
    // Close the dialog when the form is successfully submitted
    onOpenChange(false);
    // Call the onSuccess prop passed from the parent
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-[#0A0A0A]/90 backdrop-blur-lg border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Submit Aspirasi</DialogTitle>
          <DialogDescription className="text-gray-400">
            Share your feedback, suggestions, or concerns with the team
          </DialogDescription>
        </DialogHeader>
        <AspirasiForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}