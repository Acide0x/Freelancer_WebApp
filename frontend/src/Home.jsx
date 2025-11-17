import { useState, useEffect, useRef } from "react"
import { 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Award, 
  Shield, 
  Users, 
  Zap, 
  Search, 
  Quote, 
  Star 
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from './components/ui/button'; // Adjust path as needed
import Navbar from './components/navbar';
import Footer from './components/footer';
import { useInView } from './hooks/use-in-view'; // Keep this custom hook as-is

// ======================== HERO SECTION ========================
function HeroSection() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/30 py-20 md:py-32">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '0s' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '1s' }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '2s' }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className={`space-y-8 ${isLoaded ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-full border border-blue-500/20">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-blue-600">
                Get Expert Help When You Need It
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
              Find Expert Tradespeople
              <span className="block bg-gradient-to-r from-blue-600 via-cyan-500 to-green-500 bg-clip-text text-transparent">
                For Every Project
              </span>
            </h1>

            <p className="text-xl text-foreground/70 leading-relaxed max-w-xl">
              Connect with vetted electricians, plumbers, technicians, chefs, and specialized professionals.
              Find the right expert for your home, business, or event. Reliable, professional, and always available.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white text-lg h-12">
                Book a Professional <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg h-12">
                Browse Services
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div>
                <div className="text-3xl font-bold text-blue-600">25K+</div>
                <p className="text-sm text-foreground/60">Expert Professionals</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600">200+</div>
                <p className="text-sm text-foreground/60">Services Available</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-cyan-500">50K+</div>
                <p className="text-sm text-foreground/60">Jobs Completed</p>
              </div>
            </div>
          </div>

          {/* Right Visual */}
          <div className={`relative ${isLoaded ? 'animate-scale-in' : 'opacity-0'}`} style={{ animationDelay: '0.2s' }}>
            <div className="relative w-full aspect-square">
              <div className="absolute inset-0 grid grid-cols-2 gap-4 p-4">
                {[
                  { icon: '⚡', title: 'Electrical', color: 'from-yellow-500 to-orange-500' },
                  { icon: '🔧', title: 'Plumbing', color: 'from-blue-500 to-cyan-500' },
                  { icon: '👷', title: 'Construction', color: 'from-amber-600 to-orange-600' },
                  { icon: '👨‍🍳', title: 'Catering', color: 'from-red-500 to-pink-500' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`bg-gradient-to-br ${item.color} p-6 rounded-2xl text-white font-semibold flex flex-col items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-shadow duration-300 animate-fade-in-up`}
                    style={{ animationDelay: `${0.3 + idx * 0.1}s` }}
                  >
                    <span className="text-4xl">{item.icon}</span>
                    <span className="text-sm text-center">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ======================== SKILLS CAROUSEL ========================
const skills = [
  { name: 'Electricians', icon: '⚡', count: '3.2K+' },
  { name: 'Plumbers', icon: '🔧', count: '2.8K+' },
  { name: 'HVAC Technicians', icon: '❄️', count: '1.9K+' },
  { name: 'Construction', icon: '👷', count: '4.5K+' },
  { name: 'House Cleaning', icon: '🧹', count: '5.1K+' },
  { name: 'Catering & Chefs', icon: '👨‍🍳', count: '2.3K+' },
  { name: 'Home Repair', icon: '🏠', count: '3.7K+' },
  { name: 'Landscaping', icon: '🌳', count: '2.6K+' },
  { name: 'Painting', icon: '🎨', count: '3.4K+' },
  { name: 'Carpentry', icon: '🪛', count: '2.9K+' },
  { name: 'Automotive', icon: '🚗', count: '2.1K+' },
  { name: 'IT Support', icon: '💻', count: '2.4K+' },
];

function SkillsCarousel() {
  const [current, setCurrent] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);

  useEffect(() => {
    if (!isAutoplay) return;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % skills.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [isAutoplay]);

  const next = () => {
    setCurrent((prev) => (prev + 1) % skills.length);
    setIsAutoplay(false);
  };

  const prev = () => {
    setCurrent((prev) => (prev - 1 + skills.length) % skills.length);
    setIsAutoplay(false);
  };

  const visibleSkills = [];
  for (let i = 0; i < 4; i++) {
    visibleSkills.push(skills[(current + i) % skills.length]);
  }

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Explore{' '}
            <span className="bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
              All Services
            </span>
          </h2>
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
            From electrical work to catering, find specialized professionals for any need.
          </p>
        </div>

        <div className="relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {visibleSkills.map((skill, idx) => (
              <div
                key={idx}
                className="group p-6 bg-card border border-border rounded-xl hover:border-blue-600 hover:shadow-lg transition-all duration-300 cursor-pointer animate-fade-in-up"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">
                  {skill.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">{skill.name}</h3>
                <p className="text-sm text-blue-600 font-medium">{skill.count} professionals</p>
                <div className="mt-4 w-full h-1 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-600 to-green-500 group-hover:w-full w-1/2 transition-all duration-300" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center mt-8">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={prev}
                className="hover:bg-blue-600 hover:text-white hover:border-blue-600"
              >
                ←
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={next}
                className="hover:bg-blue-600 hover:text-white hover:border-blue-600"
              >
                →
              </Button>
            </div>

            <div className="flex gap-1">
              {skills.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrent(idx);
                    setIsAutoplay(false);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    idx === current ? 'bg-blue-600 w-8' : 'bg-border w-2 hover:bg-blue-600/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ======================== FEATURES SECTION ========================
const features = [
  {
    icon: CheckCircle2,
    title: 'Verified Professionals',
    description:
      'All tradespeople are background checked, insured, and licensed in their respective fields.',
  },
  {
    icon: Clock,
    title: 'Quick Booking',
    description: 'Book professionals for same-day or next-day appointments. No waiting, no hassle.',
  },
  {
    icon: Award,
    title: 'Rated & Reviewed',
    description: 'See detailed ratings and reviews from real customers before you hire.',
  },
  {
    icon: Shield,
    title: 'Guaranteed Protection',
    description: "Money-back guarantee if you're not satisfied with the work. We protect both sides.",
  },
  {
    icon: Users,
    title: 'Direct Communication',
    description: 'Chat directly with professionals before hiring. Ask questions and get instant answers.',
  },
  {
    icon: Zap,
    title: 'Transparent Pricing',
    description: 'Fixed upfront pricing with no hidden fees. Know exactly what you’ll pay.',
  },
];

function FeaturesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { threshold: 0.1 });

  return (
    <section
      className="py-20 md:py-32 bg-gradient-to-b from-background via-muted/20 to-background"
      ref={ref}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Why Choose{' '}
            <span className="bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
              SkillLink
            </span>
          </h2>
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
            The most reliable way to find and hire skilled professionals you can trust.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className={`group p-8 bg-card border border-border rounded-xl hover:border-blue-600 hover:shadow-lg hover:bg-card/50 transition-all duration-300 ${
                  inView ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="w-12 h-12 bg-blue-600/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600/20 transition-colors">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">{feature.title}</h3>
                <p className="text-foreground/60 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ======================== STATISTICS SECTION ========================
const stats = [
  { number: 50, label: 'Thousand+ Experts', suffix: 'K' },
  { number: 500, label: 'Skills Categories', suffix: '+' },
  { number: 10, label: 'Million+ Hours', suffix: 'M' },
  { number: 98, label: 'Client Satisfaction', suffix: '%' },
];

function Counter({ target, suffix }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    let current = 0;
    const increment = target / 50;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 30);

    return () => clearInterval(timer);
  }, [isVisible, target]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
        {count}
        {suffix}
      </div>
    </div>
  );
}

function StatisticsSection() {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-r from-blue-600/5 via-background to-green-500/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 md:gap-4">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="text-center space-y-3 p-6 rounded-xl hover:bg-card/50 transition-colors duration-300 animate-fade-in-up"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <Counter target={stat.number} suffix={stat.suffix} />
              <p className="text-foreground/70 text-lg">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ======================== HOW IT WORKS ========================
const steps = [
  {
    icon: Search,
    number: '01',
    title: 'Post Your Project',
    description:
      'Share your project details, budget, and timeline with our community of experts.',
  },
  {
    icon: Users,
    number: '02',
    title: 'Get Matched Instantly',
    description:
      "Our AI matches you with the most qualified freelancers for your specific needs.",
  },
  {
    icon: Zap,
    number: '03',
    title: 'Collaborate Seamlessly',
    description:
      'Use our built-in tools to communicate, share files, and track progress in real-time.',
  },
  {
    icon: CheckCircle2,
    number: '04',
    title: 'Pay Securely',
    description:
      'Release payments safely through milestone-based payments with full protection.',
  },
];

function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { threshold: 0.1 });

  return (
    <section className="py-20 md:py-32 bg-background" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            How It{' '}
            <span className="bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
              Works
            </span>
          </h2>
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
            Get started in minutes. From posting to delivery, here's how simple it is.
          </p>
        </div>

        <div className="relative">
          <div className="hidden md:block absolute top-20 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-green-500 opacity-20" />

          <div className="grid md:grid-cols-4 gap-8 relative z-10">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={idx}
                  className={`flex flex-col items-center text-center ${
                    inView ? 'animate-fade-in-up' : 'opacity-0'
                  }`}
                  style={{ animationDelay: `${idx * 0.15}s` }}
                >
                  <div className="relative mb-6">
                    <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center border-2 border-blue-600/30 hover:border-blue-600/60 transition-colors">
                      <Icon className="w-8 h-8 text-blue-600" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-foreground/60 text-sm leading-relaxed">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ======================== TESTIMONIALS ========================
const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Homeowner',
    company: 'New York',
    content:
      'Found a fantastic electrician within 2 hours. Professional, affordable, and they fixed everything perfectly. Highly recommend!',
    rating: 5,
    avatar: '👩‍💼',
  },
  {
    name: 'Marcus Johnson',
    role: 'Business Owner',
    company: 'Los Angeles',
    content:
      'Hiring plumbers used to be stressful. SkillLink made it easy and transparent. Great communication and fair pricing.',
    rating: 5,
    avatar: '👨‍💼',
  },
  {
    name: 'Priya Patel',
    role: 'Event Coordinator',
    company: 'Chicago',
    content:
      "The best catering and event professionals I've worked with. SkillLink's vetting process gives me confidence every time.",
    rating: 5,
    avatar: '👩‍🔬',
  },
];

function TestimonialSection() {
  const [current, setCurrent] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);

  useEffect(() => {
    if (!isAutoplay) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isAutoplay]);

  return (
    <section className="py-20 md:py-32 bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Loved by{' '}
            <span className="bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
              Clients & Professionals
            </span>
          </h2>
          <p className="text-xl text-foreground/60">Join thousands of successful projects</p>
        </div>

        <div className="relative">
          {testimonials.map((testimonial, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-500 ${
                idx === current ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <div className="bg-card border border-border rounded-2xl p-8 md:p-12 text-center">
                <Quote className="w-8 h-8 text-blue-600/30 mx-auto mb-4" />

                <p className="text-2xl font-semibold text-foreground mb-6">
                  "{testimonial.content}"
                </p>

                <div className="flex justify-center mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-green-500 text-green-500" />
                  ))}
                </div>

                <div className="flex items-center justify-center gap-4">
                  <span className="text-4xl">{testimonial.avatar}</span>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-sm text-foreground/60">
                      {testimonial.role} - {testimonial.company}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="relative h-20 flex items-center justify-center gap-2 mt-12">
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrent(idx);
                  setIsAutoplay(false);
                }}
                className={`w-3 h-3 rounded-full transition-all ${
                  idx === current ? 'bg-blue-600 w-8' : 'bg-border hover:bg-blue-600/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ======================== CTA SECTION ========================
function CTASection() {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-r from-blue-600 via-cyan-500 to-green-500 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
          Ready to Transform Your Projects?
        </h2>
        <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
          Join thousands of companies and professionals who are already experiencing the power of SkillLink.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-white text-blue-600 hover:bg-white/90 text-lg h-12">
            Start Free Trial <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg h-12">
            Schedule Demo
          </Button>
        </div>

        <p className="text-white/70 text-sm mt-8">No credit card required • Free for 30 days</p>
      </div>
    </section>
  );
}

// ======================== HOME PAGE ========================
export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <SkillsCarousel />
      <FeaturesSection />
      <StatisticsSection />
      <HowItWorks />
      <TestimonialSection />
      <CTASection />
    </div>
  );
}