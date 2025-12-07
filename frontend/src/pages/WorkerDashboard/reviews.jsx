// reviews.jsx
import { Card, CardContent } from "@/components/ui/card";
import { Star, MessageCircle } from "lucide-react";

const reviews = [
  {
    id: 1,
    author: "Sarah Johnson",
    company: "TechCorp Inc",
    rating: 5,
    title: "Exceptional work on dashboard development",
    review:
      "Amazing attention to detail and excellent communication throughout the project. Delivered on time and exceeded expectations.",
    date: "Dec 5, 2024",
    avatar: "SJ",
  },
  {
    id: 2,
    author: "Mike Chen",
    company: "StartupX",
    rating: 5,
    title: "Highly professional and skilled",
    review: "Very responsive to feedback and made iterations quickly. The final product was exactly what we needed.",
    date: "Dec 1, 2024",
    avatar: "MC",
  },
  {
    id: 3,
    author: "Emma Davis",
    company: "DataSync Ltd",
    rating: 4,
    title: "Great developer, good communication",
    review:
      "The API integration was completed smoothly. Would've appreciated more proactive updates during development.",
    date: "Nov 25, 2024",
    avatar: "ED",
  },
  {
    id: 4,
    author: "James Wilson",
    company: "WebAgency",
    rating: 5,
    title: "Outstanding quality and professionalism",
    review: "This is the third project we've worked together on. Consistently delivers high-quality work.",
    date: "Nov 20, 2024",
    avatar: "JW",
  },
];

export default function ReviewsSection() {
  const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
  const roundedAvg = Math.round(Number(avgRating));

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <Card className="border-border/50 bg-gradient-to-br from-primary/10 to-accent/10 backdrop-blur">
        <CardContent className="p-6">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-muted-foreground mb-1">Average Rating</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-foreground">{avgRating}</span>
                <span className="text-lg text-muted-foreground">/5</span>
              </div>
            </div>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={
                    i < roundedAvg
                      ? "w-6 h-6 text-yellow-400 fill-yellow-400"
                      : "w-6 h-6 text-muted-foreground"
                  }
                />
              ))}
            </div>
            <div className="ml-auto">
              <p className="text-sm text-muted-foreground mb-1">Total Reviews</p>
              <p className="text-3xl font-bold text-foreground">{reviews.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <Card
            key={review.id}
            className="border-border/50 bg-card/50 backdrop-blur hover:bg-card/70 transition-all duration-300"
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-chart-1 to-chart-2 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {review.avatar}
                </div>

                {/* Review Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{review.author}</h3>
                      <p className="text-sm text-muted-foreground">{review.company}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex gap-1 mb-1 justify-end">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={
                              i < review.rating
                                ? "w-4 h-4 text-yellow-400 fill-yellow-400"
                                : "w-4 h-4 text-muted-foreground"
                            }
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">{review.date}</p>
                    </div>
                  </div>

                  <h4 className="font-medium text-foreground mb-2">{review.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{review.review}</p>

                  <button className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    Reply
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}