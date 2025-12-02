import { type Attendee } from "@prisma/client";
import { useEffect, useState } from "react";

import { api } from "~/trpc/react";

export function useAttendee(eventId: string, initialUser?: { id: string; name?: string | null; email?: string | null; role?: string }) {
  const [attendee, setAttendee] = useState<Attendee>(() => {
    if (initialUser) {
      return {
        id: initialUser.id,
        name: initialUser.name ?? null,
        email: initialUser.email ?? null,
        type: initialUser.role ?? null,
        linkedin: null,
      } as Attendee;
    }
    return getLocalAttendee();
  });

  const { data: attendeeData } = api.attendee.upsert.useQuery({
    id: attendee.id,
    eventId: eventId,
  });
  const updateMutation = api.attendee.update.useMutation();

  useEffect(() => {
    setLocalAttendee(attendee);
  }, [attendee]);

  useEffect(() => {
    if (attendeeData) {
      setAttendee(attendeeData);
    }
  }, [attendeeData]);

  useEffect(() => {
    if (!attendee) return;
    // Only update if we have meaningful changes or if it's a new user
    // But be careful not to spam updates.
    // The original code updated on every change.
    updateMutation.mutate({
      id: attendee.id,
      name: attendee.name,
      email: attendee.email,
      linkedin: attendee.linkedin,
      type: attendee.type,
    });
  }, [attendee]); // eslint-disable-line react-hooks/exhaustive-deps

  return { attendee, setAttendee };
}

function getLocalAttendee(): Attendee {
  if (typeof window !== "undefined") {
    const attendee = localStorage.getItem("attendee");
    if (attendee) return JSON.parse(attendee);
  }
  // Fallback for when no session and no local storage (shouldn't happen with auth)
  const attendee = {
    id: crypto.randomUUID(),
    name: null,
    email: null,
    linkedin: null,
    type: null,
  };
  setLocalAttendee(attendee);
  return attendee;
}

function setLocalAttendee(attendee: Attendee) {
  if (typeof window === "undefined") return; // SSR guard
  localStorage.setItem("attendee", JSON.stringify(attendee));
}
