"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Trash2, MessageSquare, User, UserX } from "lucide-react";
import { Aspirasi } from "@/types/aspirasi";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AspirasiCardProps {
  aspirasi: Aspirasi;
  isAdmin?: boolean;
  onDelete?: (id: number) => Promise<void>;
  containerHeight?: string;
  containerWidth?: string;
  scaleOnHover?: number;
  rotateAmplitude?: number;
}

export function AspirasiCard({
  aspirasi,
  isAdmin = false,
  onDelete,
  containerHeight = "auto", // Mengubah default menjadi auto untuk menyesuaikan tinggi dengan konten
  containerWidth = "100%",
  scaleOnHover = 1.05,
  rotateAmplitude = 0,
}: AspirasiCardProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const isAnonymous = aspirasi.senderId === null || aspirasi.senderId === "anonymous";

  // Random rotation for visual effect if rotateAmplitude is set
  const randomRotate = rotateAmplitude 
    ? Math.random() * rotateAmplitude * 2 - rotateAmplitude 
    : 0;

  const handleDelete = async () => {
    if (!onDelete) return;
    
    try {
      setIsDeleting(true);
      await onDelete(aspirasi.id);
      setShowDeleteDialog(false);
    } catch (error) {
      // Error is handled in onDelete
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "MMM d, yyyy 'at' HH:mm");
    } catch (error) {
      return dateString;
    }
  };

  return (
    <>
      <div
        className="bg-[#1A1A1A]/30 rounded-xl p-6 border border-white/10 
          transition-all duration-300 relative overflow-hidden flex flex-col"
        style={{
          height: containerHeight,
          width: containerWidth,
          transform: `rotate(${randomRotate}deg) scale(${isHovering ? scaleOnHover : 1})`,
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Card Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-200 break-words">{aspirasi.subject}</h3>
            <p className="text-sm text-gray-400">To: {aspirasi.target}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="p-2 rounded-full bg-[#FE7F00]/10 text-[#FE7F00]">
              <MessageSquare size={16} />
            </div>
          </div>
        </div>

        {/* Card Content */}
        <div className="mb-4 flex-grow">
          <p className="text-gray-300 break-words whitespace-pre-wrap">{aspirasi.message}</p>
        </div>

        {/* Card Footer */}
        <div className="flex justify-between items-center mt-auto text-sm text-gray-400">
          <div className="flex items-center gap-1">
            {isAnonymous ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <UserX size={14} className="text-gray-500" />
                    <span className="ml-1">Anonymous</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This feedback was submitted anonymously</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <div className="flex items-center">
                <User size={14} />
                <span className="ml-1">User</span>
              </div>
            )}
          </div>
          <span>{formatDate(aspirasi.createdAt)}</span>
        </div>

        {/* Delete Button (Admin only) */}
        {isAdmin && onDelete && (
          <div 
            className={`absolute top-3 right-3 transition-opacity duration-300 ${
              isHovering ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      
        <AlertDialogContent className="border-none">
        <div className="bg-[#1F1F1F] width-full p-6 rounded border border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This aspirasi will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
          </div>
        </AlertDialogContent>

      </AlertDialog>

    </>
  );
}