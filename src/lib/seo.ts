export const siteOrigin = "https://gigledger.ca"
export const siteName = "Gig Ledger"
export const siteLogo = `${siteOrigin}/gig-ledger-logo.svg`
export const defaultTitle =
  "Gig Expense Tracker Canada | Track Expenses & Save on Taxes"
export const defaultDescription =
  "Track fuel, parking, maintenance, insurance, receipts, mileage and tax deductible expenses in one place. Built for Uber, Uber Eats, DoorDash and gig workers across Canada."

export type SeoRouteKey =
  | "home"
  | "privacy"
  | "terms"
  | "contact"
  | "login"
  | "signup"
  | "dashboard"

export type SeoMeta = {
  title: string
  description: string
  path: string
  robots?: string
  image?: string
}

export const seoRoutes: Record<SeoRouteKey, SeoMeta> = {
  home: {
    title: defaultTitle,
    description: defaultDescription,
    path: "/",
    image: "/og/gig-expense-tracker-canada.svg",
  },
  privacy: {
    title: "Privacy Policy | Gig Ledger",
    description:
      "Read the Gig Ledger privacy policy for Canadian gig workers using the expense tracker to organize income, receipts, deductions, and tax records.",
    path: "/privacy-policy",
  },
  terms: {
    title: "Terms of Use | Gig Ledger",
    description:
      "Review the Gig Ledger terms of use for the Canadian gig worker expense tracker and tax preparation workspace.",
    path: "/terms-of-use",
  },
  contact: {
    title: "Contact Gig Ledger | Gig Worker Expense Tracker Canada",
    description:
      "Contact Gig Ledger about expense tracking, receipt management, and tax-ready records for Canadian gig workers and independent contractors.",
    path: "/contact",
  },
  login: {
    title: "Log in | Gig Ledger",
    description:
      "Log in to Gig Ledger to access your Canadian gig work income, expenses, receipts, and tax set-aside records.",
    path: "/login",
    robots: "noindex, nofollow",
  },
  signup: {
    title: "Create Account | Gig Ledger",
    description:
      "Create a Gig Ledger account to track gig work expenses, receipts, deductions, and tax set-asides in Canada.",
    path: "/sign-up",
    robots: "noindex, nofollow",
  },
  dashboard: {
    title: "Dashboard | Gig Ledger",
    description:
      "Private Gig Ledger dashboard for income, expenses, receipts, and tax-ready records.",
    path: "/dashboard",
    robots: "noindex, nofollow",
  },
}

export function absoluteUrl(path: string) {
  if (path.startsWith("http")) {
    return path
  }

  return `${siteOrigin}${path.startsWith("/") ? path : `/${path}`}`
}

export function getOrganizationSchema() {
  return {
    "@type": "Organization",
    "@id": `${siteOrigin}/#organization`,
    name: siteName,
    url: siteOrigin,
    logo: {
      "@type": "ImageObject",
      url: siteLogo,
      width: 512,
      height: 512,
    },
  }
}

export function getWebsiteSchema() {
  return {
    "@type": "WebSite",
    "@id": `${siteOrigin}/#website`,
    name: siteName,
    url: siteOrigin,
    publisher: {
      "@id": `${siteOrigin}/#organization`,
    },
    inLanguage: "en-CA",
  }
}

export function getSoftwareApplicationSchema() {
  return {
    "@type": "SoftwareApplication",
    "@id": `${siteOrigin}/#software-application`,
    name: siteName,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: siteOrigin,
    description: defaultDescription,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "CAD",
    },
    audience: {
      "@type": "Audience",
      audienceType:
        "Uber drivers, Uber Eats drivers, DoorDash drivers, SkipTheDishes drivers, Instacart shoppers, Amazon Flex drivers, couriers, self-employed delivery drivers, and independent contractors in Canada",
    },
  }
}

export function getBreadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

export function getHomeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      getOrganizationSchema(),
      getWebsiteSchema(),
      getSoftwareApplicationSchema(),
    ],
  }
}

export function getPageJsonLd(page: SeoRouteKey) {
  if (page === "home") {
    return getHomeJsonLd()
  }

  const route = seoRoutes[page]

  return {
    "@context": "https://schema.org",
    "@graph": [
      getOrganizationSchema(),
      getBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: route.title.replace(` | ${siteName}`, ""), path: route.path },
      ]),
    ],
  }
}
