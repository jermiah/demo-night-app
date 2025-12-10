import HallOfFamePage from "../hall-of-fame/page";

import { api } from "~/trpc/server";
import { getBranding } from "~/lib/branding.server";

import Workspaces from "./components/Workspaces";

export async function generateMetadata() {
  const currentEvent = await api.event.getCurrent();
  const branding = await getBranding();
  return {
    title: currentEvent?.name ?? branding.appName,
    robots: {
      index: true,
      follow: true,
    },
    icons: [
      {
        rel: "icon",
        url: branding.isPitchNight ? "/favicon-pitch.ico" : "/favicon.ico",
      },
    ],
  };
}

import { getServerAuthSession } from "~/server/auth";
import { redirect } from "next/navigation";

export default async function AttendeePage() {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/login/audience");
  }

  const currentEvent = await api.event.getCurrent();
  if (!currentEvent) return <HallOfFamePage />;
  return (
    <main className="m-auto flex w-full flex-col text-black">
      <Workspaces currentEvent={currentEvent} user={session.user} />
    </main>
  );
}
