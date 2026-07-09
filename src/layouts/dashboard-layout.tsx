import { Link, Outlet, useNavigate } from "react-router-dom"
import { useEffect, useState, type FormEvent } from "react"
import { BarChart3, FileText, LogOut, Moon, Sun, UserRound } from "lucide-react"
import { toast } from "sonner"

import { BusinessTypeSelect } from "@/components/business-type-select"
import { Seo } from "@/components/seo"
import { useTheme } from "@/components/theme-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/features/auth/auth-context"
import {
  businessTypeService,
  fallbackBusinessTypes,
  normalizeBusinessTypeValue,
  type BusinessTypeOption,
} from "@/services/business-type-service"
import {
  profileService,
  type ProfileDetails,
} from "@/services/profile-service"

const countryOptions = [
  { label: "Canada", value: "CA" },
  { label: "United States", value: "US" },
  { label: "India", value: "IN" },
  { label: "United Kingdom", value: "GB" },
  { label: "Australia", value: "AU" },
]

const currencyOptions = [
  { label: "CAD", value: "CAD" },
  { label: "USD", value: "USD" },
  { label: "INR", value: "INR" },
  { label: "GBP", value: "GBP" },
  { label: "AUD", value: "AUD" },
]

const themeOptions = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
]

type ProfileTheme = "light" | "dark"

function normalizeProfileTheme(value: string | null | undefined): ProfileTheme {
  return value === "dark" ? "dark" : "light"
}

