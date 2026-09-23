import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App";
import ContestLandingPage from "./contest/ContestLandingPage";
import { isAppRouteHash } from "./hooks/useNavigation";
import "./index.css";

function RootRouter() {
  const [hasHashRoute, setHasHashRoute] = useState(() =>
    typeof window !== "undefined" ? isAppRouteHash(window.location.hash) : false
  );

  useEffect(() => {
    const syncRoute = () => setHasHashRoute(isAppRouteHash(window.location.hash));
    window.addEventListener("hashchange", syncRoute);
    window.addEventListener("popstate", syncRoute);
    return () => {
      window.removeEventListener("hashchange", syncRoute);
      window.removeEventListener("popstate", syncRoute);
    };
  }, []);

  return Capacitor.isNativePlatform() || hasHashRoute ? <App /> : <ContestLandingPage />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RootRouter />
  </StrictMode>,
);
