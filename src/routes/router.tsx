import { lazy, Suspense, type ComponentType } from "react"
import { createBrowserRouter } from "react-router-dom"

import { ProtectedRoute } from "@/features/auth/protected-route"

const homePage = lazy(() =>
  import("@/pages/home").then((module) => ({ default: module.HomePage }))
)
const privacyPolicyPage = lazy(() =>
  import("@/pages/privacy-policy").then((module) => ({
    default: module.PrivacyPolicyPage,
  }))
)
const termsOfUsePage = lazy(() =>
  import("@/pages/terms-of-use").then((module) => ({
    default: module.TermsOfUsePage,
  }))
)
const contactPage = lazy(() =>
  import("@/pages/contact").then((module) => ({
    default: module.ContactPage,
  }))
)
const authLayout = lazy(() =>
  import("@/layouts/auth-layout").then((module) => ({
    default: module.AuthLayout,
  }))
)
const authCallbackPage = lazy(() =>
  import("@/pages/auth/callback").then((module) => ({
    default: module.AuthCallbackPage,
  }))
)
const loginPage = lazy(() =>
  import("@/pages/auth/login").then((module) => ({
    default: module.LoginPage,
  }))
)
const signUpPage = lazy(() =>
  import("@/pages/auth/sign-up").then((module) => ({
    default: module.SignUpPage,
  }))
)
const dashboardLayout = lazy(() =>
  import("@/layouts/dashboard-layout").then((module) => ({
    default: module.DashboardLayout,
  }))
)
const dashboardPage = lazy(() =>
  import("@/pages/dashboard").then((module) => ({
    default: module.DashboardPage,
  }))
)
const transactionsPage = lazy(() =>
  import("@/pages/transactions").then((module) => ({
    default: module.TransactionsPage,
  }))
)
const myProfitPage = lazy(() =>
  import("@/pages/my-profit").then((module) => ({
    default: module.MyProfitPage,
  }))
)
const receiptsPage = lazy(() =>
  import("@/pages/receipts").then((module) => ({
    default: module.ReceiptsPage,
  }))
)

function routeElement(Component: ComponentType) {
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: routeElement(homePage),
  },
  {
    path: "/privacy-policy",
    element: routeElement(privacyPolicyPage),
  },
  {
    path: "/terms-of-use",
    element: routeElement(termsOfUsePage),
  },
  {
    path: "/contact",
    element: routeElement(contactPage),
  },
  {
    path: "/auth/callback",
    element: routeElement(authCallbackPage),
  },
  {
    element: routeElement(authLayout),
    children: [
      {
        path: "/login",
        element: routeElement(loginPage),
      },
      {
        path: "/sign-up",
        element: routeElement(signUpPage),
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/dashboard",
        element: routeElement(dashboardLayout),
        children: [
          {
            index: true,
            element: routeElement(dashboardPage),
          },
          {
            path: "transactions",
            element: routeElement(transactionsPage),
          },
          {
            path: "my-profit",
            element: routeElement(myProfitPage),
          },
          {
            path: "receipts",
            element: routeElement(receiptsPage),
          },
        ],
      },
    ],
  },
])
