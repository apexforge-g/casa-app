"use client";

import BottomNav from "@/components/BottomNav";
import { DataProvider, useData } from "@/context/DataContext";
import { SkeletonPage } from "@/components/Skeleton";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { loading, user } = useData();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading) return <SkeletonPage />;
  if (!user) return null;

  return <>{children}</>;
}

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return (
    <DataProvider>
      <div className="min-h-screen pb-20">
        <LayoutInner>{children}</LayoutInner>
        <BottomNav />
      </div>
    </DataProvider>
  );
}
