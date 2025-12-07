import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "./pages/Login";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { UsersPage } from "./pages/Users";
import { PurchasesPage } from "./pages/Purchases";
import { AnalyticsPage } from "./pages/Analytics";
import { PromoCodesPage } from "./pages/PromoCodes";
import { BlacklistPage } from "./pages/Blacklist";
import { useAuthStore } from "./store/authStore";

const theme = createTheme({
  primaryColor: "cyan",
  defaultRadius: "md",
  colors: {
    dark: [
      "#c9d1d9",
      "#b1bac4",
      "#8b949e",
      "#6e7681",
      "#484f58",
      "#30363d",
      "#21262d",
      "#161b22",
      "#0d1117",
      "#010409",
    ],
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

export function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Notifications />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/users" />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="promocodes" element={<PromoCodesPage />} />
            <Route path="blacklist" element={<BlacklistPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}
