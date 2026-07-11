import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { useLocation, useNavigate } from "react-router-dom"
import { ArrowRight } from "lucide-react"

import { Seo } from "@/components/seo"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/features/auth/auth-context"

type RedirectState = {
  from?: {
    pathname?: string
  }
}

export function LoginPage() {
  const { continueWithGoogle, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)

  async function handleGoogleLogin() {
    setError("")
    setIsGoogleSubmitting(true)

    try {
      await continueWithGoogle()
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to continue with Google."
      )
      setIsGoogleSubmitting(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") ?? "").trim()
    const password = String(formData.get("password") ?? "")

    if (!email || !password) {
      setError("Email and password are required.")
      return
    }

    setIsSubmitting(true)

    try {
      await login({ email, password })

      const state = location.state as RedirectState | null
      navigate(state?.from?.pathname ?? "/dashboard", { replace: true })
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to log in.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <Seo page="login" />
      <Card>
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>
            Access your transactions, receipts, and tax-ready records.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <Button
            className="w-full"
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={isGoogleSubmitting || isSubmitting}
          >
            <span className="font-semibold">G</span>
            {isGoogleSubmitting ? "Connecting..." : "Continue with Google"}
          </Button>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="maya.driver@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="password123"
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Logging in..." : "Log in"}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            New to Deductly?{" "}
            <Link
              className="font-medium text-foreground underline-offset-4 hover:underline"
              to="/sign-up"
            >
              Create an account
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
