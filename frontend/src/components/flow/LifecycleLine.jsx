// The lifecycle as one horizontal line.
//
// Six phase bars, and inside each one a marker for every stage it contains, so
// the whole thing reads as a number line: you can see which phase a project is
// in and how far through that phase it has got, without opening anything.
//
// The phase colours are kept rather than recoloured by completion. Gold on
// Validation already means "this phase waits on the client", and repainting by
// progress would throw that away to say something the position already says.
// Completion is carried by weight instead: done phases are solid, the current
// one is solid and labelled, phases still ahead are washed out.
//
// Nothing is expanded by default. Hovering or focusing a stage marker reveals
// what that stage is and what happens in it, and it disappears on leaving.

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Lock } from "lucide-react";

import { PHASES, PHASE_ORDER, STAGES, LAST_STAGE } from "../../pages/flow/stages";
import { Button } from "../ui/button";
import NextStepPanel from "./NextStepPanel";

const stagesInPhase = (phaseKey) =>
  Object.entries(STAGES)
    .filter(([, cfg]) => cfg.phase === phaseKey)
    .map(([num, cfg]) => ({ stage: Number(num), ...cfg }))
    .sort((a, b) => a.stage - b.stage);

export default function LifecycleLine({
  project,
  gate,
  onAdvance,
  canAdvance = false,
  me,
  onChanged,
}) {
  // A marker is a 6px-tall sliver and the panel opens 8px below it, so the
  // moment the pointer left the marker the panel would vanish before the
  // pointer physically arrived over it -- there is no such thing as "leaving
  // the marker straight down into the panel" without crossing dead space in
  // between. A short close delay, cancelled by re-entering either the marker
  // or the panel, bridges that gap instead of relying on adjacency.
  const [activeStage, setActiveStage] = useState(null);
  const closeTimer = useRef(null);
  const current = project.stage;
  const currentPhase = project.phase;
  const atEnd = current >= LAST_STAGE;

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const openStage = (stage) => {
    clearCloseTimer();
    setActiveStage(stage);
  };
  const scheduleClose = () => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setActiveStage(null), 400);
  };
  useEffect(() => clearCloseTimer, []);

  const detail = activeStage ? STAGES[activeStage] : null;
  const detailIsCurrent = activeStage === current;

  return (
    <div className="relative" data-testid="lifecycle-line">
      <div className="flex items-start justify-between gap-4 mb-1.5">
        <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
          Stage {current} of {LAST_STAGE} · {STAGES[current]?.label}
        </p>

        {/* Advancing lives beside the line rather than in a panel of its own.
            The dialog behind it is unchanged: an unmet gate still stops here
            and asks for a reason. */}
        {!atEnd && (
          <Button
            size="sm"
            variant="outline"
            disabled={!canAdvance}
            onClick={() => onAdvance(current + 1)}
            data-testid="lifecycle-advance-btn"
            title={canAdvance
              ? `Advance to ${STAGES[current + 1]?.label}`
              : "This project's TSD moves it through the pipeline, and its architect advances the stages they own"}
            className="h-7 shrink-0 text-[11px]"
          >
            {canAdvance ? null : <Lock className="w-3 h-3 mr-1" />}
            Advance
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>

      <div className="flex gap-1.5">
        {PHASE_ORDER.map((key) => {
          const phase = PHASES[key];
          const stages = stagesInPhase(key);
          const isCurrent = key === currentPhase;
          const isDone = stages.every((s) => s.stage < current);

          return (
            <div key={key} className="flex-1 min-w-0">
              {/* The phase bar. Solid once reached, washed out ahead. */}
              <div
                className="h-1.5 rounded-full flex gap-px overflow-hidden"
                style={{
                  backgroundColor: phase.accent,
                  opacity: isDone ? 0.85 : isCurrent ? 1 : 0.18,
                }}
              >
                {/* A marker per stage. The one the project is on is taller and
                    lighter, so the position reads at a glance. */}
                {stages.map((s) => (
                  <button
                    key={s.stage}
                    type="button"
                    onMouseEnter={() => openStage(s.stage)}
                    onMouseLeave={scheduleClose}
                    onFocus={() => openStage(s.stage)}
                    onBlur={scheduleClose}
                    aria-label={`Stage ${s.stage}: ${s.label}`}
                    data-testid={`lifecycle-marker-${s.stage}`}
                    className="flex-1 h-full transition-colors"
                    style={{
                      backgroundColor:
                        s.stage === current ? "rgba(255,255,255,0.85)"
                        : s.stage < current ? "transparent"
                        : "rgba(255,255,255,0.45)",
                    }}
                  />
                ))}
              </div>
              <p
                className={`mt-1 text-[10px] truncate ${
                  isCurrent ? "text-gray-900 font-medium" : "text-gray-400"
                }`}
              >
                {phase.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Revealed on hover, gone on leaving.
          For the stage the project is actually on this is the entire next-step
          panel: what happens next, who owns it, what is blocking, and what the
          stage involves. It was a permanent panel taking a screen of height to
          say something only relevant when somebody is asking. */}
      {detail && (
        <div
          className="absolute left-0 right-0 top-full mt-2 z-20"
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
          data-testid="lifecycle-detail"
        >
          {detailIsCurrent ? (
            <NextStepPanel
              project={project}
              gate={gate}
              onAdvance={onAdvance}
              refreshKey={`${project.stage}-${project.architect_id || "none"}`}
              me={me}
              onChanged={onChanged}
            />
          ) : (
            <div className="rounded-lg border border-[#EAE7E0] bg-white shadow-lg px-4 py-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-mono text-gray-400">STAGE {activeStage}</span>
                <span className="text-sm font-medium text-gray-900">{detail.label}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {activeStage < current ? "Already passed." : "Still ahead."}
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
