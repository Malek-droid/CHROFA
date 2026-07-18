'use strict';

const Appointment = require('../models/Appointment');
const Business = require('../models/Business');

/**
 * Backtracking match solver to see if overlapping appointments can be assigned
 * to available staff members, and returns the actual assignment if possible.
 *
 * @param {Array<string|null>} appointments - Array of staffName values requested/assigned
 * @param {Array<string>} staffList - Array of available staff names in the business
 * @returns {object} - { canAssign: boolean, assignments: Array<string|null> } where assignments
 *                     maps each appointment index to the assigned staff name or null
 */
function canAssignAppointments(appointments, staffList) {
  const assigned = new Set();
  const assignments = new Array(appointments.length).fill(null);
  
  function dfs(index) {
    if (index === appointments.length) return true;
    const apptStaff = appointments[index];
    
    for (const staff of staffList) {
      if (assigned.has(staff)) continue;
      
      // If appointment has no staff preference (null), any free staff can take it.
      // If it specifies a staff member, only that staff member can take it.
      if (!apptStaff || apptStaff.trim().toLowerCase() === staff.trim().toLowerCase()) {
        assigned.add(staff);
        assignments[index] = staff;
        if (dfs(index + 1)) return true;
        assigned.delete(staff);
        assignments[index] = null;
      }
    }
    return false;
  }
  
  const canAssign = dfs(0);
  return { canAssign, assignments };
}

/**
 * Create a UTC Date object corresponding to a local date and time in a specific IANA timezone.
 *
 * @param {string} dateStr - YYYY-MM-DD
 * @param {string} timeStr - HH:mm
 * @param {string} timezone - IANA timezone identifier
 * @returns {Date}
 */
function getLocalDateInTimezone(dateStr, timeStr, timezone) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);

  // Guess UTC time
  const tempDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  
  const parts = formatter.formatToParts(tempDate);
  let tzYear = year, tzMonth = month, tzDay = day, tzHour = hours, tzMinute = minutes;
  for (const part of parts) {
    if (part.type === 'year') tzYear = parseInt(part.value, 10);
    else if (part.type === 'month') tzMonth = parseInt(part.value, 10);
    else if (part.type === 'day') tzDay = parseInt(part.value, 10);
    else if (part.type === 'hour') tzHour = parseInt(part.value, 10);
    else if (part.type === 'minute') tzMinute = parseInt(part.value, 10);
  }
  
  if (tzHour === 24) tzHour = 0;
  
  const targetUtc = Date.UTC(year, month - 1, day, hours, minutes);
  const formattedUtc = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute);
  const diffMs = targetUtc - formattedUtc;
  
  return new Date(tempDate.getTime() + diffMs);
}

/**
 * Get day of week index (0 = Sunday, 6 = Saturday) for a local date string in a specific timezone.
 *
 * @param {string} dateStr - YYYY-MM-DD
 * @param {string} timezone - IANA timezone identifier
 * @returns {number}
 */
function getDayOfWeek(dateStr, timezone) {
  const localDate = getLocalDateInTimezone(dateStr, "12:00", timezone);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long'
  });
  const dayName = formatter.format(localDate);
  const dayMap = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6
  };
  return dayMap[dayName];
}

/**
 * Checks if a slot starting at a specific UTC date for a duration is available,
 * and returns the assigned staff member if available.
 *
 * @param {object} params
 * @param {string} params.businessId
 * @param {Date} params.date - UTC Date object (start time)
 * @param {number} params.durationMinutes
 * @param {string} [params.staffName] - Optional specific staff name
 * @param {string} [params.excludeAppointmentId] - Optional appointment ID to exclude (for update checks)
 * @param {number} [params.bufferBeforeMinutes] - Buffer time before appointment
 * @param {number} [params.bufferAfterMinutes] - Buffer time after appointment
 * @param {Array} [params.eligibleStaffIds] - Array of staff indices that can perform this service
 * @returns {Promise<{ available: boolean, assignedStaff: string | null }>}
 */
