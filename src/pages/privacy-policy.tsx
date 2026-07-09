import { Link } from "react-router-dom"

import { Seo } from "@/components/seo"

export function PrivacyPolicyPage() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <Seo page="privacy" />
      <article className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Gig Ledger
        </Link>
        <h1 className="mt-8 text-4xl font-semibold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-4 text-muted-foreground">Last updated July 8, 2026.</p>

        <div className="mt-10 flex flex-col gap-8 text-base leading-7">
          <section>
            <h2 className="text-xl font-semibold">Information we collect</h2>
            <p className="mt-3 text-muted-foreground">
              Gig Ledger may collect account details, business profile
              information, transactions, receipt metadata, and app usage data
              that helps Canadian gig workers organize income, expenses,
              deductions, and tax-ready records.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">How we use information</h2>
            <p className="mt-3 text-muted-foreground">
              We use information to provide expense tracking, receipt
              management, tax set-aside views, authentication, support, product
              improvement, and security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Your records</h2>
            <p className="mt-3 text-muted-foreground">
              Gig Ledger is designed to help independent contractors keep
              business records organized. It does not replace professional tax,
              accounting, or legal advice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Contact</h2>
            <p className="mt-3 text-muted-foreground">
              For privacy questions, contact us through the{" "}
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
