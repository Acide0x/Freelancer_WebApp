// portfolio.jsx
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Trash2, Edit2 } from "lucide-react";

const portfolioItems = [
  {
    id: 1,
    title: "E-commerce Platform",
    description: "Full-stack React & Node.js e-commerce solution with Stripe integration",
    category: "Web Development",
    image: "/ecommerce-platform-concept.png",
    link: "https://example.com",
    skills: ["React", "Node.js", "MongoDB", "Stripe"],
  },
  {
    id: 2,
    title: "Mobile Banking App UI",
    description: "Modern and intuitive banking application interface design",
    category: "UI/UX Design",
    image: "/mobile-banking-app.png",
    link: "https://example.com",
    skills: ["Figma", "UI Design", "Prototyping"],
  },
  {
    id: 3,
    title: "Analytics Dashboard",
    description: "Real-time analytics dashboard with interactive charts and data visualization",
    category: "Web Development",
    image: "/analytics-dashboard.png",
    link: "https://example.com",
    skills: ["React", "Recharts", "TypeScript", "Tailwind CSS"],
  },
  {
    id: 4,
    title: "AI Chat Interface",
    description: "Conversational AI chatbot interface with modern design and smooth animations",
    category: "Web Development",
    image: "/ai-chat-interface.png",
    link: "https://example.com",
    skills: ["Next.js", "AI/ML", "TypeScript"],
  },
];

export default function PortfolioSection() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Portfolio</h2>
          <p className="text-muted-foreground">Showcase your best work</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">Add Project</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {portfolioItems.map((item) => (
          <Card
            key={item.id}
            className="border-border/50 bg-card/50 backdrop-blur overflow-hidden hover:bg-card/70 transition-all duration-300 group"
          >
            <div className="relative h-40 bg-secondary/50 overflow-hidden">
              <img
                src={item.image || "/placeholder.svg"}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <CardContent className="p-4">
              <Badge className="mb-2 bg-primary/20 text-primary border-primary/30">
                {item.category}
              </Badge>
              <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">{item.description}</p>

              <div className="flex flex-wrap gap-1 mb-4">
                {item.skills.map((skill, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs bg-secondary/50">
                    {skill}
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 bg-transparent" asChild>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View
                  </a>
                </Button>
                <Button size="sm" variant="ghost">
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}