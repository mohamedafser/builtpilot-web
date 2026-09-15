import { SignupAuthPanel } from "@/components/auth/signup-auth-panel";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignupPage() {
  return <SignupAuthPanel />;
}
