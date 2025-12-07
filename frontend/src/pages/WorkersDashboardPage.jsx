// WorkersDashboardPage.jsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardOverview from "@/pages/WorkerDashboard/overview";
import JobsSection from "@/pages/WorkerDashboard/jobs";
import AnalyticsSection from "@/pages/WorkerDashboard/analytics";
import EarningsSection from "@/pages/WorkerDashboard/earnings";
import MessagesSection from "@/pages/WorkerDashboard/messages";
import PortfolioSection from "@/pages/WorkerDashboard/portfolio";
import ReviewsSection from "@/pages/WorkerDashboard/reviews";
import {
  BarChart3,
  MessageSquare,
  Star,
  Briefcase,
  TrendingUp,
  Wallet,
  FolderOpen,
  Bell,
} from "lucide-react";

export default function WorkersDashboardPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Tabs defaultValue="overview" className="w-full">
        {/* Tab Navigation */}
        <div className="mb-8 overflow-x-auto">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 gap-2 bg-transparent p-0 border-b border-border/50 h-auto pb-0">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary px-4 py-3 rounded-none text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>

            <TabsTrigger
              value="jobs"
              className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary px-4 py-3 rounded-none text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Briefcase className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Jobs</span>
            </TabsTrigger>

            <TabsTrigger
              value="analytics"
              className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary px-4 py-3 rounded-none text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>

            <TabsTrigger
              value="earnings"
              className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary px-4 py-3 rounded-none text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Wallet className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Earnings</span>
            </TabsTrigger>

            <TabsTrigger
              value="messages"
              className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary px-4 py-3 rounded-none text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Messages</span>
            </TabsTrigger>

            <TabsTrigger
              value="portfolio"
              className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary px-4 py-3 rounded-none text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Portfolio</span>
            </TabsTrigger>

            <TabsTrigger
              value="reviews"
              className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary px-4 py-3 rounded-none text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Star className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Reviews</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <TabsContent value="overview" className="space-y-6">
          <DashboardOverview />
        </TabsContent>

        <TabsContent value="jobs" className="space-y-6">
          <JobsSection />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <AnalyticsSection />
        </TabsContent>

        <TabsContent value="earnings" className="space-y-6">
          <EarningsSection />
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <MessagesSection />
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-6">
          <PortfolioSection />
        </TabsContent>

        <TabsContent value="reviews" className="space-y-6">
          <ReviewsSection />
        </TabsContent>
      </Tabs>
    </main>
  );
}