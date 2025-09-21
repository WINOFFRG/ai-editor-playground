import { toast } from "sonner";

export function handleTokenAuth(): boolean {
  if (typeof window === "undefined") return false;

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  if (token) {
    fetch("/api/auth?token=" + encodeURIComponent(token))
      .then((response) => {
        if (response.ok) {
          toast.success("Authentication Successful", {
            description: "You have been logged in successfully.",
          });

          const url = new URL(window.location.href);
          url.searchParams.delete("token");
          window.history.replaceState({}, "", url.toString());
        } else {
          toast.error("Authentication Failed", {
            description: "Invalid token. Please check your authentication.",
          });
        }
      })
      .catch((error) => {
        toast.error("Authentication Error", {
          description: "Failed to authenticate. Please try again.",
        });
      });

    return true;
  }

  return false;
}
