import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight, Folder, FolderOpen, FileText, GitFork } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

export function RepoTreeMap({ repoContent, repoUrl }: RepoTreeMapProps) {
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (repoContent && !treeData) {
      generateTreeData();
    }
  }, [repoContent]);

  const generateTreeData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const genAI = new GoogleGenerativeAI("AIzaSyD1kn-EMlQoPaB9e0SUpRZd7B9VnTDC_I8");
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Parse the following GitHub repository content and generate a JSON representation of the file structure. 
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
      ${repoContent.substring(0, 25000)}
      
      Return ONLY the JSON object without any additional text or explanations.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from the response if needed
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : text;
      
      try {
        const parsedData = JSON.parse(jsonString);
        setTreeData(parsedData);
      } catch (parseError) {
        console.error("Error parsing JSON:", parseError);
        setError("Failed to parse repository structure");
      }
    } catch (error) {
      console.error("Error generating tree data:", error);
      setError("Failed to generate repository structure");
    } finally {
      setLoading(false);
    }
  };

  const TreeNode = ({ node, level = 0 }: { node: TreeNode; level?: number }) => {
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
            {node.children.map((childNode, index) => (
              <TreeNode key={`${childNode.path}-${index}`} node={childNode} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <GitFork className="h-4 w-4" />
          <span>View Repository Structure</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Repository Structure</DialogTitle>
        </DialogHeader>
        <ScrollArea className="mt-4 h-[60vh] border rounded-md p-4">
          {loading && (
            <div className="flex justify-center items-center h-full">
              <div className="flex flex-col items-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Loading repository structure...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="flex justify-center items-center h-full text-destructive">
              <p>{error}</p>
            </div>
          )}
          
          {treeData && !loading && (
            <div className="pr-4">
              <TreeNode node={treeData} />
            </div>
          )}
        </ScrollArea>
        <div className="text-xs text-muted-foreground mt-2 text-center">
          Repository: {repoUrl.replace("https://github.com/", "")}
        </div>
      </DialogContent>
    </Dialog>
  );
} 