import { Link } from "react-router-dom"

import { Seo } from "@/components/seo"
import { Button } from "@/components/ui/button"

const platformLogos = [
  {
    src: "/brands/uber-logo.svg",
    alt: "Uber",
    className: "h-10 dark:brightness-0 dark:invert",
    width: 2105,
    height: 1281,
  },
  {
    src: "/brands/uber-eats-logo.svg",
    alt: "Uber Eats",
    className: "h-9",
    width: 1388,
    height: 499,
  },
  {
    src: "/brands/lyft-logo.png",
    alt: "Lyft",
    className: "h-9",
    width: 1600,
    height: 1081,
  },
  {
    src: "/brands/skip-logo.svg",
    alt: "SkipTheDishes",
    className: "h-9",
    width: 120,
    height: 44,
  },
  {
    src: "/brands/doordash-logo.svg",
    alt: "DoorDash",
    className: "h-9",
    width: 628,
    height: 75,
  },
]

export function HomePage() {
  return (
    <main className="h-svh overflow-hidden bg-background text-foreground">
      <Seo page="home" />
      <header className="">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="text-base font-semibold tracking-tight"
            aria-label="Deductly home"
          >
            Deductly
          </Link>

          <nav className="flex items-center gap-2" aria-label="Main navigation">
            <Button variant="ghost" size="lg" render={<Link to="/login" />}>
              Log in
            </Button>
            <Button size="lg" render={<Link to="/sign-up" />}>
              Sign up
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto flex h-[calc(100svh-8rem)] w-full max-w-6xl flex-col items-center justify-center gap-10 px-4 text-center sm:px-6 lg:px-8">
        <div className="flex max-w-4xl flex-col items-center gap-6">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-6xl lg:text-5xl">
            Know what you earned, what you spent, and how to save more on taxes.
          </h1>
          <p className="max-w-2xl text-base leading-7 sm:text-lg">
            Deductly keeps your income, receipts, deductions, and tax
            set-asides in one clean view, so you can stop guessing and keep more
            of what you earn.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" render={<Link to="/sign-up" />}>
              Start free
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-col items-center">
          <p className="pb-6 text-xl font-medium">Built for gig workers</p>
          <div className="flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-5">
            {platformLogos.map((logo) => (
              <div
                key={logo.alt}
                className="flex h-10 w-32 items-center justify-center"
              >
                <img
                  src={logo.src}
                  alt={logo.alt}
                  width={logo.width}
                  height={logo.height}
                  className={`${logo.className} w-auto max-w-full object-contain`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="">
        <div className="mx-auto flex h-16 w-full max-w-6xl flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p>Deductly helps gig workers keep cleaner records.</p>
          <nav
            className="flex items-center gap-4 text-xs"
            aria-label="Footer navigation"
          >
            <a
              href="/privacy-policy"
              className="transition-colors hover:text-foreground"
            >
              Privacy Policy
            </a>
            <a
              href="/terms-of-use"
              className="transition-colors hover:text-foreground"
            >
              Terms of Use
            </a>
            <a
              href="/contact"
              className="transition-colors hover:text-foreground"
            >
              Contact
            </a>
          </nav>
        </div>
      </footer>
    </main>
  )
}
