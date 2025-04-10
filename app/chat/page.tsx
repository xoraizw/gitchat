"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { GoogleGenerativeAI } from "@google/generative-ai";

export default function ChatPage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [repoContent, setRepoContent] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [input, setInput] = useState("");

  const analyzeRepo = async () => {
    if (!repoUrl.startsWith("https://github.com/")) {
      alert("Please enter a valid GitHub repository URL");
      return;
    }

    setAnalyzing(true);
    try {
      const response = await fetch(`https://web-production-d2772.up.railway.app/analyze?repo_url=${encodeURIComponent(repoUrl)}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setRepoContent(data.content);
      setMessages([{
        role: "assistant",
        content: "Repository analyzed successfully! You can now ask questions about the codebase."
      }]);
    } catch (error) {
      alert("Error analyzing repository: " + error);
    } finally {
      setAnalyzing(false);
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
2. When including code snippets, always specify the language for syntax highlighting
3. Format code blocks with triple backticks and the language identifier, like:
   \`\`\`javascript
   // code here
   \`\`\`
4. Use appropriate markdown elements:
   - Headers with #, ##, ###
   - Lists with - or numbers
   - Bold with **text**
   - Italic with *text*
   - Code inline with \`code\`
5. Break your response into clear sections with headers where appropriate
6. Keep the formatting clean and consistent

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

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex items-center justify-between px-4 py-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          <h1 className="text-2xl font-bold">GitHub Repository Chat</h1>
        </div>
      </div>

      <div className="flex-1 container mx-auto px-4 overflow-hidden">
        {!repoContent ? (
          <div className="h-full flex items-center justify-center">
            <Card className="p-6 w-full max-w-2xl">
              <h2 className="text-2xl font-bold mb-4">Enter GitHub Repository URL</h2>
              <div className="flex gap-2">
                <Input
                  placeholder="https://github.com/username/repository"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={analyzeRepo} disabled={analyzing}>
                  {analyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    "Analyze"
                  )}
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <div className="h-full flex flex-col space-y-4 py-4">
            <ScrollArea className="flex-1 rounded-lg border">
              <div className="p-4 space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "assistant" ? "justify-start" : "justify-end"
                    }`}
                  >
                    <div
                      className={`rounded-lg px-4 py-2 max-w-[80%] ${
                        message.role === "assistant"
                          ? "bg-muted prose prose-sm dark:prose-invert max-w-none"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      <ReactMarkdown>{message.content}</ReactMarkdown>
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
            
            <div className="flex gap-2">
              <Input
                placeholder="Ask a question about the repository..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              />
              <Button onClick={sendMessage} disabled={loading}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}