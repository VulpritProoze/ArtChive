import React from "react";
import { MainLayout } from "./MainLayout";

interface CollectiveLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showRightSidebar?: boolean;
}

export const CollectiveLayout: React.FC<CollectiveLayoutProps> = ({
  children,
  showSidebar = true,
  showRightSidebar = false,
}) => {
  return (
    <MainLayout showSidebar={showSidebar} showRightSidebar={showRightSidebar}>
      {children}
    </MainLayout>
  );
};
