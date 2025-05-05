import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";

interface GoToRepoProps {
  repoUrl: string;
}

export function GoToRepo({ repoUrl }: GoToRepoProps) {
  return (
    <a href={repoUrl} target="_blank" rel="noopener noreferrer">
      <Button 
        variant="outline" 
        size="sm" 
        className="gap-1 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm"
      >
        <Github className="h-3 w-3 sm:h-4 sm:w-4" />
        <span className="hidden sm:inline">Go to Repo</span>
      </Button>
    </a>
  );
} 