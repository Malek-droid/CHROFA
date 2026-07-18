'use strict';

const Appointment = require('../models/Appointment');
const Business = require('../models/Business');

/**
 * Get dashboard overview stats for a business.
 * Returns: today's appointments, upcoming this week, cancellation rate, booking velocity
 */
exports.getOverviewStats = async (req, res, next) => {
  const businessId = req.user.businessId;
  if (!businessId) {
    const err = new Error('Business setup required.');
    err.statusCode = 400;
    err.code = 'BUSINESS_SETUP_REQUIRED';
    return next(err);
  }

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - todayStart.getDay()); // Start of week (Sunday)
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const lastWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekEnd = weekStart;

    // Today's appointments
    const todayCount = await Appointment.countDocuments({
      businessId,
      date: { $gte: todayStart, $lt: todayEnd },
      status: { $ne: 'cancelled' },
    });

    // Upcoming this week
    const upcomingCount = await Appointment.countDocuments({
      businessId,
      date: { $gte: todayStart, $lt: weekEnd },
      status: { $ne: 'cancelled' },
    });

    // Cancellation rate (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const totalAppointments = await Appointment.countDocuments({
      businessId,
      date: { $gte: thirtyDaysAgo },
    });
    const cancelledAppointments = await Appointment.countDocuments({
      businessId,
      date: { $gte: thirtyDaysAgo },
      status: 'cancelled',
    });
    const cancellationRate = totalAppointments > 0 
      ? ((cancelledAppointments / totalAppointments) * 100).toFixed(1) 
      : '0.0';

    // Booking velocity (this week vs last week)
    const thisWeekCount = await Appointment.countDocuments({
      businessId,
      date: { $gte: weekStart, $lt: weekEnd },
      status: { $ne: 'cancelled' },
    });
    const lastWeekCount = await Appointment.countDocuments({
      businessId,
      date: { $gte: lastWeekStart, $lt: lastWeekEnd },
      status: { $ne: 'cancelled' },
    });
    let bookingVelocity = '0%';
    if (lastWeekCount > 0) {
      const velocity = ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100;
      bookingVelocity = `${velocity >= 0 ? '+' : ''}${velocity.toFixed(0)}%`;
    } else if (thisWeekCount > 0) {
      bookingVelocity = '+100%';
    }

    res.status(200).json({
      success: true,
      stats: {
        todayAppointments: todayCount,
        upcomingThisWeek: upcomingCount,
        cancellationRate: `${cancellationRate}%`,
        bookingVelocity,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get weekly booking trends for analytics chart.
 * Returns last 7 days of booking data grouped by day.
 */
exports.getWeeklyTrends = async (req, res, next) => {
  const businessId = req.user.businessId;
  if (!businessId) {
    const err = new Error('Business setup required.');
    err.statusCode = 400;
    err.code = 'BUSINESS_SETUP_REQUIRED';
    return next(err);
  }

  try {
    const now = new Date();
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      const bookings = await Appointment.countDocuments({
        businessId,
        date: { $gte: date, $lt: nextDate },
        status: { $ne: 'cancelled' },
      });
      
      const cancels = await Appointment.countDocuments({
        businessId,
        date: { $gte: date, $lt: nextDate },
        status: 'cancelled',
      });
      
      days.push({
        day: dayNames[date.getDay()],
        bookings,
        cancels,
      });
    }

    res.status(200).json({
      success: true,
      trends: days,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get top services for analytics chart.
 * Returns service booking counts for last 30 days.
 */
exports.getTopServices = async (req, res, next) => {
  const businessId = req.user.businessId;
  if (!businessId) {
    const err = new Error('Business setup required.');
    err.statusCode = 400;
    err.code = 'BUSINESS_SETUP_REQUIRED';
    return next(err);
  }

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const serviceStats = await Appointment.aggregate([
      {
        $match: {
          businessId,
          date: { $gte: thirtyDaysAgo },
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: '$service',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    const services = serviceStats.map(s => ({
      name: s._id,
      count: s.count,
    }));

    res.status(200).json({
      success: true,
      services,
    });
  } catch (err) {
    next(err);
  }
};
