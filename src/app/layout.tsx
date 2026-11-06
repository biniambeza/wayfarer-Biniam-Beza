import type { Metadata } from "next";
import Link from "next/link";
import { ActingUserProvider } from "@/components/acting-user-provider";
import { UserSwitcher } from "@/components/user-switcher";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wayfarer",
  description: "Honest ratings and fair tour bookings for travellers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ActingUserProvider>
          <header className="border-b border-stone-200 bg-white">
            <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3">
              <Link href="/" className="text-lg font-semibold text-stone-900">
                Wayfarer
              </Link>
              <UserSwitcher />
            </div>
          </header>
          <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
            {children}
          </main>
        </ActingUserProvider>
      </body>
    </html>
  );
}
