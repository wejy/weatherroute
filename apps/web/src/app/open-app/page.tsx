import { Suspense } from "react";
import OpenAppClient from "./open-app-client";

export const dynamic = "force-dynamic";

export default function OpenAppPage() {
  return (
    <Suspense fallback={null}>
      <OpenAppClient />
    </Suspense>
  );
}
