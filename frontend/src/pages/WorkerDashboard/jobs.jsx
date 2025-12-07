// jobs.jsx
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, ChevronRight, User, CheckCircle2 } from "lucide-react";

const activeJobs = [
  {
    id: 1,
    title: "React Dashboard Development",
    client: "TechCorp Inc",
    budget: "$2,500",
    timeline: "2 weeks",
    status: "in-progress",
  },
  {
    id: 2,
    title: "Mobile App UI Design",
    client: "StartupX",
    budget: "$1,800",
    timeline: "10 days",
    status: "in-progress",
  },
  {
    id: 3,
    title: "API Integration",
    client: "DataSync Ltd",
    budget: "$1,200",
    timeline: "5 days",
    status: "in-progress",
  },
];

const completedJobs = [
  { id: 4, title: "E-commerce Platform Redesign", client: "ShopHub", budget: "$3,500", completedDate: "Dec 1, 2024" },
  { id: 5, title: "Landing Page Development", client: "WebAgency", budget: "$1,500", completedDate: "Nov 28, 2024" },
  { id: 6, title: "Database Schema Design", client: "Analytics Pro", budget: "$2,000", completedDate: "Nov 25, 2024" },
];

const jobRequests = [
  {
    id: 7,
    title: "Full Stack Next.js Project",
    client: "Innovation Labs",
    budget: "$4,500 - $6,000",
    deadline: "Dec 20, 2024",
  },
  {
    id: 8,
    title: "WordPress Theme Customization",
    client: "BlogMasters",
    budget: "$800 - $1,200",
    deadline: "Dec 15, 2024",
  },
];

export default function JobsSection() {
  return (
    <Tabs defaultValue="active" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3 bg-secondary/50">
        <TabsTrigger value="active">Active Jobs ({activeJobs.length})</TabsTrigger>
        <TabsTrigger value="completed">Completed ({completedJobs.length})</TabsTrigger>
        <TabsTrigger value="requests">Job Requests ({jobRequests.length})</TabsTrigger>
      </TabsList>

      {/* Active Jobs */}
      <TabsContent value="active" className="space-y-4">
        {activeJobs.map((job) => (
          <Card
            key={job.id}
            className="border-border/50 bg-card/50 backdrop-blur hover:bg-card/70 transition-all duration-300 group"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {job.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <User className="w-4 h-4" />
                    {job.client}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                      {job.budget}
                    </Badge>
                    <Badge variant="outline" className="bg-chart-2/10 text-chart-2 border-chart-2/30">
                      {job.timeline}
                    </Badge>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="hover:bg-primary hover:text-primary-foreground">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="mt-4 w-full bg-secondary/50 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-chart-1 to-primary h-full rounded-full"
                  style={{ width: "60%" }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      {/* Completed Jobs */}
      <TabsContent value="completed" className="space-y-4">
        {completedJobs.map((job) => (
          <Card
            key={job.id}
            className="border-border/50 bg-card/50 backdrop-blur hover:bg-card/70 transition-all duration-300"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <h3 className="font-semibold text-foreground">{job.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <User className="w-4 h-4" />
                    {job.client}
                  </div>
                  <div className="flex gap-2">
                    <Badge className="bg-green-500/20 text-green-600 border-green-500/30">{job.budget}</Badge>
                    <Badge variant="outline" className="text-muted-foreground">
                      Completed {job.completedDate}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      {/* Job Requests */}
      <TabsContent value="requests" className="space-y-4">
        {jobRequests.map((job) => (
          <Card
            key={job.id}
            className="border-border/50 bg-card/50 backdrop-blur hover:bg-card/70 transition-all duration-300"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-2">{job.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <User className="w-4 h-4" />
                    {job.client}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-chart-1/20 text-chart-1 border-chart-1/30">{job.budget}</Badge>
                    <Badge variant="outline">Deadline: {job.deadline}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-primary hover:bg-primary/90">
                    Accept
                  </Button>
                  <Button size="sm" variant="outline">
                    Decline
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>
    </Tabs>
  );
}