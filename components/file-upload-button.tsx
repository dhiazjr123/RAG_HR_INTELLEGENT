"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onSelectFiles: (files: File[]) => void;
  label?: string;
  accept?: string;
  multiple?: boolean;
  variant?: "default" | "secondary" | "ghost" | "outline" | "destructive" | "link";
  size?: "sm" | "default" | "lg" | "icon";
  className?: string;
};

export default function FileUploadButton({
  onSelectFiles,
  label = "Upload Document",
  accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt",
  multiple = true,
  variant = "outline",
  size = "default",
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleClick = () => {
    setIsUploading(true);
    inputRef.current?.click();
    setTimeout(() => setIsUploading(false), 200);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length) {
      setShowSuccess(true);
      onSelectFiles(files);
      setTimeout(() => setShowSuccess(false), 1500);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleFileChange}
      />
      <Button 
        type="button" 
        variant={variant} 
        size={size} 
        onClick={handleClick}
        className={cn(
          "transition-all duration-300 ease-in-out",
          "hover:scale-105 hover:shadow-lg active:scale-95",
          "relative overflow-hidden",
          showSuccess && "bg-green-500 hover:bg-green-600",
          className
        )}
        disabled={isUploading}
      >
        <span className={cn(
          "flex items-center gap-2 transition-all duration-300",
          showSuccess && "translate-x-[-100%] opacity-0"
        )}>
          <Upload className={cn(
            "h-4 w-4 transition-transform duration-300",
            isUploading && "animate-bounce"
          )} />
          {label}
        </span>
        {showSuccess && (
          <span className="absolute inset-0 flex items-center justify-center gap-2 animate-in fade-in duration-300">
            <Check className="h-4 w-4" />
            Selected!
          </span>
        )}
      </Button>
    </>
  );
}
