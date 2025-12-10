import { useEffect } from "react";

import { type CurrentEvent } from "~/lib/types/currentEvent";
import { api } from "~/trpc/react";

import { env } from "~/env";

const REFRESH_INTERVAL =
  env.NEXT_PUBLIC_NODE_ENV === "development" ? 1_000 : 5_000;

export default function useEventSync(initialCurrentEvent: CurrentEvent) {
  const { data: currentEvent } = api.event.getCurrent.useQuery<CurrentEvent | null>(
    undefined,
    {
      initialData: initialCurrentEvent,
      refetchInterval: REFRESH_INTERVAL,
    },
  );

  // Use initialCurrentEvent as fallback if currentEvent is null/undefined
  // This ensures we always have a valid CurrentEvent even during hydration
  const effectiveCurrentEvent: CurrentEvent = (currentEvent ?? initialCurrentEvent)!;

  const { data: event, refetch: refetchEvent } = api.event.get.useQuery(
    effectiveCurrentEvent?.id ?? "",
    {
      enabled: !!effectiveCurrentEvent?.id,
      refetchOnMount: true, // Always refetch when component mounts
      refetchOnWindowFocus: true, // Refetch when window regains focus
    },
  );

  // Extract phase safely - will be undefined if effectiveCurrentEvent is null (shouldn't happen)
  const phase = effectiveCurrentEvent?.phase;

  useEffect(() => {
    // Only refetch if we have both phase and eventId
    if (phase && effectiveCurrentEvent?.id) {
      refetchEvent();
    }
  }, [phase, effectiveCurrentEvent?.id, refetchEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  return { currentEvent: effectiveCurrentEvent, event: event!, refetchEvent };
}
