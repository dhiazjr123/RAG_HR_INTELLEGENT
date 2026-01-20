"use client";

import { cn } from "@/lib/utils";

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <div className={cn("w-full", className)}>
      {children}
    </div>
  );
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div className={cn("flex items-center gap-1 border-b border-border mb-4", className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, className }: TabsTriggerProps & { activeValue?: string }) {
  // This will be handled by parent component
  return (
    <button
      className={cn(
        "px-4 py-2 text-sm font-medium transition-colors border-b-2 border-transparent hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className }: TabsContentProps & { activeValue?: string }) {
  // This will be handled by parent component
  return <div className={cn(className)}>{children}</div>;
}

// Helper component untuk membuat tabs yang lebih mudah digunakan
export function TabsContainer({ 
  value, 
  onValueChange, 
  tabs, 
  className 
}: { 
  value: string; 
  onValueChange: (value: string) => void; 
  tabs: Array<{ value: string; label: string; content: React.ReactNode }>;
  className?: string;
}) {
  return (
    <div className={cn("w-full flex flex-col min-h-0", className)}>
      <TabsList>
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onValueChange(tab.value)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2",
              value === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </TabsList>
      <div className="mt-4 flex-1 overflow-hidden flex flex-col min-h-0">
        {tabs.map((tab) => (
          <div
            key={tab.value}
            className={cn(
              value === tab.value ? "flex flex-col flex-1 overflow-hidden min-h-0" : "hidden"
            )}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}
