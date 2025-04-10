import { Button } from "@/components/ui/button";
import { MessageSquare, Github, Code2, Brain, Sparkles } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted overflow-hidden">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center text-center space-y-8">
          {/* Animated Icons */}
          <div className="relative">
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-3xl" />
            <div className="relative flex items-center space-x-4">
              <Github className="h-12 w-12 animate-float-1" />
              <MessageSquare className="h-12 w-12 animate-float-2" />
              <Sparkles className="h-12 w-12 animate-float-3" />
            </div>
          </div>
          
          <h1 className="text-5xl font-bold tracking-tighter sm:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70 animate-gradient">
            Chat with Any GitHub Repository
          </h1>
          
          <p className="max-w-[600px] text-muted-foreground text-lg sm:text-xl leading-relaxed">
            Enter a GitHub repository URL and start an intelligent conversation about the codebase.
            Our AI will analyze the repository and help you understand its structure and contents.
          </p>

          <div className="w-full max-w-xl space-y-4">
            <Link href="/chat" className="w-full">
              <Button className="w-full h-14 text-lg group relative overflow-hidden bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary transition-all duration-300">
                <span className="relative z-10 flex items-center gap-2">
                  Start Chatting
                  <MessageSquare className="h-5 w-5 animate-bounce" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-primary/20 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="group p-6 bg-card/50 backdrop-blur-sm rounded-lg shadow-lg border border-border/50 hover:border-primary/50 transition-all duration-300">
              <div className="mb-3 text-primary">
                <Brain className="h-8 w-8 transform group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Deep Understanding</h3>
              <p className="text-muted-foreground">
                Get insights about code structure, dependencies, and implementation details.
              </p>
            </div>
            <div className="group p-6 bg-card/50 backdrop-blur-sm rounded-lg shadow-lg border border-border/50 hover:border-primary/50 transition-all duration-300">
              <div className="mb-3 text-primary">
                <Code2 className="h-8 w-8 transform group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Quick Analysis</h3>
              <p className="text-muted-foreground">
                Instantly analyze any public GitHub repository and start asking questions.
              </p>
            </div>
            <div className="group p-6 bg-card/50 backdrop-blur-sm rounded-lg shadow-lg border border-border/50 hover:border-primary/50 transition-all duration-300">
              <div className="mb-3 text-primary">
                <Sparkles className="h-8 w-8 transform group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-xl font-semibold mb-3">AI-Powered</h3>
              <p className="text-muted-foreground">
                Powered by Google's Gemini 1.5, providing accurate and contextual responses.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}