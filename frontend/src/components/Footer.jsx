import { Zap, Mail, Github, Linkedin, Twitter } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-green-500 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <Link to="/" className="font-bold text-lg">SkillLink</Link>
            </div>
            <p className="text-foreground/60 text-sm leading-relaxed">
              Connect with world-class professionals. Find specialized skills for every need.
            </p>
          </div>

          {/* For Clients */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">For Clients</h4>
            <ul className="space-y-2 text-sm text-foreground/60">
              <li><Link to="#" className="hover:text-foreground transition-colors">How it Works</Link></li>
              <li><Link to="#" className="hover:text-foreground transition-colors">Browse Professionals</Link></li>
              <li><Link to="#" className="hover:text-foreground transition-colors">Pricing</Link></li>
              <li><Link to="#" className="hover:text-foreground transition-colors">Success Stories</Link></li>
            </ul>
          </div>

          {/* For Professionals */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">For Professionals</h4>
            <ul className="space-y-2 text-sm text-foreground/60">
              <li><Link to="#" className="hover:text-foreground transition-colors">Find Jobs</Link></li>
              <li><Link to="#" className="hover:text-foreground transition-colors">Build Profile</Link></li>
              <li><Link to="#" className="hover:text-foreground transition-colors">Earnings Guide</Link></li>
              <li><Link to="#" className="hover:text-foreground transition-colors">Community</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-foreground/60">
              <li><Link to="#" className="hover:text-foreground transition-colors">About</Link></li>
              <li><Link to="#" className="hover:text-foreground transition-colors">Blog</Link></li>
              <li><Link to="#" className="hover:text-foreground transition-colors">Contact</Link></li>
              <li><Link to="#" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border my-8" />

        {/* Bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-foreground/60">© 2025 SkillLink. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="text-foreground/60 hover:text-foreground transition-colors">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="#" className="text-foreground/60 hover:text-foreground transition-colors">
              <Linkedin className="w-5 h-5" />
            </a>
            <a href="#" className="text-foreground/60 hover:text-foreground transition-colors">
              <Github className="w-5 h-5" />
            </a>
            <a href="#" className="text-foreground/60 hover:text-foreground transition-colors">
              <Mail className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}