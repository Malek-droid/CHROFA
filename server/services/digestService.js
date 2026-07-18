'use strict';

const Appointment = require('../models/Appointment');

/**
 * Get weekly digest data for a business.
 * Returns aggregated stats for the past 7 days and upcoming 7 days.
 *
 * @param {string} businessId
 * @param {Date} now - Current date (for testing)
 * @returns {Promise<object>} Digest data
 */
async function getWeeklyDigestData(businessId, now = new Date()) {
  // Past 7 days
  const past7DaysStart = new Date(now);
  past7DaysStart.setDate(now.getDate() - 7);
  past7DaysStart.setHours(0, 0, 0, 0);

  // Upcoming 7 days
  const upcoming7DaysEnd = new Date(now);
  upcoming7DaysEnd.setDate(now.getDate() + 7);
  upcoming7DaysEnd.setHours(23, 59, 59, 999);

  // Past week stats
  const pastAppointments = await Appointment.find({
    businessId,
    date: { $gte: past7DaysStart, $lt: now },
  });

  const totalBooked = pastAppointments.filter(a => a.status !== 'cancelled').length;
  const cancelledCount = pastAppointments.filter(a => a.status === 'cancelled').length;
  const noShowCount = pastAppointments.filter(a => a.status === 'no-show').length;

  // Most booked service
  const serviceCounts = {};
  pastAppointments.forEach(a => {
    if (a.status !== 'cancelled') {
      serviceCounts[a.service] = (serviceCounts[a.service] || 0) + 1;
    }
  });
  const mostBookedService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0];

  // Upcoming week stats
  const upcomingAppointments = await Appointment.find({
    businessId,
    date: { $gte: now, $lte: upcoming7DaysEnd },
    status: { $ne: 'cancelled' },
  });

  const upcomingCount = upcomingAppointments.length;

  // Busiest day of upcoming week
  const dayCounts = {};
  upcomingAppointments.forEach(a => {
    const day = a.date.toDateString();
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });
  const busiestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];

  return {
    pastWeek: {
      totalBooked,
      cancelledCount,
      noShowCount,
      mostBookedService: mostBookedService ? mostBookedService[0] : null,
      mostBookedServiceCount: mostBookedService ? mostBookedService[1] : 0,
    },
    upcomingWeek: {
      totalScheduled: upcomingCount,
      busiestDay: busiestDay ? new Date(busiestDay[0]).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }) : null,
      busiestDayCount: busiestDay ? busiestDay[1] : 0,
    },
  };
}

module.exports = { getWeeklyDigestData };
