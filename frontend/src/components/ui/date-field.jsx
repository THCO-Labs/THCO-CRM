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
 * `dayMonth` is for dates where the year is nobody's business: a birthday is
 * kept and shown as a day and a month. The control still needs a year to work
 * with, so it uses a fixed one internally and hands back "DD-MM". That keeps
 * what contacts already store unchanged while the field looks and behaves the
 * same as every other date on screen.
 */

// Any leap year, so 29 February can be chosen.
const PLACEHOLDER_YEAR = 2000;

const toInputValue = (value, dayMonth) => {
  if (!value) return "";
  if (!dayMonth) return value;                       // already YYYY-MM-DD
  const [d, m] = String(value).split("-");
  if (!d || !m) return "";
  return `${PLACEHOLDER_YEAR}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
};

const fromInputValue = (value, dayMonth) => {
  if (!value) return "";
  if (!dayMonth) return value;
  const [, m, d] = value.split("-");
  return `${d}-${m}`;
};

export default function DateField({
  value,
  onChange,
  dayMonth = false,
  icon: Icon = CalendarIcon,
  disabled,
  className = "",
  "data-testid": testId,
  ...rest
}) {
  return (
    <div className="relative">
      <Icon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        type="date"
        value={toInputValue(value, dayMonth)}
        onChange={(e) => onChange(fromInputValue(e.target.value, dayMonth))}
        disabled={disabled}
        data-testid={testId}
        // bg-white and text-gray-900 are named so the dark-mode overrides
        // reach the field; without them it keeps a white background while its
        // text follows the theme to near-white.
        className={`w-full pl-10 ${value ? "pr-9" : "pr-3"} py-2 bg-white text-gray-900 border border-[#EAE7E0] rounded-lg text-sm
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
