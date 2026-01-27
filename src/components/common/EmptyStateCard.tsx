import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon, Plus, Settings } from "lucide-react";
import { Link } from "react-router-dom";

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "outline" | "secondary";
  icon?: LucideIcon;
}

interface EmptyStateCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
}

/**
 * A reusable empty state card component with optional primary and secondary CTAs.
 * Used when there's no data to display in a list or when prerequisites are missing.
 */
export function EmptyStateCard({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}: EmptyStateCardProps) {
  const renderAction = (action: EmptyStateAction, isPrimary: boolean) => {
    const ActionIcon = action.icon || (isPrimary ? Plus : Settings);
    const variant = action.variant || (isPrimary ? "default" : "outline");

    const buttonContent = (
      <>
        <ActionIcon className="w-4 h-4 mr-2" />
        {action.label}
      </>
    );

    if (action.href) {
      return (
        <Button variant={variant} asChild>
          <Link to={action.href}>{buttonContent}</Link>
        </Button>
      );
    }

    return (
      <Button variant={variant} onClick={action.onClick}>
        {buttonContent}
      </Button>
    );
  };

  return (
    <Card className="border-dashed">
      <CardContent className="p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Icon className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="font-medium">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
        {(primaryAction || secondaryAction) && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-4">
            {primaryAction && renderAction(primaryAction, true)}
            {secondaryAction && renderAction(secondaryAction, false)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
