"use client";

import { WorkspaceContext } from "../contexts/WorkspaceContext";
import { useAttendee } from "../hooks/useAttendee";
import useEventSync from "../hooks/useEventSync";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { animationVariants } from "~/lib/animation";
import { type CurrentEvent, EventPhase } from "~/lib/types/currentEvent";
import { type EventConfig, eventConfigSchema } from "~/lib/types/eventConfig";

import LoadingScreen from "~/components/loading/LoadingScreen";

import DemosWorkspace from "./DemosWorkspace";
import EventHeader from "./EventHeader";
import PreWorkspace from "./PreWorkspace";
import RecapWorkspace from "./RecapWorkspace";
import ResultsWorkspace from "./ResultsWorkspace";
import VotingWorkspace from "./VotingWorkspace";

import { type Session } from "next-auth";

export default function Workspaces({
  currentEvent: initialCurrentEvent,
  user,
}: {
  currentEvent: CurrentEvent;
  user?: Session["user"];
}) {
  const { currentEvent, event } = useEventSync(initialCurrentEvent);
  const [config, setConfig] = useState<EventConfig>(
    eventConfigSchema.parse(event?.config ?? {}),
  );
  const { attendee, setAttendee } = useAttendee(
    currentEvent?.id ?? initialCurrentEvent.id,
    user,
  );

  useEffect(() => {
    if (event) {
      setConfig(eventConfigSchema.parse(event.config));
    }
  }, [event]);

  // Show loading if currentEvent is not yet available
  if (!currentEvent) {
    return <LoadingScreen />;
  }

  function workspace() {
    switch (currentEvent?.phase) {
      case EventPhase.Pre:
        return <PreWorkspace />;
      case EventPhase.Demos:
        if (!event || !event.demos.length) return <LoadingScreen />;
        return <DemosWorkspace />;
      case EventPhase.Voting:
        console.log("[Workspaces] Voting phase - event:", {
          hasEvent: !!event,
          eventId: event?.id,
          oneVsOneMode: event?.oneVsOneMode,
        });
        if (!event) return <LoadingScreen />;
        return <VotingWorkspace />;
      case EventPhase.Results:
        if (!event) return <LoadingScreen />;
        return <ResultsWorkspace />;
      case EventPhase.Recap:
        if (!event || !event.awards.length || !event.demos.length)
          return <LoadingScreen />;
        return <RecapWorkspace />;
    }
  }

  return (
    <WorkspaceContext.Provider
      value={{ currentEvent, event, attendee, setAttendee, config }}
    >
      <EventHeader />
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={currentEvent?.phase}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={animationVariants}
          className="size-full min-h-[calc(100dvh)] flex-1"
        >
          <div className="size-full min-h-[calc(100dvh)] pt-20">
            {workspace()}
          </div>
        </motion.div>
      </AnimatePresence>
    </WorkspaceContext.Provider>
  );
}
