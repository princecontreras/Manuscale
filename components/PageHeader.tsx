import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { Logo } from './Logo';

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Array<{
    label: string;
    href: string;
  }>;
}

export default function PageHeader({ 
  title, 
  description,
  breadcrumbs = []
}: PageHeaderProps) {
  return (
    <div className="border-b border-slate-200">
      {/* Top Navigation Bar */}
      <div className="bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <Logo className="scale-75 sm:scale-90" />
          </Link>
          
          {/* Breadcrumbs on desktop */}
          <nav className="hidden md:flex items-center gap-1 text-sm">
            <Link 
              href="/" 
              className="flex items-center gap-1 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <Home size={16} />
              <span>Home</span>
            </Link>
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-1">
                <ChevronRight size={16} className="text-slate-300" />
                {index === breadcrumbs.length - 1 ? (
                  <span className="text-slate-900 font-medium">{crumb.label}</span>
                ) : (
                  <Link 
                    href={crumb.href}
                    className="text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>

          {/* Mobile back button */}
          <Link 
            href="/"
            className="md:hidden text-slate-600 hover:text-slate-900 font-medium text-sm"
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* Page Title Section */}
      <div className="bg-gradient-to-b from-slate-50 to-white px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            {title}
          </h1>
          {description && (
            <p className="text-lg text-slate-600">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
