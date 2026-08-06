import { Suspense } from "react";
import type { Metadata } from "next";
import OpenAppClient from "./open-app-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Open app",
  robots: { index: false, follow: false },
};

export default function OpenAppPage() {
  return (
    <Suspense fallback={null}>
      <OpenAppClient />
    </Suspense>
  );
}
