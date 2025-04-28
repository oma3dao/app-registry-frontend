"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { OMA3_DOCS_URL, OMA3_WEBSITE_URL } from "@/config/app-config"

export function Navigation() {
  const pathname = usePathname()

  const links = [
    {
      name: "Docs",
      href: OMA3_DOCS_URL,
      isActive: false,
      isExternal: true
    },
    {
      name: "About",
      href: OMA3_WEBSITE_URL,
      isActive: false,
      isExternal: true
    }
  ]

  return (
    <nav className="border-b">
      <div className="flex h-20 items-center px-4 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center">
          <Image
            src="/OMA_logo.svg"
            alt="OMA3"
            width={160}
            height={42}
            priority
            className="w-auto h-10"
          />
        </Link>
        <div className="flex-1" />
        <div className="flex items-center space-x-8">
          {links.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "text-xl font-semibold transition-colors hover:text-primary px-4 py-2",
                link.isActive ? "text-primary" : "text-foreground",
                link.isExternal && "flex items-center",
                "font-sans"
              )}
              target={link.isExternal ? "_blank" : undefined}
              rel={link.isExternal ? "noopener noreferrer" : undefined}
            >
              {link.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}