"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("safesphere_session_token", "direct-login-token-stub");
      localStorage.setItem("user_phone", "+31 6 12345678");
    }
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans">
      <div className="flex flex-col items-center gap-4">
        <div className="size-12 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 font-extrabold text-xl animate-bounce">
          C
        </div>
        <div className="text-sm font-semibold tracking-wider text-teal-400 animate-pulse uppercase">
          Bypassing Authentication...
        </div>
      </div>
    </div>
  );
}
