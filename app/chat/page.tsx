"use client";

import { useState } from "react";
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

export default function ChatPage() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [repoContent, setRepoContent] = useState("");
  const [repoSummary, setRepoSummary] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [input, setInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const analyzeRepo = async () => {
    setUrlError(null);
    setFetchError(null);
    
    if (!isValidGitHubRepoUrl(repoUrl)) {
      setUrlError("Please enter a valid GitHub repository URL (format: https://github.com/username/repository)");
      return;
    }

    const cleanUrl = cleanGitHubUrl(repoUrl);
    setRepoUrl(cleanUrl);
    setAnalyzing(true);
    
    try {
      const response = await fetch(`https://web-production-d2772.up.railway.app/analyze?repo_url=${encodeURIComponent(cleanUrl)}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setRepoContent(data.content);
      
      // Generate repository summary
      setSummarizing(true);
      await generateRepoSummary(data.content);
            
    } catch (error) {
      setFetchError(`Error analyzing repository: ${error instanceof Error ? error.message : String(error)}`);
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
      const genAI = new GoogleGenerativeAI("AIzaSyD1kn-EMlQoPaB9e0SUpRZd7B9VnTDC_I8");
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `You are analyzing a GitHub repository. Based on the following repository content, write a very concise summary (2-3 lines maximum) describing what this repository is about. Focus on the main purpose, technologies used, and any distinctive features:

${content.substring(0, 10000)}

Keep your response to 2-3 lines only. Don't use markdown formatting. Just plain text.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text();

      setRepoSummary(summary);
      setMessages([{
        role: "assistant",
        content: "Repository analyzed successfully! You can now ask questions about the codebase."
      }]);
    } catch (error) {
      console.error("Error generating summary:", error);
      setMessages([{
        role: "assistant",
        content: "Repository analyzed successfully! You can now ask questions about the codebase."
      }]);
    } finally {
      setSummarizing(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !repoContent) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const genAI = new GoogleGenerativeAI("AIzaSyD1kn-EMlQoPaB9e0SUpRZd7B9VnTDC_I8");
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `You are an expert code analyst. You have access to the following repository content:

${repoContent}

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

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      setMessages(prev => [...prev, { role: "assistant", content: text }]);
    } catch (error) {
      console.error("Error generating response:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I apologize, but I encountered an error while generating a response. Please try again." 
      }]);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex items-center justify-between px-4 py-4 border-b">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/")}
            >
              <Home className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            <h1 className="text-2xl font-bold truncate">GitHub Repository Chat</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 container mx-auto px-2 sm:px-4 overflow-hidden">
        {!repoContent ? (
          <div className="h-full flex items-center justify-center">
            <Card className="p-8 w-full max-w-2xl bg-gradient-to-br from-background to-muted">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                  <Github className="h-8 w-8 text-primary" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight">Analyze GitHub Repository</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Enter a GitHub repository URL to start analyzing its codebase and chat with AI about it.
                  </p>
                </div>

                {urlError && (
                  <Alert variant="destructive" className="text-left">
                    <AlertCircle className="h-4 w-4 mt-1" />
                    <AlertDescription>{urlError}</AlertDescription>
                  </Alert>
                )}

                {fetchError && (
                  <Alert variant="destructive" className="text-left">
                    <AlertCircle className="h-4 w-4 mt-1" />
                    <AlertDescription>{fetchError}</AlertDescription>
                  </Alert>
                )}

                <div className="w-full max-w-xl space-y-4">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      <GitBranch className="h-5 w-5" />
                    </div>
                    <Input
                      placeholder="https://github.com/username/repository"
                      value={repoUrl}
                      onChange={(e) => {
                        setRepoUrl(e.target.value);
                        setUrlError(null);
                      }}
                      className={`pl-10 h-12 text-lg ${urlError ? 'border-destructive' : ''}`}
                    />
                  </div>
                  
                  <Button 
                    onClick={analyzeRepo} 
                    disabled={analyzing}
                    className="w-full h-12 text-lg font-medium"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Analyzing Repository...
                      </>
                    ) : (
                      "Start Analysis"
                    )}
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  Example: https://github.com/facebook/react
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="h-full flex flex-col space-y-4 py-4 mx-auto w-full max-w-4xl">
            {summarizing && (
              <div className="flex items-center justify-center space-x-2 text-muted-foreground p-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating repository summary...</span>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {repoSummary && (
                <Card className="p-4 bg-muted/30 flex-grow">
                  <div className="flex items-start space-x-3">
                    <Github className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-medium">Repository Summary</h3>
                      <p className="text-sm text-muted-foreground">{repoSummary}</p>
                    </div>
                  </div>
                </Card>
              )}
              
              {repoContent && (
                <div className="flex-shrink-0">
                  <RepoTreeMap repoContent={repoContent} repoUrl={repoUrl} />
                </div>
              )}
            </div>
            
            <ScrollArea className="flex-1 rounded-lg border">
              <div className="p-2 sm:p-4 space-y-4 max-w-full">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "assistant" ? "justify-start" : "justify-end"
                    } w-full`}
                  >
                    <div
                      className={`rounded-lg px-3 sm:px-4 py-2 ${
                        message.role === "assistant"
                          ? "bg-muted prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 w-full sm:w-[90%] prose-pre:my-0"
                          : "bg-primary text-primary-foreground w-full sm:w-[90%]"
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
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <div className="flex gap-2 px-0 sm:px-4">
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
                className="flex-1 min-h-[44px] max-h-[200px] resize-none"
                rows={1}
              />
              <Button 
                onClick={sendMessage} 
                disabled={loading}
                className="px-4 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}