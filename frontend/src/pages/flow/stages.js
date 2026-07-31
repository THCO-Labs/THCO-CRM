// Shared THCO Flow stage constants — keep in sync with /app/backend/routers/flow.py STAGES
export const STAGES = {
  1:  { label: "New Client",              key: "new_client",          track: "main" },
  2:  { label: "Coordinator Picked",      key: "coordinator_picked",  track: "main" },
  3:  { label: "Meeting Scheduled",       key: "meeting_scheduled",   track: "main" },
  4:  { label: "Package Building",        key: "package_building",    track: "main" },
  5:  { label: "Send Package",            key: "send_package",        track: "main" },
  6:  { label: "Proposal",                key: "proposal",            track: "proposal" },
  7:  { label: "Executive Approval",      key: "exec_approval",       track: "proposal" },
  8:  { label: "Proposal Sent to Client", key: "proposal_sent",       track: "proposal" },
  9:  { label: "In Build (Engineering)",  key: "in_build",            track: "build" },
  10: { label: "Completed",               key: "completed",           track: "build" },
};

export const TRACK_COLOR = {
  main:     "border-gray-300",
  proposal: "border-indigo-400",
  build:    "border-emerald-500",
};

export const STAGE_BORDER = {
  1: "border-gray-300", 2: "border-blue-300", 3: "border-blue-400",
  4: "border-cyan-400", 5: "border-indigo-300",
  6: "border-indigo-400", 7: "border-amber-500", 8: "border-orange-400",
  9: "border-emerald-500", 10: "border-gray-500",
};

export const BUILD_STATUS_LABELS = {
  planning:     { label: "Planning",     color: "bg-gray-100 text-gray-700" },
  building:     { label: "Building",     color: "bg-blue-100 text-blue-700" },
  blocked:      { label: "Blocked",      color: "bg-red-100 text-red-700" },
  ready_for_qa: { label: "Ready for QA", color: "bg-emerald-100 text-emerald-700" },
};
