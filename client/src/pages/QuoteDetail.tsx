import { Header } from "@/components/Header";
import { useQuotes, useUpdateQuote } from "@/hooks/use-quotes";
import { useRoute } from "wouter";
import { Loader2, Sparkles, Mic, StopCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useVoiceRecorder } from "../../replit_integrations/audio";
import { useMutation } from "@tanstack/react-query";

export default function QuoteDetail() {
  const [, params] = useRoute("/quotes/:id");
  const id = parseInt(params?.id || "0");
  const { data: quotes, isLoading } = useQuotes();
  const { mutate: updateQuote, isPending: isUpdating } = useUpdateQuote();
  const quote = quotes?.find(q => q.id === id);

  const [content, setContent] = useState("");
  const [aiMode, setAiMode] = useState(false);
  
  useEffect(() => {
    if (quote) setContent(quote.content || "");
  }, [quote]);

  const handleSave = () => {
    if (!quote) return;
    updateQuote({ id: quote.id, content });
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (!quote) return <div className="p-8 text-center">Quote not found</div>;

  return (
    <div className="space-y-6">
      <Header title={`Quote #${id}`} showBack />

      <div className="bg-card rounded-3xl p-6 border border-border shadow-sm space-y-4">
        <div className="flex justify-between items-center">
           <h2 className="text-lg font-bold">Quote Content</h2>
           <Button 
             variant="outline" 
             size="sm" 
             onClick={() => setAiMode(!aiMode)}
             className={aiMode ? "bg-accent/10 text-accent border-accent/20" : ""}
           >
             <Sparkles className="w-4 h-4 mr-2" />
             AI Assistant
           </Button>
        </div>

        {aiMode ? (
          <AIAssistant 
            currentContent={content} 
            onApply={(newContent) => {
              setContent(newContent);
              setAiMode(false);
            }} 
          />
        ) : (
          <div className="space-y-4">
            <Textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px] text-base p-4 rounded-xl leading-relaxed resize-none bg-muted/20"
              placeholder="Enter quote details here..."
            />
            <Button onClick={handleSave} disabled={isUpdating} className="w-full h-12 rounded-xl text-lg font-semibold">
              {isUpdating ? <Loader2 className="animate-spin mr-2" /> : "Save Changes"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function AIAssistant({ currentContent, onApply }: { currentContent: string, onApply: (text: string) => void }) {
  const { state, startRecording, stopRecording } = useVoiceRecorder();
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleVoiceToggle = async () => {
    if (state === "recording") {
      const blob = await stopRecording();
      // In a real app, we'd send this blob to STT endpoint
      // For this MVP, we'll simulate or use a mock since we might not have full STT configured on backend for generic text
      toast({ title: "Voice recorded", description: "Transcription would happen here." });
    } else {
      await startRecording();
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);
    
    try {
      // Use the chat endpoint to generate text
      const res = await fetch("/api/conversations/1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content: `Act as a professional tradesperson. Rewrite/Draft a quote description based on this request: "${prompt}". \n\nCurrent context: "${currentContent}". \n\nOutput ONLY the improved quote description text, no conversational filler.` 
        })
      });

      if (!res.ok) throw new Error("Failed to generate");

      // Handle SSE response stream manually to accumulate text
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) accumulatedText += data.content;
              } catch (e) {
                // ignore parse errors for partial chunks
              }
            }
          }
        }
      }
      
      onApply(accumulatedText);
    } catch (e) {
      toast({ title: "Error", description: "Failed to generate text", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-accent/5 rounded-2xl p-4 border border-accent/10 space-y-4">
      <p className="text-sm font-medium text-accent-foreground">
        Tell me what work needs to be done, and I'll draft a professional description for you.
      </p>
      
      <div className="flex gap-2">
        <Input 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Install 3 new outlets and replace breaker panel..."
          className="bg-background border-accent/20 h-12"
        />
        <Button 
          variant="outline" 
          size="icon" 
          className={cn("h-12 w-12 shrink-0 border-accent/20", state === "recording" ? "bg-red-100 text-red-600 animate-pulse" : "")}
          onClick={handleVoiceToggle}
        >
          {state === "recording" ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>
      </div>

      <Button 
        onClick={handleGenerate} 
        disabled={isLoading || !prompt}
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
      >
        {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
        Generate Description
      </Button>
    </div>
  );
}
