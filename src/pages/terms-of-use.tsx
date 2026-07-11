import { Link } from "react-router-dom"

import { Seo } from "@/components/seo"

export function TermsOfUsePage() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <Seo page="terms" />
      <article className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Deductly
        </Link>
        <h1 className="mt-8 text-4xl font-semibold tracking-tight">
          Terms of Use
        </h1>
        <p className="mt-4 text-muted-foreground">Last updated July 8, 2026.</p>

        <div className="mt-10 flex flex-col gap-8 text-base leading-7">
          <section>
            <h2 className="text-xl font-semibold">Use of Deductly</h2>
            <p className="mt-3 text-muted-foreground">
              Deductly provides software for tracking gig work income,
              receipts, deductible expenses, and tax set-asides. You are
              responsible for the accuracy of the information you enter.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">No tax advice</h2>
            <p className="mt-3 text-muted-foreground">
              The app helps organize records for Canadian gig workers and
              independent contractors, but it does not provide legal,
              accounting, or tax advice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Account security</h2>
            <p className="mt-3 text-muted-foreground">
              Keep your login information secure and notify us if you believe
              your account has been accessed without permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Contact</h2>
            <p className="mt-3 text-muted-foreground">
              Questions about these terms can be sent through the{" "}
              <Link to="/contact" className="text-foreground underline">
                contact page
              </Link>
              .
            </p>
          </section>
        </div>
      </article>
    </main>
  )
}
