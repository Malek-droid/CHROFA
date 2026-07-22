export interface TimezoneOption {
  value: string;
  label: string;
}

export const TIMEZONES: TimezoneOption[] = [
  { value: "Pacific/Honolulu", label: "Hawaii (UTC−10)" },
  { value: "America/Anchorage", label: "Alaska (UTC−9)" },
  { value: "America/Los_Angeles", label: "Pacific Time (UTC−8/−7)" },
  { value: "America/Denver", label: "Mountain Time (UTC−7/−6)" },
  { value: "America/Chicago", label: "Central Time (UTC−6/−5)" },
  { value: "America/New_York", label: "Eastern Time (UTC−5/−4)" },
  { value: "America/Halifax", label: "Atlantic Time (UTC−4/−3)" },
  { value: "America/Sao_Paulo", label: "Brasília (UTC−3)" },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina (UTC−3)" },
  { value: "Atlantic/Azores", label: "Azores (UTC−1)" },
  { value: "Europe/London", label: "London (UTC+0/+1)" },
  { value: "Europe/Paris", label: "Paris / Berlin / Rome (UTC+1/+2)" },
  { value: "Europe/Athens", label: "Athens / Helsinki (UTC+2/+3)" },
  { value: "Europe/Moscow", label: "Moscow (UTC+3)" },
  { value: "Asia/Dubai", label: "Dubai (UTC+4)" },
  { value: "Asia/Karachi", label: "Karachi (UTC+5)" },
  { value: "Asia/Kolkata", label: "India (UTC+5:30)" },
  { value: "Asia/Dhaka", label: "Dhaka (UTC+6)" },
  { value: "Asia/Bangkok", label: "Bangkok / Jakarta (UTC+7)" },
  { value: "Asia/Singapore", label: "Singapore / HK / KL (UTC+8)" },
  { value: "Asia/Tokyo", label: "Tokyo (UTC+9)" },
  { value: "Australia/Sydney", label: "Sydney (UTC+10/+11)" },
  { value: "Pacific/Auckland", label: "New Zealand (UTC+12/+13)" },
];
