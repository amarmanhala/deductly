import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import type { BusinessTypeOption } from "@/services/business-type-service"

type BusinessTypeSelectProps = {
  id: string
  value: string
  options: BusinessTypeOption[]
  disabled?: boolean
  onValueChange: (value: string) => void
}

function decodeSvgText(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
}

function getBusinessSvgMarkup(imageUrl: string | null) {
  if (!imageUrl) {
    return null
  }

  const trimmedImageUrl = decodeSvgText(imageUrl.trim())
  const svgStartIndex = trimmedImageUrl.indexOf("<svg")

  if (svgStartIndex >= 0) {
    return trimmedImageUrl.slice(svgStartIndex)
  }

  return null
}

function getBusinessImageSrc(imageUrl: string | null) {
  if (!imageUrl) {
    return null
  }

  const svgMarkup = getBusinessSvgMarkup(imageUrl)

  if (svgMarkup) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`
  }

  return imageUrl.trim()
}

function BusinessTypeImage({
  imageUrl,
  className,
}: {
  imageUrl: string | null
  className: string
}) {
  const svgMarkup = getBusinessSvgMarkup(imageUrl)
  const imageSrc = getBusinessImageSrc(imageUrl)

  if (!svgMarkup && !imageSrc) {
    return null
  }

  if (svgMarkup) {
    return (
      <span
        aria-hidden="true"
        className={`${className} [&>svg]:size-full`}
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
    )
  }

  if (!imageSrc) {
    return null
  }

  return (
    <img src={imageSrc} alt="" className={className} />
  )
}

function BusinessTypeLabel({ option }: { option: BusinessTypeOption }) {
  const imageSrc = getBusinessImageSrc(option.image_url)

  return (
    <span className="flex min-w-0 flex-1 items-center">
      <span
        className="truncate"
        style={option.brand_color ? { color: option.brand_color } : undefined}
      >
        {option.name}
      </span>
      {imageSrc ? <span className="sr-only"> has image</span> : null}
    </span>
  )
}

export function BusinessTypeSelect({
  id,
  value,
  options,
  disabled,
  onValueChange,
}: BusinessTypeSelectProps) {
  const selectedOption = options.find((option) => option.name === value)
  const selectedImageSrc = getBusinessImageSrc(
    selectedOption?.image_url ?? null
  )

  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(nextValue) => {
        if (nextValue) {
          onValueChange(nextValue)
        }
      }}
    >
      <SelectTrigger id={id} className="w-full">
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span
            className="truncate"
            style={
              selectedOption?.brand_color
                ? { color: selectedOption.brand_color }
                : undefined
            }
          >
            {selectedOption?.name ?? value ?? "Select business"}
          </span>
          {selectedImageSrc ? (
            <BusinessTypeImage
              imageUrl={selectedOption?.image_url ?? null}
              className="size-5 shrink-0 rounded-sm object-contain"
            />
          ) : null}
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem
              key={option.id}
              value={option.name}
              className="pr-16 [&>span:first-child]:min-w-0"
            >
              <BusinessTypeLabel option={option} />
              <BusinessTypeImage
                imageUrl={option.image_url}
                className="pointer-events-none absolute right-8 top-1/2 size-5 -translate-y-1/2 rounded-sm object-contain"
              />
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
