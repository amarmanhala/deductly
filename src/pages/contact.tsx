import { Link } from "react-router-dom"

import { Seo } from "@/components/seo"
import { Button } from "@/components/ui/button"

export function ContactPage() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <Seo page="contact" />
      <section className="mx-auto flex min-h-svh w-full max-w-3xl flex-col justify-center px-4 py-16 text-center sm:px-6 lg:px-8">
        <Link
          to="/"
          className="mx-auto text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Gig Ledger
        </Link>
        <h1 className="mt-8 text-4xl font-semibold tracking-tight sm:text-5xl">
          Contact Gig Ledger
        </h1>
        <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
          Have questions about tracking expenses, receipts, tax deductions, or
          gig work records in Canada? Contact the Gig Ledger team.
        </p>
        <div className="mt-8">
          <Button render={<a href="mailto:hello@gigledger.ca" />}>
            hello@gigledger.ca
          </Button>
        </div>
      </section>
    </main>
  )
}
