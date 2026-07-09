import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { useNavigate } from "react-router-dom"
import { ArrowRight } from "lucide-react"

import { BusinessTypeSelect } from "@/components/business-type-select"
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
import {
  businessTypeService,
  fallbackBusinessTypes,
  normalizeBusinessTypeValue,
  type BusinessTypeOption,
} from "@/services/business-type-service"

export function SignUpPage() {
  const { continueWithGoogle, signUp } = useAuth()
  const navigate = useNavigate()
  const [businessTypes, setBusinessTypes] =
    useState<BusinessTypeOption[]>(fallbackBusinessTypes)
  const [businessType, setBusinessType] = useState(fallbackBusinessTypes[0].name)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadBusinessTypes() {
      try {
        const nextBusinessTypes = await businessTypeService.listBusinessTypes()

        if (isMounted && nextBusinessTypes.length > 0) {
          setBusinessTypes(nextBusinessTypes)
          setBusinessType((current) =>
            normalizeBusinessTypeValue(current, nextBusinessTypes)
          )
        }
      } catch {
        if (isMounted) {
          setBusinessTypes(fallbackBusinessTypes)
        }
      }
    }

    loadBusinessTypes()

    return () => {
      isMounted = false
    }
  }, [])

  async function handleGoogleSignUp() {
    setError("")
    setSuccess("")
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
    setSuccess("")

    const formData = new FormData(event.currentTarget)
    const fullName = String(formData.get("fullName") ?? "").trim()
    const email = String(formData.get("email") ?? "").trim()
    const password = String(formData.get("password") ?? "")

    if (!fullName || !email || !password || !businessType) {
      setError("Full name, email, business type, and password are required.")
      return
    }

    setIsSubmitting(true)

    try {
      const result = await signUp({
        fullName,
        email,
        password,
        businessType,
      })

      if (result.needsEmailConfirmation) {
        setSuccess("Check your email to confirm your account.")
        return
      }

      navigate("/dashboard", { replace: true })
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to create account."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <Seo page="signup" />
      <Card>
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>
            Set up a workspace for gig income, deductions, and receipts.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <Button
            className="w-full"
            type="button"
            variant="outline"
            onClick={handleGoogleSignUp}
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
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                type="text"
                name="fullName"
                autoComplete="name"
                placeholder="Maya Driver"
              />
            </div>

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
              <Label htmlFor="businessType">Business type</Label>
              <BusinessTypeSelect
                id="businessType"
                value={businessType}
                options={businessTypes}
                onValueChange={setBusinessType}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                name="password"
                autoComplete="new-password"
                placeholder="Create a password"
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {success ? (
              <p className="text-sm text-muted-foreground">{success}</p>
            ) : null}

            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create account"}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              className="font-medium text-foreground underline-offset-4 hover:underline"
              to="/login"
            >
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