async function isSlotAvailable({ businessId, date, durationMinutes, staffName, excludeAppointmentId, bufferBeforeMinutes = 0, bufferAfterMinutes = 0, eligibleStaffIds = [] }) {
  const slotStart = new Date(date.getTime() - bufferBeforeMinutes * 60 * 1000);
  const slotEnd = new Date(date.getTime() + (durationMinutes + bufferAfterMinutes) * 60 * 1000);

  const business = await Business.findById(businessId);
  if (!business) return { available: false, assignedStaff: null };

  let staffNames = business.staff.map(s => s.name);

  // Filter staff by eligibleStaffIds if provided (staff indices in embedded array)
  if (eligibleStaffIds && eligibleStaffIds.length > 0) {
    const eligibleStaffNames = eligibleStaffIds
      .filter(id => id >= 0 && id < business.staff.length)
      .map(id => business.staff[id].name);
    
    if (eligibleStaffNames.length > 0) {
      staffNames = eligibleStaffNames;
    }
    // If eligibleStaffIds is empty or invalid, fall back to all staff
  }

  // If a specific staff is requested, verify they exist
  if (staffName && staffName !== 'none') {
    const exists = staffNames.some(name => name.toLowerCase() === staffName.toLowerCase());
    if (!exists) return { available: false, assignedStaff: null };
  }

  // Fetch all active appointments within a 24-hour window of the slot to cover timezone bounds
  const timeWindowStart = new Date(slotStart.getTime() - 24 * 60 * 60 * 1000);
  const timeWindowEnd = new Date(slotStart.getTime() + 24 * 60 * 60 * 1000);

  const query = {
    businessId,
    status: { $ne: 'cancelled' },
    date: { $gte: timeWindowStart, $lte: timeWindowEnd }
  };

  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }

  const appointments = await Appointment.find(query);

  // Exact overlap check in JS: aStart < bEnd && bStart < aEnd
  const overlapping = appointments.filter(appt => {
    const apptStart = appt.date.getTime();
    const apptEnd = apptStart + appt.durationMinutes * 60 * 1000;
    return apptStart < slotEnd.getTime() && slotStart.getTime() < apptEnd;
  });

  // Check assignment capability
  const allAppts = overlapping.map(a => a.staffName);
  const newApptStaff = (staffName && staffName !== 'none') ? staffName : null;
  allAppts.push(newApptStaff);

  const { canAssign, assignments } = canAssignAppointments(allAppts, staffNames);
  
  // The last element in assignments corresponds to our new appointment
  const assignedStaff = canAssign ? assignments[assignments.length - 1] : null;
  
  return { available: canAssign, assignedStaff };
}

/**
 * Returns list of available start times (HH:mm) on a given date for a service.
 *
 * @param {object} params
 * @param {string} params.businessId
 * @param {string} params.dateStr - YYYY-MM-DD
 * @param {string} params.serviceId
 * @param {string} [params.staffName]
 * @returns {Promise<Array<string>>}
 */
async function getAvailableSlots({ businessId, dateStr, serviceId, staffName }) {
  const business = await Business.findById(businessId);
  if (!business) {
    throw new Error('Business not found.');
  }

  const service = business.services.find(s => String(s._id) === serviceId);
  if (!service) {
    throw new Error('Service not found.');
  }

  const durationMinutes = service.durationMinutes;
  const dayIndex = getDayOfWeek(dateStr, business.timezone);
  const hoursEntry = business.openingHours.find(h => h.day === dayIndex);

  if (!hoursEntry || !hoursEntry.isOpen) {
    return [];
  }

  const { openTime, closeTime } = hoursEntry;
  if (!openTime || !closeTime) {
    return [];
  }

  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;

  const availableSlots = [];

  for (let hour = 0; hour < 24; hour++) {
    for (const min of [0, 30]) {
      const slotStartMin = hour * 60 + min;
      const slotEndMin = slotStartMin + durationMinutes;

      if (slotStartMin >= openMin && slotEndMin <= closeMin) {
        const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        const slotDate = getLocalDateInTimezone(dateStr, timeStr, business.timezone);
        
        const { available } = await isSlotAvailable({
          businessId,
          date: slotDate,
          durationMinutes,
          staffName
        });

        if (available) {
          availableSlots.push(timeStr);
        }
      }
    }
  }

  return availableSlots;
}

module.exports = {
  getLocalDateInTimezone,
  isSlotAvailable,
  getAvailableSlots
};
