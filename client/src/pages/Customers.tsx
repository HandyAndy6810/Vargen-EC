import { useEffect } from "react";
import { useLocation } from "wouter";

// Redirect old /customers route to the unified /contacts page
export default function Customers() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/contacts"); }, [setLocation]);
  return null;
}
