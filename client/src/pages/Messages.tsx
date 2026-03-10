import { MessageCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Messages() {
  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="px-6 pt-12 mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-1">Messages</h1>
        <p className="text-muted-foreground">Chat with your clients</p>
      </div>

      <div className="px-6 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            className="pl-12 h-12 rounded-2xl border-black/10 bg-white dark:bg-card"
            data-testid="input-search-messages"
          />
        </div>
      </div>

      <div className="px-6">
        <div className="bg-white dark:bg-card rounded-[2rem] p-10 shadow-sm border border-black/5 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <MessageCircle className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">No Messages Yet</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            Messages from your clients will appear here. Start a conversation after creating a quote or job.
          </p>
        </div>
      </div>
    </div>
  );
}
