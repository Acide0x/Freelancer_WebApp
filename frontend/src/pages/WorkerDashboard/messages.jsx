// messages.jsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Send } from "lucide-react";

const conversations = [
  {
    id: 1,
    name: "Sarah Johnson",
    company: "TechCorp Inc",
    lastMessage: "The dashboard looks amazing!",
    time: "2m ago",
    unread: 2,
    avatar: "SJ",
  },
  {
    id: 2,
    name: "Mike Chen",
    company: "StartupX",
    lastMessage: "Can we schedule a call tomorrow?",
    time: "1h ago",
    unread: 0,
    avatar: "MC",
  },
  {
    id: 3,
    name: "Emma Davis",
    company: "DataSync Ltd",
    lastMessage: "Payment sent successfully!",
    time: "3h ago",
    unread: 0,
    avatar: "ED",
  },
  {
    id: 4,
    name: "James Wilson",
    company: "WebAgency",
    lastMessage: "Thanks for the great work!",
    time: "5h ago",
    unread: 1,
    avatar: "JW",
  },
];

export default function MessagesSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      {/* Conversations List */}
      <Card className="border-border/50 bg-card/50 backdrop-blur lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Messages</CardTitle>
          <CardDescription className="mb-3">Chat with your clients</CardDescription>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search conversations..." className="pl-10 bg-secondary/50" />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-y-auto max-h-[480px]">
          <div className="space-y-0">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                className="w-full p-3 text-left hover:bg-secondary/50 transition-colors border-b border-border/30 flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-chart-1 to-chart-2 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {conv.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground truncate">{conv.name}</p>
                    {conv.unread > 0 && (
                      <Badge className="bg-primary text-primary-foreground text-xs">{conv.unread}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chat Window */}
      <Card className="border-border/50 bg-card/50 backdrop-blur lg:col-span-2 flex flex-col">
        <CardHeader className="border-b border-border/50 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-chart-1 to-chart-2 flex items-center justify-center text-white text-sm font-bold">
              SJ
            </div>
            <div>
              <CardTitle>Sarah Johnson</CardTitle>
              <CardDescription>TechCorp Inc • Active now</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Messages */}
          <div className="flex justify-start">
            <div className="max-w-xs bg-secondary/50 rounded-lg p-3 text-sm">
              <p className="text-foreground">Hi! I wanted to check the progress on the dashboard.</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="max-w-xs bg-primary text-primary-foreground rounded-lg p-3 text-sm">
              <p>Hey! It's almost done. I'll send you the updates today.</p>
            </div>
          </div>

          <div className="flex justify-start">
            <div className="max-w-xs bg-secondary/50 rounded-lg p-3 text-sm">
              <p className="text-foreground">The dashboard looks amazing! Really impressed with the quality.</p>
            </div>
          </div>
        </CardContent>

        <div className="border-t border-border/50 p-4">
          <div className="flex gap-2">
            <Input placeholder="Type a message..." className="bg-secondary/50" />
            <button className="p-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}