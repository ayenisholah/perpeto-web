"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/", "Overview"],
  ["/scanner", "Scanner"],
  ["/positions", "Positions"],
  ["/strategies", "Strategies"],
  ["/portfolio", "Portfolio"],
  ["/alerts", "Alerts"],
  ["/health", "Health"],
  ["/security", "Security"],
] as const;

export function Nav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
