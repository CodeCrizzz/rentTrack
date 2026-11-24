"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function TenantIndexRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "room") {
      router.replace("/tenant/my_room");
    } else if (tab === "payments") {
      router.replace("/tenant/bill_and_payment");
    } else {
      router.replace("/tenant/overview");
    }
  }, [router, searchParams]);

  return null;
}

export default function TenantHomePage() {
  return (
    <Suspense fallback={null}>
      <TenantIndexRedirect />
    </Suspense>
  );
}
