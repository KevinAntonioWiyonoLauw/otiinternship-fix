"use client";

import { Aspirasi } from "@/types/aspirasi";
import { AspirasiCard } from "./AspirasiCard";
import { EmptyState } from "@/components/ui/empty-state";

interface AspirasiListProps {
  aspirations: Aspirasi[];
  isAdmin?: boolean;
  onDelete?: (id: number) => Promise<void>;
}

export function AspirasiList({ aspirations, isAdmin = false, onDelete }: AspirasiListProps) {
  const handleDelete = async (id: number) => {
    if (!onDelete) return;
    
    try {
      await onDelete(id);
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  if (aspirations.length === 0) {
    return (
      <EmptyState
        title="No aspirations found"
        description="Try submitting a new aspirasi or adjusting your filters"
        className="py-12"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-auto">
      {aspirations.map((aspirasi) => (
        <AspirasiCard
          key={aspirasi.id}
          aspirasi={aspirasi}
          isAdmin={isAdmin}
          onDelete={onDelete ? (id) => handleDelete(id) : undefined}
          containerHeight="100%" // Let each card determine its own height based on content
          containerWidth="100%"
          scaleOnHover={1.02}
          rotateAmplitude={0.5}
        />
      ))}
    </div>
  );
}