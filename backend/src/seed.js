require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./utils/logger');

const User = require('./models/User');
const Unit = require('./models/Unit');
const ResidentProfile = require('./models/ResidentProfile');
const Vehicle = require('./models/Vehicle');
const Facility = require('./models/Facility');
const Booking = require('./models/Booking');
const Visitor = require('./models/Visitor');
const Invoice = require('./models/Invoice');
const Payment = require('./models/Payment');
const Announcement = require('./models/Announcement');
const Complaint = require('./models/Complaint');
const ForumPost = require('./models/ForumPost');
const Notification = require('./models/Notification');
const AuditLog = require('./models/AuditLog');

const SEED_PASSWORD = 'Test@1234';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  logger.info('Seed: connected to MongoDB');

  const collections = [
    User, Unit, ResidentProfile, Vehicle, Facility, Booking, Visitor,
    Invoice, Payment, Announcement, Complaint, ForumPost, Notification, AuditLog,
  ];
  for (const model of collections) {
    await model.deleteMany({});
  }
  logger.info('Seed: cleared all collections');

  const passwordHash = await User.hashPassword(SEED_PASSWORD);

  // ── Units ──────────────────────────────────────────────────────────────────
  const units = await Unit.insertMany([
    { blockName: 'A', unitNumber: '101', floor: 1, type: 'apartment', area: 1200, bedrooms: 2, occupancyStatus: 'owner-occupied' },
    { blockName: 'A', unitNumber: '102', floor: 1, type: 'apartment', area: 1100, bedrooms: 2, occupancyStatus: 'tenant-occupied' },
    { blockName: 'A', unitNumber: '201', floor: 2, type: 'apartment', area: 1400, bedrooms: 3, occupancyStatus: 'owner-occupied' },
    { blockName: 'B', unitNumber: '101', floor: 1, type: 'villa', area: 2000, bedrooms: 4, occupancyStatus: 'owner-occupied' },
    { blockName: 'B', unitNumber: '102', floor: 1, type: 'flat', area: 900, bedrooms: 1, occupancyStatus: 'vacant' },
  ]);
  logger.info(`Seed: created ${units.length} units`);

  // ── Users ──────────────────────────────────────────────────────────────────
  const [superAdmin, admin, guard, staff, res1, res2, res3, res4] = await User.insertMany([
    { name: 'Super Admin', email: 'superadmin@gc.com', phone: '9000000001', passwordHash, role: 'SuperAdmin', status: 'active' },
    { name: 'Community Admin', email: 'admin@gc.com', phone: '9000000002', passwordHash, role: 'Admin', status: 'active' },
    { name: 'Gate Guard', email: 'guard@gc.com', phone: '9000000003', passwordHash, role: 'Guard', status: 'active' },
    { name: 'Maintenance Staff', email: 'staff@gc.com', phone: '9000000004', passwordHash, role: 'Staff', status: 'active' },
    { name: 'Rahul Sharma', email: 'rahul@gc.com', phone: '9876543210', passwordHash, role: 'Resident', status: 'active' },
    { name: 'Priya Verma', email: 'priya@gc.com', phone: '9876543211', passwordHash, role: 'Resident', status: 'active' },
    { name: 'Amit Kumar', email: 'amit@gc.com', phone: '9876543212', passwordHash, role: 'Resident', status: 'active' },
    { name: 'New Applicant', email: 'newuser@gc.com', phone: '9876543213', passwordHash, role: 'Resident', status: 'pending' },
  ]);
  logger.info('Seed: created 8 users (SuperAdmin, Admin, Guard, Staff, 3 active Residents, 1 pending Resident)');

  // Link unit owners
  await Unit.findByIdAndUpdate(units[0]._id, { owner: res1._id }); // A-101 owner Rahul
  await Unit.findByIdAndUpdate(units[1]._id, { owner: res2._id }); // A-102 owner Priya (tenant-occupied but she's the owner on record)
  await Unit.findByIdAndUpdate(units[2]._id, { owner: res3._id }); // A-201 owner Amit
  await Unit.findByIdAndUpdate(units[3]._id, { owner: res1._id }); // B-101 owner Rahul (second unit)

  // ── Resident Profiles ─────────────────────────────────────────────────────
  await ResidentProfile.insertMany([
    {
      user: res1._id, unit: units[0]._id,
      familyMembers: [{ name: 'Sneha Sharma', relation: 'Spouse', age: 34 }],
      emergencyContact: { name: 'Vikram Sharma', phone: '9111111111', relation: 'Brother' },
      moveInDate: new Date('2023-06-01'),
    },
    {
      user: res2._id, unit: units[1]._id,
      familyMembers: [],
      emergencyContact: { name: 'Meena Verma', phone: '9222222222', relation: 'Mother' },
      moveInDate: new Date('2024-01-15'),
    },
    {
      user: res3._id, unit: units[2]._id,
      familyMembers: [{ name: 'Kiran Kumar', relation: 'Spouse', age: 30 }, { name: 'Aarav Kumar', relation: 'Son', age: 5 }],
      emergencyContact: { name: 'Suresh Kumar', phone: '9333333333', relation: 'Father' },
      moveInDate: new Date('2022-11-20'),
    },
  ]);
  logger.info('Seed: created 3 resident profiles');

  // ── Vehicles ───────────────────────────────────────────────────────────────
  await Vehicle.insertMany([
    { owner: res1._id, unit: units[0]._id, vehicleNumber: 'KA01AB1234', type: 'car', make: 'Honda', model: 'City', color: 'White', parkingSlot: 'A-P1' },
    { owner: res3._id, unit: units[2]._id, vehicleNumber: 'KA01CD5678', type: 'motorcycle', make: 'Royal Enfield', model: 'Classic 350', color: 'Black', parkingSlot: 'A-P5' },
  ]);
  logger.info('Seed: created 2 vehicles');

  // ── Facilities ─────────────────────────────────────────────────────────────
  const facilities = await Facility.insertMany([
    {
      name: 'Community Gym', type: 'gym', description: 'Fully equipped gym', capacity: 20,
      openHours: [{ start: '05:30', end: '11:00' }, { start: '16:00', end: '23:00' }],
      bookingRules: { maxSlotHours: 1, advanceBookingDays: 7, cancellationHours: 2, requiresApproval: false },
      amenities: ['treadmill', 'weights'],
    },
    {
      name: 'Swimming Pool', type: 'pool', description: 'Olympic size pool', capacity: 30,
      openHours: [{ start: '06:00', end: '10:00' }, { start: '16:00', end: '20:00' }],
      bookingRules: { maxSlotHours: 1, advanceBookingDays: 7, cancellationHours: 2, requiresApproval: false },
      amenities: ['lifeguard'],
    },
    {
      name: 'Clubhouse Hall', type: 'party-hall', description: 'Party hall for events', capacity: 100,
      openHours: [{ start: '06:00', end: '22:00' }],
      bookingRules: { maxSlotHours: 6, advanceBookingDays: 30, cancellationHours: 48, requiresApproval: true },
      amenities: ['sound-system', 'catering-area'],
    },
  ]);
  logger.info(`Seed: created ${facilities.length} facilities`);

  // ── Bookings ───────────────────────────────────────────────────────────────
  const tomorrow = new Date(Date.now() + 86400000);
  tomorrow.setHours(18, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow.getTime() + 2 * 3600000);
  await Booking.insertMany([
    {
      facility: facilities[2]._id, bookedBy: res1._id, unit: units[0]._id,
      slotStart: tomorrow, slotEnd: tomorrowEnd,
      status: 'pending', attendees: 25, purpose: "Daughter's birthday party",
    },
    {
      facility: facilities[0]._id, bookedBy: res3._id, unit: units[2]._id,
      slotStart: new Date(Date.now() - 2 * 86400000), slotEnd: new Date(Date.now() - 2 * 86400000 + 3600000),
      status: 'completed', attendees: 1, purpose: 'Workout',
    },
  ]);
  logger.info('Seed: created 2 bookings');

  // ── Visitors ───────────────────────────────────────────────────────────────
  await Visitor.insertMany([
    {
      name: 'Ramesh Courier', phone: '9888800001', purpose: 'Package delivery',
      host: res1._id, unit: units[0]._id, status: 'checked-in', entryType: 'walk-in',
      checkInAt: new Date(), approvedBy: guard._id,
    },
    {
      name: 'Anita Guest', phone: '9888800002', purpose: 'Family visit',
      host: res3._id, unit: units[2]._id, status: 'approved', entryType: 'pre-approved',
      otp: '482913', otpExpiresAt: new Date(Date.now() + 86400000),
      validFrom: new Date(), validUntil: new Date(Date.now() + 86400000),
    },
  ]);
  logger.info('Seed: created 2 visitors');

  // ── Invoices & Payments ───────────────────────────────────────────────────
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const invoice1 = await Invoice.create({
    resident: res1._id, unit: units[0]._id, period: { month, year },
    lineItems: [{ description: 'Maintenance Charge', amount: 3000 }],
    amount: 3000, tax: 18, totalAmount: 3540,
    dueDate: new Date(year, month - 1, 20), status: 'paid', paidAmount: 3540, paidAt: new Date(),
  });
  const invoice2 = await Invoice.create({
    resident: res3._id, unit: units[2]._id, period: { month, year },
    lineItems: [{ description: 'Maintenance Charge', amount: 3500 }],
    amount: 3500, tax: 18, totalAmount: 4130,
    dueDate: new Date(year, month - 1, 20), status: 'sent',
  });
  const lastMonth = month === 1 ? 12 : month - 1;
  const lastMonthYear = month === 1 ? year - 1 : year;
  const invoice3 = await Invoice.create({
    resident: res2._id, unit: units[1]._id, period: { month: lastMonth, year: lastMonthYear },
    lineItems: [{ description: 'Maintenance Charge', amount: 2800 }],
    amount: 2800, tax: 18, totalAmount: 3304,
    dueDate: new Date(lastMonthYear, lastMonth - 1, 20), status: 'overdue',
  });
  logger.info('Seed: created 3 invoices');

  const payment1 = await Payment.create({
    invoice: invoice1._id, paidBy: res1._id, unit: units[0]._id,
    amount: 3540, method: 'upi', reference: 'UPI-REF-001', status: 'completed', recordedBy: res1._id,
  });
  logger.info('Seed: created 1 payment');

  // ── Announcements ──────────────────────────────────────────────────────────
  await Announcement.insertMany([
    {
      title: 'Water Supply Maintenance', body: 'Water supply will be interrupted on Sunday from 10 AM to 2 PM for tank cleaning.',
      type: 'notice', audience: 'all', postedBy: admin._id, isPinned: true,
    },
    {
      title: 'Annual Day Celebration', body: 'Join us for the community annual day celebration at the Clubhouse.',
      type: 'event', audience: 'residents', postedBy: admin._id, eventDate: new Date(Date.now() + 14 * 86400000),
    },
  ]);
  logger.info('Seed: created 2 announcements');

  // ── Complaints ─────────────────────────────────────────────────────────────
  await Complaint.insertMany([
    {
      raisedBy: res1._id, unit: units[0]._id, category: 'plumbing',
      description: 'Kitchen sink is leaking continuously since yesterday.',
      priority: 'high', status: 'open', statusHistory: [{ status: 'open', changedBy: res1._id }],
    },
    {
      raisedBy: res3._id, unit: units[2]._id, category: 'electrical',
      description: 'Common area light on 2nd floor corridor is not working.',
      priority: 'medium', status: 'assigned', assignedTo: staff._id, assignedAt: new Date(),
      statusHistory: [{ status: 'open', changedBy: res3._id }, { status: 'assigned', changedBy: admin._id }],
    },
  ]);
  logger.info('Seed: created 2 complaints');

  // ── Forum Posts ────────────────────────────────────────────────────────────
  await ForumPost.create({
    author: res2._id, title: 'Looking for a good electrician', body: 'Can anyone recommend a reliable electrician in the area?',
    category: 'help', comments: [{ author: res1._id, body: 'I used one from Block A, works great, DM me.' }], likes: [res3._id],
  });
  logger.info('Seed: created 1 forum post');

  // ── Notifications ──────────────────────────────────────────────────────────
  await Notification.insertMany([
    { recipient: res1._id, type: 'payment_received', title: 'Payment Recorded', message: `Payment of ₹3540 recorded for invoice ${invoice1.invoiceNumber}`, relatedEntity: { model: 'Payment', id: payment1._id } },
    { recipient: res3._id, type: 'invoice_generated', title: 'New Invoice', message: `Maintenance invoice for ${month}/${year} has been generated`, relatedEntity: { model: 'Invoice', id: invoice2._id }, isRead: true, readAt: new Date() },
    { recipient: res2._id, type: 'invoice_overdue', title: 'Payment Overdue', message: `Your invoice ${invoice3.invoiceNumber} is overdue`, relatedEntity: { model: 'Invoice', id: invoice3._id } },
  ]);
  logger.info('Seed: created 3 notifications');

  // ── Audit Logs ─────────────────────────────────────────────────────────────
  await AuditLog.insertMany([
    { actor: admin._id, actorEmail: admin.email, action: 'APPROVE_USER', entity: 'User', entityId: res1._id, ip: '127.0.0.1' },
    { actor: superAdmin._id, actorEmail: superAdmin.email, action: 'CREATE_UNIT', entity: 'Unit', entityId: units[0]._id, ip: '127.0.0.1' },
  ]);
  logger.info('Seed: created 2 audit logs');

  logger.info('Seed complete.');
  logger.info(`All seeded users share the password: ${SEED_PASSWORD}`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  logger.error('Seed failed:', err);
  process.exit(1);
});
