import { Outlet } from "react-router-dom"

export function AuthLayout() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-5 py-10 sm:px-8">
      <Outlet />
    </main>
  )
}
