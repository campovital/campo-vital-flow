import { cn } from "@/lib/utils";
import { NavLink } from "react-router-dom";
import { Home, ClipboardList, Sprout, Bug, Calendar, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { useState } from "react";

interface MobileNavProps {
  className?: string;
}

export function MobileNav({ className }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  const navItems = [
    { to: "/", icon: Home, label: "Inicio" },
    { to: "/aplicar", icon: ClipboardList, label: "Aplicar" },
    { to: "/cosecha", icon: Sprout, label: "Cosecha" },
    { to: "/plagas", icon: Bug, label: "Plagas" },
    { to: "/historial", icon: Calendar, label: "Historial" },
  ];

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors touch-target",
      isActive
        ? "text-primary"
        : "text-muted-foreground hover:text-foreground"
    );

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-pb",
        className
      )}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={navLinkClass} end={item.to === "/"}>
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground touch-target">
              <Menu className="w-5 h-5" />
              <span>Más</span>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar className="relative w-full h-full border-0" />
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