function getDisplayName(user: ReturnType<typeof useAuth>["user"]) {
  const fullName = user?.user_metadata.full_name

  if (typeof fullName === "string" && fullName.trim()) {
    return fullName
  }

  return user?.email ?? "Account"
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function DashboardLayout() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [profileDetails, setProfileDetails] = useState<ProfileDetails | null>(
    null
  )
  const [profileName, setProfileName] = useState("")
  const [profileCountry, setProfileCountry] = useState("CA")
  const [profileCurrency, setProfileCurrency] = useState("CAD")
  const [businessTypes, setBusinessTypes] =
    useState<BusinessTypeOption[]>(fallbackBusinessTypes)
  const [profileBusinessType, setProfileBusinessType] = useState(
    fallbackBusinessTypes[0].name
  )
  const [profileTheme, setProfileTheme] = useState<ProfileTheme>(
    normalizeProfileTheme(theme)
  )
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [isProfileSaving, setIsProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState("")
  const displayName = getDisplayName(user)
  const initials = getInitials(displayName) || "U"
  const avatarUrl =
    typeof user?.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : undefined

  useEffect(() => {
    let isMounted = true

    async function loadProfileDetails() {
      if (!isProfileOpen || !user || isProfileSaving) {
        return
      }

      setIsProfileLoading(true)
      setProfileError("")

      try {
        const businessTypesRequest = businessTypeService
          .listBusinessTypes()
          .catch(() => fallbackBusinessTypes)
        const [details, nextBusinessTypes] = await Promise.all([
          profileService.getProfileDetails(user.id),
          businessTypesRequest,
        ])

        if (isMounted) {
          const nextOptions =
            nextBusinessTypes.length > 0
              ? nextBusinessTypes
              : fallbackBusinessTypes
          setProfileDetails(details)
          setBusinessTypes(nextOptions)
          setProfileName(details.profile?.full_name ?? displayName)
          setProfileCountry(details.profile?.country ?? "CA")
          setProfileCurrency(
            details.profile?.currency ??
              details.settings?.default_currency ??
              "CAD"
          )
          setProfileBusinessType(
            normalizeBusinessTypeValue(
              details.profile?.business_type,
              nextOptions
            )
          )
          setProfileTheme(normalizeProfileTheme(details.settings?.theme ?? theme))
        }
      } catch (error) {
        if (isMounted) {
          setProfileDetails(null)
          setProfileError(
            error instanceof Error
              ? error.message
              : "Unable to load profile details."
          )
        }
      } finally {
        if (isMounted) {
          setIsProfileLoading(false)
        }
      }
    }

    loadProfileDetails()

    return () => {
      isMounted = false
    }
  }, [displayName, isProfileOpen, isProfileSaving, theme, user])

  async function handleLogout() {
    await logout()
    navigate("/login", { replace: true })
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!user || isProfileSaving) {
      return
    }

    setIsProfileSaving(true)
    setProfileError("")

    try {
      const details = await profileService.updateProfile({
        userId: user.id,
        fullName: profileName.trim(),
        email: user.email ?? profileDetails?.profile?.email ?? null,
        country: profileCountry,
        currency: profileCurrency,
        businessType: profileBusinessType,
        theme: profileTheme,
        defaultBusinessPercentage:
          profileDetails?.settings?.default_business_percentage ?? 100,
        language: profileDetails?.settings?.language ?? null,
      })

      setIsProfileOpen(false)
      setProfileDetails(details)
      setTheme(profileTheme)
      window.dispatchEvent(
        new CustomEvent("profile-updated", {
          detail: {
            businessType: details.profile?.business_type,
            currency:
              details.profile?.currency ?? details.settings?.default_currency,
          },
        })
      )
      toast.success("Profile updated")
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : "Unable to update profile."
      )
    } finally {
      setIsProfileSaving(false)
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <Seo page="dashboard" />
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 lg:px-6">
          <Link
            to="/dashboard"
            className="mr-auto text-sm font-semibold tracking-tight"
          >
            Gig Ledger
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open account menu"
                />
              }
            >
              <Avatar size="sm">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-1">
                    <span>{displayName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                  <UserRound />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard/receipts")}>
                  <FileText />
                  Receipts
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/dashboard/my-profit")}
                >
                  <BarChart3 />
                  My Profit
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Theme</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun />
                  Light
                  {theme === "light" ? (
                    <span className="ml-auto text-xs text-muted-foreground">
                      Active
                    </span>
                  ) : null}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon />
                  Dark
                  {theme === "dark" ? (
                    <span className="ml-auto text-xs text-muted-foreground">
                      Active
                    </span>
                  ) : null}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Outlet />

      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle>Profile</DialogTitle>
                <DialogDescription>{user?.email}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {isProfileLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading profile...
            </p>
          ) : profileError ? (
            <p className="py-8 text-center text-sm text-destructive">
              {profileError}
            </p>
          ) : (
            <form className="flex flex-col gap-5" onSubmit={handleProfileSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="profileName">Name</Label>
                  <Input
                    id="profileName"
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    placeholder="Your name"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="profileEmail">Email</Label>
                  <Input
                    id="profileEmail"
                    value={user?.email ?? profileDetails?.profile?.email ?? ""}
                    readOnly
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="profileCountry">Country</Label>
                  <Select
                    value={profileCountry}
                    disabled
                    onValueChange={(value) => setProfileCountry(value ?? "CA")}
                  >
                    <SelectTrigger id="profileCountry" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {countryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="profileCurrency">Currency</Label>
                  <Select
                    value={profileCurrency}
                    disabled
                    onValueChange={(value) =>
                      setProfileCurrency(value ?? "CAD")
                    }
                  >
                    <SelectTrigger id="profileCurrency" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {currencyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="profileBusinessType">Business Type</Label>
                  <BusinessTypeSelect
                    id="profileBusinessType"
                    value={profileBusinessType}
                    options={businessTypes}
                    onValueChange={setProfileBusinessType}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="profileTheme">Theme</Label>
                  <Select
                    value={profileTheme}
                    onValueChange={(value) =>
                      setProfileTheme(normalizeProfileTheme(value))
                    }
                  >
                    <SelectTrigger id="profileTheme" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {themeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsProfileOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!profileName.trim() || isProfileSaving}
                >
                  {isProfileSaving ? "Saving..." : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
