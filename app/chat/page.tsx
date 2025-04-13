"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, MessageSquare, ArrowLeft, Home, Github, GitBranch, GitFork, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { RepoTreeMap } from "@/components/RepoTreeMap";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Type definitions
type Message = {
  role: "user" | "assistant";
  content: string;
};

type RAGCache = {
  [key: string]: string; // question -> answer
};

export default function ChatPage() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [repoContent, setRepoContent] = useState("");
  const [repoSummary, setRepoSummary] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [input, setInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  
  // Cache for RAG to avoid repeated API calls
  const ragCache = useRef<RAGCache>({});
  
  // Refs for tracking context
  const contextRef = useRef("");
  const geminiModelRef = useRef<any>(null);

  // Initialize Gemini model on component mount
  useEffect(() => {
    try {
      const apiKey = "AIzaSyD1kn-EMlQoPaB9e0SUpRZd7B9VnTDC_I8";
      if (!apiKey) {
        console.error("Gemini API key not found!");
        return;
      }
      
      const genAI = new GoogleGenerativeAI(apiKey);
      geminiModelRef.current = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      console.log("Gemini model initialized successfully");
    } catch (error) {
      console.error("Error initializing Gemini model:", error);
    }
  }, []);

  const analyzeRepo = async () => {
    setUrlError(null);
    setFetchError(null);
    setChatError(null);
    
    if (!isValidGitHubRepoUrl(repoUrl)) {
      setUrlError("Please enter a valid GitHub repository URL (format: https://github.com/username/repository)");
      return;
    }

    const cleanUrl = cleanGitHubUrl(repoUrl);
    setRepoUrl(cleanUrl);
    setAnalyzing(true);
    
    try {
      // Start repository analysis - optimized to load content immediately
      const response = await fetch(`https://web-production-d2772.up.railway.app/analyze?repo_url=${encodeURIComponent(cleanUrl)}`, {
        signal: AbortSignal.timeout(30000) // 30-second timeout
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Server error: ${response.status}` }));
        throw new Error(errorData.error || `Failed to fetch repository data: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (!data.content || typeof data.content !== 'string') {
        throw new Error("No valid content returned from repository analysis");
      }
      
      // Store content and immediately allow chat to begin
      setRepoContent(data.content);
      contextRef.current = data.content;
      
      // Show initial message while summary is being generated
      setMessages([{
        role: "assistant",
        content: "Repository analyzed successfully! You can now ask questions about the codebase."
      }]);
      
      // Generate summary in the background
      setSummarizing(true);
      generateRepoSummary(data.content).catch(error => {
        console.error("Error generating summary:", error);
      });
            
    } catch (error) {
      let errorMessage = "Unknown error occurred";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide more detailed error messages for common issues
        if (error.message.includes("timeout")) {
          errorMessage = "Repository analysis timed out. This could be due to the repository size or server load. Please try again or try with a smaller repository.";
        } else if (error.message.includes("network")) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else if (error.message.includes("404")) {
          errorMessage = "Repository not found. Please check the URL and try again.";
        } else if (error.message.includes("403")) {
          errorMessage = "Access denied. The repository might be private or you may have exceeded API limits.";
        }
      }
      
      setFetchError(`Error analyzing repository: ${errorMessage}`);
    } finally {
      setAnalyzing(false);
    }
  };
  
  const isValidGitHubRepoUrl = (url: string): boolean => {
    // Basic validation for GitHub repository URL
    const githubRegex = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?.*$/;
    return githubRegex.test(url);
  };
  
  const cleanGitHubUrl = (url: string): string => {
    // Extract the base repository URL (owner/repo)
    const match = url.match(/^https?:\/\/(www\.)?github\.com\/([\w-]+\/[\w.-]+)/);
    if (match && match[2]) {
      return `https://github.com/${match[2]}`;
    }
    return url;
  };

  const generateRepoSummary = async (content: string) => {
    try {
      if (!geminiModelRef.current) {
        // Try to reinitialize model
        try {
          const genAI = new GoogleGenerativeAI("AIzaSyD1kn-EMlQoPaB9e0SUpRZd7B9VnTDC_I8");
          geminiModelRef.current = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          console.log("Reinitialized model for summary generation");
        } catch (e) {
          console.error("Failed to reinitialize model:", e);
          // Use fallback summary
          setRepoSummary("A GitHub repository with code and documentation. Explore the files using the view files button below.");
          return;
        }
      }
      
      const prompt = `You are analyzing a GitHub repository. Based on the following repository content, write a very concise summary (2-3 lines maximum) describing what this repository is about. Focus on the main purpose, technologies used, and any distinctive features:

${content.substring(0, 10000)}

Keep your response to 2-3 lines only. Don't use markdown formatting. Just plain text.`;

      const result = await geminiModelRef.current.generateContent(prompt);
      const response = await result.response;
      const summary = response.text();

      setRepoSummary(summary);
    } catch (error) {
      console.error("Error generating summary:", error);
      // Use fallback summary if generation fails
      setRepoSummary("A GitHub repository with code and documentation. Explore the files using the view files button below.");
    } finally {
      setSummarizing(false);
    }
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !contextRef.current) return;
    
    // Try to reinitialize model if needed
    if (!geminiModelRef.current) {
      try {
        const genAI = new GoogleGenerativeAI("AIzaSyD1kn-EMlQoPaB9e0SUpRZd7B9VnTDC_I8");
        geminiModelRef.current = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        console.log("Reinitialized model for chat");
      } catch (e) {
        console.error("Failed to reinitialize model for chat:", e);
        setChatError("AI service could not be initialized. Using limited functionality instead.");
        
        // Still provide a basic response for better UX
        const userMessage = input.trim();
        setInput("");
        
        setMessages(prev => [
          ...prev, 
          { role: "user", content: userMessage },
          { 
            role: "assistant", 
            content: "I'm currently operating with limited functionality due to an initialization error. You can still explore the repository structure using the 'View Files' button above." 
          }
        ]);
        return;
      }
    }
    
    const userMessage = input.trim();
    setInput("");
    setChatError(null);
    
    // Add user message immediately for better UX
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      // Check cache first
      const cacheKey = userMessage.toLowerCase();
      if (ragCache.current[cacheKey]) {
        // Use cached response
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: ragCache.current[cacheKey] 
        }]);
      } else {
        // Generate new response
        const prompt = `You are an expert code analyst. You have access to the following repository content:

${contextRef.current}

Please answer the following question about this repository:
${userMessage}

IMPORTANT FORMATTING INSTRUCTIONS:
1. Use markdown formatting for your response
2. Format all file names with backticks and bold, like: **\`filename.js\`**
3. Format all technical terms, function names, and code references in bold, like: **useState**, **React**, **npm**
4. When including code snippets, always specify the language for syntax highlighting
5. Format code blocks with triple backticks and the language identifier, like:
   \`\`\`javascript
   // code here
   \`\`\`
6. Use appropriate markdown elements:
   - Headers with #, ##, ###
   - Lists with - or numbers
   - Bold with **text**
   - Italic with *text*
   - Code inline with \`code\`
7. Break your response into clear sections with headers where appropriate
8. Keep the formatting clean and consistent

Provide a clear, well-structured response about the repository:`;

        const result = await geminiModelRef.current.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Cache the response
        ragCache.current[cacheKey] = text;
        
        // Update messages with response
        setMessages(prev => [...prev, { role: "assistant", content: text }]);
      }
    } catch (error) {
      console.error("Error generating response:", error);
      
      let errorMessage = "An error occurred while generating a response";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        // Specific error handling
        if (errorMessage.includes("quota")) {
          errorMessage = "API quota exceeded. Please try again later.";
        } else if (errorMessage.includes("content safety")) {
          errorMessage = "The request was flagged by content safety filters. Please rephrase your question.";
        } else if (errorMessage.includes("timeout")) {
          errorMessage = "The request timed out. The repository might be too large or complex.";
        }
      }
      
      setChatError(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [input]);

  const MarkdownComponents: Components = {
    pre: ({ children }) => (
      <pre className="overflow-x-auto max-w-full p-2 rounded bg-muted/50">
        {children}
      </pre>
    ),
    code: ({ className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || "");
      return (
        <code
          className={match ? "block overflow-x-auto" : "bg-muted/50 rounded px-1 py-0.5"}
          {...props}
        >
          {children}
        </code>
      );
    },
    p: ({ children }) => (
      <p className="my-2 whitespace-pre-wrap">{children}</p>
    ),
  };

  const getRepoName = (url: string): string => {
    const match = url.match(/github\.com\/[\w-]+\/([\w.-]+)/);
    return match && match[1] ? match[1] : "this repository";
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 sm:py-3 border-b flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            aria-label="Go back"
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
            <h1 className="text-lg sm:text-xl font-bold truncate">GitHub Chat</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full max-w-full px-2 sm:px-4 overflow-hidden">
        {!repoContent ? (
          <div className="h-full flex items-center justify-center p-2 sm:p-4">
            <Card className="p-4 sm:p-8 w-full max-w-2xl bg-gradient-to-br from-background to-muted">
              <div className="flex flex-col items-center text-center space-y-4 sm:space-y-6">
                <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10">
                  <Github className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Analyze GitHub Repository</h2>
                  <p className="text-xs sm:text-base text-muted-foreground max-w-md mx-auto">
                    Enter a GitHub repository URL to start analyzing its codebase and chat with AI about it.
                  </p>
                </div>

                {urlError && (
                  <Alert variant="destructive" className="text-left w-full">
                    <AlertCircle className="h-4 w-4 mt-1" />
                    <AlertDescription>{urlError}</AlertDescription>
                  </Alert>
                )}

                {fetchError && (
                  <Alert variant="destructive" className="text-left w-full">
                    <AlertCircle className="h-4 w-4 mt-1" />
                    <AlertDescription>{fetchError}</AlertDescription>
                  </Alert>
                )}

                <div className="w-full space-y-3 sm:space-y-4">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      <GitBranch className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <Input
                      placeholder="https://github.com/username/repository"
                      value={repoUrl}
                      onChange={(e) => {
                        setRepoUrl(e.target.value);
                        setUrlError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && repoUrl.trim()) {
                          analyzeRepo();
                        }
                      }}
                      className={`pl-9 sm:pl-10 h-10 sm:h-12 text-base sm:text-lg ${urlError ? 'border-destructive' : ''}`}
                    />
                  </div>
                  
                  <Button 
                    onClick={analyzeRepo} 
                    disabled={analyzing}
                    className="w-full h-10 sm:h-12 text-base sm:text-lg font-medium"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                        Analyzing Repository...
                      </>
                    ) : (
                      "Start Analysis"
                    )}
                  </Button>
                </div>

                <div className="text-xs sm:text-sm text-muted-foreground">
                  Example: https://github.com/facebook/react
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="h-full flex flex-col space-y-2 py-2 sm:space-y-3 sm:py-3 w-full max-w-[100%] sm:mx-auto sm:max-w-4xl overflow-hidden">
            {summarizing && (
              <div className="flex items-center justify-center space-x-2 text-muted-foreground p-1 flex-shrink-0">
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                <span className="text-xs sm:text-sm">Generating summary...</span>
              </div>
            )}
            
            <div className="flex flex-col gap-2 sm:gap-3 w-full flex-shrink-0">
              {repoSummary && (
                <Card className="p-2 sm:p-3 bg-muted/30 w-full">
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    <Github className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-sm sm:text-base">What is {getRepoName(repoUrl)} about?</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">{repoSummary}</p>
                    </div>
                  </div>
                </Card>
              )}
              
              {repoContent && (
                <div className="flex justify-start w-full">
                  <RepoTreeMap repoContent={repoContent} repoUrl={repoUrl} />
                </div>
              )}
            </div>
            
            {chatError && (
              <Alert variant="destructive" className="flex-shrink-0">
                <AlertCircle className="h-4 w-4 mr-2" />
                <AlertDescription>{chatError}</AlertDescription>
              </Alert>
            )}
            
            <ScrollArea className="flex-1 rounded-lg border overflow-y-auto">
              <div className="p-2 sm:p-3 space-y-3 sm:space-y-4 max-w-full">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "assistant" ? "justify-start" : "justify-end"
                    } w-full`}
                  >
                    <div
                      className={`rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 ${
                        message.role === "assistant"
                          ? "bg-muted prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 w-full prose-pre:my-0"
                          : "bg-primary text-primary-foreground w-full"
                      }`}
                      style={{ 
                        overflowWrap: 'break-word', 
                        wordBreak: 'break-word',
                        maxWidth: '100%' 
                      }}
                    >
                      <ReactMarkdown components={MarkdownComponents}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <div className="flex gap-2 flex-shrink-0">
              <Textarea
                placeholder="Ask a question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="flex-1 min-h-[38px] sm:min-h-[44px] max-h-[120px] sm:max-h-[200px] resize-none text-sm sm:text-base py-2"
                rows={1}
                disabled={loading}
              />
              <Button 
                onClick={sendMessage} 
                disabled={loading}
                className="px-2 sm:px-3 shrink-0 h-[38px] sm:h-[44px]"
              >
                <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}