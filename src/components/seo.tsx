import { useEffect } from "react"

import {
  absoluteUrl,
  defaultDescription,
  getPageJsonLd,
  seoRoutes,
  siteName,
  type SeoRouteKey,
} from "@/lib/seo"

function setMetaAttribute(
  selector: string,
  attributeName: "content" | "href",
  value: string
) {
  const existing = document.head.querySelector(selector)

  if (existing) {
    existing.setAttribute(attributeName, value)
    return
  }

  const element = selector.startsWith("link")
    ? document.createElement("link")
    : document.createElement("meta")

  if (selector.includes("rel=\"canonical\"")) {
    element.setAttribute("rel", "canonical")
  }

  const nameMatch = selector.match(/name="([^"]+)"/)
  if (nameMatch?.[1]) {
    element.setAttribute("name", nameMatch[1])
  }

  const propertyMatch = selector.match(/property="([^"]+)"/)
  if (propertyMatch?.[1]) {
    element.setAttribute("property", propertyMatch[1])
  }

  element.setAttribute(attributeName, value)
  document.head.appendChild(element)
}

export function Seo({ page }: { page: SeoRouteKey }) {
  useEffect(() => {
    const route = seoRoutes[page]
    const canonical = absoluteUrl(route.path)
    const image = absoluteUrl(route.image ?? "/og/gig-expense-tracker-canada.svg")
    const robots = route.robots ?? "index, follow"

    document.title = route.title
    setMetaAttribute('meta[name="description"]', "content", route.description)
    setMetaAttribute('meta[name="robots"]', "content", robots)
    setMetaAttribute('link[rel="canonical"]', "href", canonical)

    setMetaAttribute('meta[property="og:type"]', "content", "website")
    setMetaAttribute('meta[property="og:site_name"]', "content", siteName)
    setMetaAttribute('meta[property="og:title"]', "content", route.title)
    setMetaAttribute(
      'meta[property="og:description"]',
      "content",
      route.description
    )
    setMetaAttribute('meta[property="og:url"]', "content", canonical)
    setMetaAttribute('meta[property="og:image"]', "content", image)
    setMetaAttribute('meta[property="og:image:width"]', "content", "1200")
    setMetaAttribute('meta[property="og:image:height"]', "content", "630")

    setMetaAttribute('meta[name="twitter:card"]', "content", "summary_large_image")
    setMetaAttribute('meta[name="twitter:title"]', "content", route.title)
    setMetaAttribute(
      'meta[name="twitter:description"]',
      "content",
      route.description || defaultDescription
    )
    setMetaAttribute('meta[name="twitter:image"]', "content", image)

    const existingSchema = document.getElementById(
      "structured-data"
    ) as HTMLScriptElement | null
    const schema = existingSchema ?? document.createElement("script")
    schema.id = "structured-data"
    schema.type = "application/ld+json"
    schema.textContent = JSON.stringify(getPageJsonLd(page))

    if (!existingSchema) {
      document.head.appendChild(schema)
    }
  }, [page])

  return null
}
