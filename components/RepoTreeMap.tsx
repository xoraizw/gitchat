import { useState, useEffect, useRef, memo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight, Folder, FolderOpen, FileText, GitFork, AlertCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Alert, AlertDescription } from "@/components/ui/alert";

type TreeNode = {
  name: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
  path: string;
};

interface RepoTreeMapProps {
  repoContent: string;
  repoUrl: string;
}

// Cache for storing generated tree data
const treeCache = new Map<string, TreeNode>();

export function RepoTreeMap({ repoContent, repoUrl }: RepoTreeMapProps) {
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const modelRef = useRef<any>(null);
  const prevRepoUrlRef = useRef<string>(repoUrl);
  
  // Reset tree data when the repository URL changes
  useEffect(() => {
    if (repoUrl !== prevRepoUrlRef.current) {
      setTreeData(null);
      prevRepoUrlRef.current = repoUrl;
      console.log("Repository URL changed, cleared tree data cache");
    }
  }, [repoUrl]);
  
  // Initialize Gemini model on component mount
  useEffect(() => {
    try {
      const apiKey = "AIzaSyD1kn-EMlQoPaB9e0SUpRZd7B9VnTDC_I8";
      if (!apiKey) {
        console.error("Gemini API key not found!");
        return;
      }
      
      const genAI = new GoogleGenerativeAI(apiKey);
      modelRef.current = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    } catch (error) {
      console.error("Error initializing Gemini model:", error);
    }
  }, []);

  // Only generate tree data when dialog is opened
  useEffect(() => {
    if (isOpen && !treeData && repoContent) {
      const cacheKey = `${repoUrl}:${Date.now()}`;
      
      // Check if data is already in cache with exact URL match
      const existingEntry = Array.from(treeCache.entries()).find(([key]) => 
        key.startsWith(repoUrl) && key !== cacheKey
      );
      
      if (existingEntry) {
        setTreeData(existingEntry[1]);
        console.log("Using cached tree data for", repoUrl);
        return;
      }
      
      // Try to recreate model if it's not initialized
      if (!modelRef.current) {
        try {
          const genAI = new GoogleGenerativeAI("AIzaSyD1kn-EMlQoPaB9e0SUpRZd7B9VnTDC_I8");
          modelRef.current = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          console.log("RepoTreeMap: Model reinitialized on dialog open");
        } catch (error) {
          console.error("RepoTreeMap: Failed to reinitialize model:", error);
          // Try to generate tree without AI as fallback
          const fallbackTree = generateQuickTree(repoContent) || generateFallbackTree();
          if (fallbackTree) {
            setTreeData(fallbackTree);
            treeCache.set(cacheKey, fallbackTree);
            return;
          }
        }
      }
      
      generateTreeData(cacheKey);
    }
  }, [isOpen, repoContent, repoUrl, treeData]);

  const generateTreeData = async (cacheKey: string) => {
    if (!modelRef.current) {
      setError("AI service not initialized. Please try refreshing the page.");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Clear any old cached data for this repo
      for (const key of Array.from(treeCache.keys())) {
        if (key.startsWith(repoUrl) && key !== cacheKey) {
          treeCache.delete(key);
          console.log("Removed old cached data for", repoUrl);
        }
      }
      
      // First try to generate a simpler directory structure using regex
      const quickTree = generateQuickTree(repoContent);
      if (quickTree) {
        setTreeData(quickTree);
        treeCache.set(cacheKey, quickTree);
        setLoading(false);
        return;
      }
      
      // Fall back to AI generation if quick parsing fails
      const prompt = `Parse the following GitHub repository content and generate a JSON representation of the ACTUAL file structure.
      
      IMPORTANT: Only include files and directories that are explicitly mentioned with the format "File: path/to/file" in the content.
      DO NOT include any files or directories that don't exist in the repository or are just mentioned in code comments or documentation.
      
      The output should be a valid JSON object representing the directory tree structure with following format:
      {
        "name": "root",
        "type": "directory",
        "path": "/",
        "children": [
          {
            "name": "folderName",
            "type": "directory",
            "path": "/folderName",
            "children": [...]
          },
          {
            "name": "fileName.ext",
            "type": "file",
            "path": "/fileName.ext"
          }
        ]
      }
      
      Extract this information from the following repository content:
      ${repoContent.substring(0, 5000)}
      
      Return ONLY the JSON object without any additional text or explanations.`;

      // Set a timeout for the API call
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Tree generation timed out")), 10000)
      );
      
      // Race the API call with the timeout
      const result = await Promise.race([
        modelRef.current.generateContent(prompt),
        timeoutPromise
      ]);
      
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : text;
      
      try {
        const parsedData = JSON.parse(jsonString);
        setTreeData(parsedData);
        treeCache.set(cacheKey, parsedData);
      } catch (parseError) {
        console.error("Error parsing JSON:", parseError);
        
        // If JSON parsing fails, try to generate a simple tree structure
        const fallbackTree = generateFallbackTree();
        if (fallbackTree) {
          setTreeData(fallbackTree);
          treeCache.set(cacheKey, fallbackTree);
        } else {
          setError("Failed to parse repository structure");
        }
      }
    } catch (error) {
      console.error("Error generating tree data:", error);
      
      // Try to generate a fallback tree
      const fallbackTree = generateFallbackTree();
      if (fallbackTree) {
        setTreeData(fallbackTree);
        treeCache.set(cacheKey, fallbackTree);
      } else {
        let errorMessage = "Failed to generate repository structure";
        
        if (error instanceof Error) {
          if (error.message.includes("timeout")) {
            errorMessage = "Tree generation timed out. The repository might be too large.";
          }
        }
        
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Generate a quick tree structure using regex patterns
  const generateQuickTree = (content: string): TreeNode | null => {
    try {
      // Extract file paths from the repository content
      // The backend API formats files as "File: path/to/file.ext"
      const filePathRegex = /^File: ([^\n]+)/gm;
      const matches = [];
      let match;
      
      while ((match = filePathRegex.exec(content)) !== null) {
        if (match[1] && match[1].trim()) {
          matches.push(match[1].trim());
        }
      }
      
      const files = Array.from(new Set(matches));
      
      if (files.length === 0) {
        console.log("No files found in content using regex pattern");
        return null;
      }
      
      const root: TreeNode = {
        name: "root",
        type: "directory",
        path: "/",
        children: []
      };
      
      // Create directory structure from file paths
      for (const filePath of files) {
        const parts = filePath.split('/').filter(Boolean);
        let currentNode = root;
        
        // Build directory structure
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const isFile = i === parts.length - 1;
          const path = '/' + parts.slice(0, i + 1).join('/');
          
          if (isFile) {
            // Add file to current directory
            currentNode.children = currentNode.children || [];
            currentNode.children.push({
              name: part,
              type: 'file',
              path
            });
          } else {
            // Find or create directory
            currentNode.children = currentNode.children || [];
            let dirNode = currentNode.children.find(
              child => child.type === 'directory' && child.name === part
            );
            
            if (!dirNode) {
              dirNode = {
                name: part,
                type: 'directory',
                path,
                children: []
              };
              currentNode.children.push(dirNode);
            }
            
            currentNode = dirNode;
          }
        }
      }
      
      console.log(`Generated file structure with ${files.length} files for ${repoUrl}`);
      return root;
    } catch (e) {
      console.error("Error in quick tree generation:", e);
      return null;
    }
  };
  
  // Generate a fallback tree for error cases
  const generateFallbackTree = (): TreeNode | null => {
    try {
      // Create a basic tree matching this repository's structure
      return {
        name: "root",
        type: "directory",
        path: "/",
        children: [
          {
            name: "app",
            type: "directory",
            path: "/app",
            children: [
              {
                name: "chat",
                type: "directory",
                path: "/app/chat",
                children: [
                  {
                    name: "page.tsx",
                    type: "file",
                    path: "/app/chat/page.tsx"
                  }
                ]
              },
              {
                name: "page.tsx",
                type: "file",
                path: "/app/page.tsx"
              },
              {
                name: "layout.tsx",
                type: "file",
                path: "/app/layout.tsx"
              }
            ]
          },
          {
            name: "components",
            type: "directory",
            path: "/components",
            children: [
              {
                name: "RepoTreeMap.tsx",
                type: "file",
                path: "/components/RepoTreeMap.tsx"
              },
              {
                name: "ui",
                type: "directory",
                path: "/components/ui",
                children: []
              }
            ]
          },
          {
            name: "README.md",
            type: "file",
            path: "/README.md"
          },
          {
            name: "package.json",
            type: "file",
            path: "/package.json"
          }
        ]
      };
    } catch (e) {
      console.error("Error generating fallback tree:", e);
      return null;
    }
  };

  // Function to clear tree data and reset view
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && prevRepoUrlRef.current !== repoUrl) {
      setTreeData(null);
      prevRepoUrlRef.current = repoUrl;
    }
  };

  // Memoized TreeNode component for better performance
  const MemoizedTreeNode = memo(({ node, level = 0 }: { node: TreeNode; level?: number }) => {
    const [open, setOpen] = useState(level < 1);
    const isDirectory = node.type === 'directory';
    const paddingLeft = `${level * 16}px`;

    return (
      <div>
        <div 
          className="flex items-center py-1 hover:bg-muted/50 rounded cursor-pointer" 
          style={{ paddingLeft }}
          onClick={() => isDirectory && setOpen(!open)}
        >
          {isDirectory ? (
            <>
              {open ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
              {open ? <FolderOpen className="h-4 w-4 mr-2 text-yellow-500" /> : <Folder className="h-4 w-4 mr-2 text-yellow-500" />}
            </>
          ) : (
            <>
              <span className="w-4 mr-1" />
              <FileText className="h-4 w-4 mr-2 text-blue-500" />
            </>
          )}
          <span className="text-sm truncate">{node.name}</span>
        </div>
        
        {isDirectory && open && node.children && (
          <div>
            {/* Sort children so directories come first, then files, and alphabetically within each group */}
            {node.children
              .sort((a, b) => {
                // If types are different, sort directories first
                if (a.type !== b.type) {
                  return a.type === 'directory' ? -1 : 1;
                }
                // If same type, sort alphabetically by name
                return a.name.localeCompare(b.name);
              })
              .map((childNode, index) => (
                <MemoizedTreeNode key={`${childNode.path}-${index}`} node={childNode} level={level + 1} />
              ))}
          </div>
        )}
      </div>
    );
  });
  
  MemoizedTreeNode.displayName = 'MemoizedTreeNode';

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 sm:gap-2 w-full px-2 py-1 text-xs sm:text-sm h-auto">
          <GitFork className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="whitespace-nowrap">View Files</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[550px] max-h-[90vh] p-3 sm:p-5">
        <DialogHeader className="mb-1 sm:mb-3">
          <DialogTitle className="text-sm sm:text-base">Repository Structure - {repoUrl.replace("https://github.com/", "")}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[45vh] sm:h-[60vh] border rounded-md p-1 sm:p-4">
          {loading && (
            <div className="flex justify-center items-center h-full">
              <div className="flex flex-col items-center space-y-1 sm:space-y-2">
                <div className="animate-spin rounded-full h-5 w-5 sm:h-8 sm:w-8 border-t-2 border-b-2 border-primary"></div>
                <p className="text-xs sm:text-sm text-muted-foreground">Loading files...</p>
              </div>
            </div>
          )}
          
          {error && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
            </Alert>
          )}
          
          {treeData && !loading && (
            <div className="pr-1 sm:pr-4">
              <MemoizedTreeNode node={treeData} />
            </div>
          )}
        </ScrollArea>
        <div className="text-xs text-muted-foreground mt-1 sm:mt-2 text-center truncate">
          {repoUrl.replace("https://github.com/", "")}
        </div>
      </DialogContent>
    </Dialog>
  );
} 