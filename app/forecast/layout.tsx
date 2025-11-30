import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cash Flow | Cash Flow App",
};

export default function ForecastLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
