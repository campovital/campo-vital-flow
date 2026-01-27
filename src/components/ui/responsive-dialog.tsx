import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

/**
 * Responsive Dialog component that shows a centered Dialog on desktop
 * and a fullscreen Drawer on mobile for better usability with virtual keyboards.
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[95vh] flex flex-col">
          <DrawerHeader className="flex-shrink-0 border-b pb-4 relative">
            <DrawerTitle>{title}</DrawerTitle>
            {description && (
              <DrawerDescription>{description}</DrawerDescription>
            )}
            <DrawerClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <X className="h-5 w-5" />
              <span className="sr-only">Cerrar</span>
            </DrawerClose>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

interface ResponsiveDialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Sticky footer for ResponsiveDialog that stays visible above virtual keyboard on mobile.
 */
export function ResponsiveDialogFooter({
  children,
  className,
}: ResponsiveDialogFooterProps) {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        isMobile && "sticky bottom-0 bg-background pt-4 pb-2 border-t mt-4 -mx-4 px-4",
        className
      )}
    >
      {children}
    </div>
  );
}
