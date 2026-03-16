import { useState, useEffect } from "react";
import { Home } from "./pages/home";
import Passport from "./pages/passport";
import Admin from "./pages/admin";

function getPage() {
  const hash = window.location.hash;
  if (hash === "#/passport") return "passport";
  if (hash === "#/admin") return "admin";
  return "home";
}

export default function App() {
  const [page, setPage] = useState(getPage);

  useEffect(() => {
    const onHash = () => setPage(getPage());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (page === "passport") return <Passport />;
  if (page === "admin") return <Admin />;
  return <Home />;
}
