import Link from 'next/link'
import { Video } from 'lucide-react'

export function Footer() {
  const links = [
    { href: '/terms', label: 'Terms of Service' },
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/safety', label: 'Safety' },
    { href: 'mailto:support@facechat.com', label: 'Contact' },
  ]

  return (
    <footer className="border-t border-border bg-bg-surface py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center">
              <Video className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold text-gradient">FACECHAT</span>
          </Link>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-xs text-text-muted hover:text-text-primary transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-xs text-text-muted">
            © {new Date().getFullYear()} FaceChat. 18+ only.
          </p>
        </div>
      </div>
    </footer>
  )
}
export default Footer;
