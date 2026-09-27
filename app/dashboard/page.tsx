import DashboardClient from "./DashboardClient";

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { view } = await searchParams;
  const initialView = view === "report" || view === "search" || view === "about" ? view : "dashboard";
  return <DashboardClient initialView={initialView} />;
}
