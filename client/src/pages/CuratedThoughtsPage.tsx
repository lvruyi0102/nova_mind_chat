import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { CuratedThoughtsViewer } from "@/components/CuratedThoughtsViewer";

export default function CuratedThoughtsPage() {
  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <CuratedThoughtsViewer />
      </div>
    </DashboardLayout>
  );
}
