import { useEffect, useState } from "react";
import FlowShell from "./FlowShell";
import { flowAPI } from "../../lib/api";
import { Loader2, Cake, Award } from "lucide-react";

const ICON = { birthday: Cake, work_anniversary: Award, contract_anniversary: Award, holiday: Cake };
const COLOR = { birthday: "bg-pink-100 text-pink-700", work_anniversary: "bg-blue-100 text-blue-700" };

export default function FlowCalendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(90);

  useEffect(() => { flowAPI.listEvents(days).then(setEvents).finally(() => setLoading(false)); }, [days]);

  const grouped = events.reduce((acc, e) => {
    const bucket = e.days_until === 0 ? "Today" : e.days_until <= 7 ? "This week" : e.days_until <= 30 ? "This month" : "Later";
    acc[bucket] = acc[bucket] || [];
    acc[bucket].push(e);
    return acc;
  }, {});

  return (
    <FlowShell
      title="Calendar — birthdays & anniversaries"
      action={
        <select value={days} onChange={(e) => setDays(parseInt(e.target.value))} className="px-3 py-1.5 border border-gray-200 rounded-md text-sm" data-testid="calendar-range">
          <option value={7}>Next 7 days</option>
          <option value={30}>Next 30 days</option>
          <option value={90}>Next 90 days</option>
          <option value={365}>Next year</option>
        </select>
      }
    >
      {loading ? <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#1B4332]" /></div> :
        events.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100 text-gray-500">No events in the next {days} days.</div>
        ) : (
          <div className="space-y-6">
            {["Today", "This week", "This month", "Later"].map((bucket) => grouped[bucket] && (
              <div key={bucket}>
                <h3 className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-2">{bucket}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {grouped[bucket].map((e) => {
                    const Icon = ICON[e.event_type] || Cake;
                    return (
                      <div key={e.event_id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3" data-testid={`event-${e.event_id}`}>
                        <div className={`w-10 h-10 rounded-lg ${COLOR[e.event_type] || "bg-gray-100 text-gray-700"} flex items-center justify-center`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{e.contact_name}</p>
                          <p className="text-xs text-gray-500 capitalize">{e.event_type.replace("_", " ")}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[#1B4332]">{e.days_until === 0 ? "Today" : `${e.days_until}d`}</p>
                          <p className="text-[10px] text-gray-400">{e.next_occurrence}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
    </FlowShell>
  );
}
