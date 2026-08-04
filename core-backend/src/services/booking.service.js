const Booking = require('../models/Booking');
const mongoose = require('mongoose');

class BookingService {
  async getHistory(userId, { page = 1, limit = 10, status, category }) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return { data: [], pagination: { total: 0, page: parseInt(page), limit: parseInt(limit) } };
    }

    const filter = {
      $or: [{ clientId: userId }, { professionalId: userId }]
    };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookings = await Booking.find(filter)
      .populate('clientId', 'name email avatar')
      .populate('professionalId', 'name email avatar')
      .populate('skillId', 'title category description')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(filter);

    const formattedBookings = bookings.map(booking => ({
      id: booking._id,
      skillId: booking.skillId?._id || null,
      skillTitle: booking.skillId?.title || null,
      skillCategory: booking.skillId?.category || null,
      clientId: booking.clientId?._id || null,
      clientName: booking.clientId?.name || null,
      clientAvatar: booking.clientId?.avatar || null,
      professionalId: booking.professionalId?._id || null,
      professionalName: booking.professionalId?.name || null,
      professionalAvatar: booking.professionalId?.avatar || null,
      date: booking.date,
      timeSlot: booking.timeSlot,
      amount: booking.amount,
      status: booking.status,
      completedAt: booking.completedAt,
      createdAt: booking.createdAt
    }));

    return {
      data: formattedBookings,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) }
    };
  }

  async create(bookingData, userId) {
    bookingData.clientId = userId;
    const booking = new Booking(bookingData);
    return await booking.save();
  }

  async updateStatus(bookingId, status, userId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error('Booking not found');

    if (booking.clientId.toString() !== userId && booking.professionalId.toString() !== userId) {
      throw new Error('Unauthorized');
    }

    booking.status = status;
    return await booking.save();
  }

  async getById(bookingId) {
    const booking = await Booking.findById(bookingId)
      .populate('clientId', 'name email avatar')
      .populate('professionalId', 'name email avatar')
      .populate('skillId', 'title category description');

    if (!booking) throw new Error('Booking not found');
    return booking;
  }

  async getAll(filters = {}) {
    const { page = 1, limit = 50, status } = filters;
    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const bookings = await Booking.find(filter)
      .populate('clientId', 'name email')
      .populate('professionalId', 'name email')
      .populate('skillId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(filter);
    return { data: bookings, pagination: { total, page: parseInt(page), limit: parseInt(limit) } };
  }
}

module.exports = new BookingService();