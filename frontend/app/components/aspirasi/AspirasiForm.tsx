"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";

const formSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  target: z.string().min(1, "Target is required"),
  message: z.string().min(1, "Message is required").max(500, "Message is too long"),
  isAnonymous: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface AspirasiFormProps {
  onSuccess?: () => void;
}

export function AspirasiForm({ onSuccess }: AspirasiFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { authenticatedFetch } = useAuthenticatedApi();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isAnonymous: false,
      subject: "",
      target: "",
      message: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        target: values.target,
        subject: values.subject,
        message: values.message,
        anonymous: values.isAnonymous,
      };

      const result = await authenticatedFetch("/api/aspirasi", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!result) {
        throw new Error("Failed to submit aspiration. Please try again.");
      }

      toast({
        title: "Aspirasi Sent",
        description: "Your feedback has been submitted successfully",
        variant: "default",
      });

      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error("Error submitting aspiration:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit aspirasi",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-[#1A1A1A]/30 rounded-2xl p-6 shadow-lg space-y-6 animate-fadeIn">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter subject"
                      className="bg-[#1F1F1F] border-gray-800"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter target (e.g., Human Development, IT Division)"
                      className="bg-[#1F1F1F] border-gray-800"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The division or team this feedback is meant for
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share your thoughts..."
                      className="bg-[#1F1F1F] border-gray-800 min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Maximum 500 characters</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isAnonymous"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-800 p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Submit Anonymously</FormLabel>
                    <FormDescription>
                      Your identity will not be shown if enabled
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-[#F97316] hover:bg-[#F97316]/90 transition-colors rounded"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Aspirasi"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}