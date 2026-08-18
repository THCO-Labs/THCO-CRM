import { Calendar as CalendarIcon, X } from "lucide-react";

/**
 * One date field, used wherever a date is typed.
 *
 * The application had two of these. Contacts opened a popover calendar with
 * month and year dropdowns; the profile used the browser's own date control.
 * Neither is wrong, but having both meant picking a birthday looked like a
 * different task depending on which page you were on -- and only one of them
 * gives a phone the operating system's date wheel.
 *
 * Three things this deliberately does:
 *
 * - **One calendar symbol, on one side.** A native date input draws its own
 *   picker button on the right, so adding a decorative icon on the left put a
 *   calendar at each end of the same field. The browser's is hidden and ours
 *   is the only one.
 * - **The whole field opens the picker.** A native date input only responds to
 *   its own small button, which is a fiddly target and not where anyone aims.
 *   Clicking anywhere in the field opens the calendar.
 * - **The year is real.** Contacts used to be stored as day and month with the
 *   year pinned to 2000, which meant the year could be shown but never
 *   changed. Dates are now kept whole. Values still held in the old "DD-MM"
 *   form are read and shown so nothing already entered is lost.
 */

// Old contact records hold "DD-MM" with no year at all. There is no year to
// recover, so they are shown against this one until somebody sets a real date.
const LEGACY_YEAR = 2000;

const toInputValue = (value) => {
  if (!value) return "";
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const legacy = /^(\d{1,2})-(\d{1,2})$/.exec(text);
  if (legacy) {
    const [, d, m] = legacy;
    return `${LEGACY_YEAR}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return "";
};

export default function DateField({
  value,
  onChange,
  icon: Icon = CalendarIcon,
  disabled,
  className = "",
  "data-testid": testId,
  ...rest
}) {
  // showPicker throws if the field is not visible or the gesture is not
  // trusted, and older browsers do not have it at all. Either way the input
  // still works by typing, so a failure here must not break the field.
  const openPicker = (event) => {
    if (disabled) return;
    try {
      event.currentTarget.showPicker?.();
    } catch {
      /* typing still works */
    }
  };

  return (
    <div className="relative">
      <Icon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        type="date"
        value={toInputValue(value)}
        onChange={(e) => onChange(e.target.value)}
        onClick={openPicker}
        onFocus={openPicker}
        disabled={disabled}
        data-testid={testId}
        // bg-white and text-gray-900 are named so the dark-mode overrides
        // reach the field; without them it keeps a white background while its
        // text follows the theme to near-white.
        //
        // The native picker button is removed rather than merely faded, so it
        // cannot be clicked or tabbed to and leaves no gap on the right.
        className={`w-full pl-10 ${value ? "pr-9" : "pr-3"} py-2 bg-white text-gray-900 border border-[#EAE7E0] rounded-lg text-sm
          cursor-pointer
          [&::-webkit-calendar-picker-indicator]:hidden
          [&::-webkit-calendar-picker-indicator]:appearance-none
          focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] outline-none disabled:opacity-50 ${className}`}
        {...rest}
      />
      {value && !disabled && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear date"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-700"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
