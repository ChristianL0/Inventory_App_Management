import { useEffect } from "react";

export default function Seo() {
  useEffect(() => {
    const isLoginPage =
      window.location.pathname === "/login" ||
      window.location.pathname === "/login/";

    let robotsMeta = document.querySelector(
      'meta[name="robots"]'
    ) as HTMLMetaElement | null;

    if (!robotsMeta) {
      robotsMeta = document.createElement("meta");
      robotsMeta.name = "robots";
      document.head.appendChild(robotsMeta);
    }

    robotsMeta.content = isLoginPage
      ? "index, follow"
      : "noindex, nofollow";
  }, []);

  return null;
}