import { Github } from "lucide-react";

interface GitChatLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function GitChatLogo({ size = 'md', showText = true }: GitChatLogoProps) {
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };
  
  const containerSizes = {
    sm: 'p-1.5',
    md: 'p-3',
    lg: 'p-4'
  };
  
  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl'
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className={`relative flex items-center justify-center bg-primary rounded-full shadow-md ${containerSizes[size]}`}>
        <Github className={`text-background ${iconSizes[size]}`} />
      </div>
      {showText && (
        <h2 className={`font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70 ${textSizes[size]}`}>
          GitChat
        </h2>
      )}
    </div>
  );
} 