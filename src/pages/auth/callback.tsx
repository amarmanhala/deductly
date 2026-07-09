import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import { Seo } from "@/components/seo"
import { Button } from "@/components/ui/button"
import { authService } from "@/services/auth-service"

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState("")

  useEffect(() => {
    let isMounted = true
    const code = searchParams.get("code")
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const hashError =
      hashParams.get("error_description") ?? hashParams.get("error")
    const accessToken = hashParams.get("access_token")
    const refreshToken = hashParams.get("refresh_token")

    const finishSignIn = async () => {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const currentSession = await authService.getSession()

        if (currentSession) {
          return
        }

        await new Promise((resolve) => window.setTimeout(resolve, 150))
      }

      if (hashError) {
        throw new Error(hashError)
      }

      if (accessToken && refreshToken) {
        await authService.setOAuthSession({ accessToken, refreshToken })
        window.history.replaceState(null, "", window.location.pathname)
        return
      }

      if (!code) {
        throw new Error(
          "No Google sign-in credentials were returned. Check that Supabase redirect URLs include this callback URL."
        )
      }

      await authService.exchangeOAuthCode(code)
    }

    finishSignIn()
      .then(() => {
        if (isMounted) {
          navigate("/dashboard", { replace: true })
        }
      })
      .catch((error) => {
        if (isMounted) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to complete Google sign-in."
          )
        }
      })

    return () => {
      isMounted = false
    }
  }, [navigate, searchParams])

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-5 py-10 text-center">
      <Seo page="login" />
      <div className="flex max-w-sm flex-col items-center gap-4">
        <h1 className="text-xl font-semibold">
          {error ? "Google sign-in failed" : "Finishing Google sign-in..."}
        </h1>
        {error ? (
          <>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button nativeButton={false} render={<Link to="/login" />}>
              Back to login
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            This should only take a moment.
          </p>
        )}
      </div>
    </main>
  )
}
