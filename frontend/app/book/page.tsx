'use client';

import React, { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Scissors,
  User,
  Calendar,
  Clock,
  Check,
  ChevronRight,
  ChevronLeft,
  Phone,
  Mail,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Lock,
  Download,
  Copy,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { CustomerNav } from '../../components/customer-nav';
import { CustomerFooter } from '../../components/customer-footer';
import { useAuth } from '../../lib/auth-context';
import {
  publicService,
  PublicShop,
  PublicBarber,
  PublicServiceItem,
  AvailabilitySlot,
} from '../../services/public.service';
import { appointmentService, Appointment } from '../../services/appointment.service';

function downloadIcsFile(appt: Appointment) {
  const formatIcsDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const startDate = new Date(appt.startAt);
  const endDate = new Date(appt.endAt);
  const now = new Date();

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Local\'s Cut//Booking System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:appointment-${appt.bookingToken}@localscut.com`,
    `DTSTAMP:${formatIcsDate(now)}`,
    `DTSTART:${formatIcsDate(startDate)}`,
    `DTEND:${formatIcsDate(endDate)}`,
    `SUMMARY:${appt.serviceNameSnapshot} at Local's Cut Studio`,
    `DESCRIPTION:Barber: ${appt.barberNameSnapshot}\\nBooking Token: ${appt.bookingToken}\\nDuration: ${appt.serviceDurationSnapshot} mins`,
    'LOCATION:Local\'s Cut Studio',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `appointment-${appt.bookingToken}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 12-Hour format helper (e.g., "14:30" -> "02:30 PM", "09:00" -> "09:00 AM")
function format12Hour(time24: string): string {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  const hDisplay = h12.toString().padStart(2, '0');
  const mDisplay = (m || 0).toString().padStart(2, '0');
  return `${hDisplay}:${mDisplay} ${ampm}`;
}

const DEFAULT_SERVICES: PublicServiceItem[] = [
  { id: '6ab414edcaebc69792e1def3', name: 'Haircut', description: 'Classic haircut with wash and styling', durationMinutes: 30, price: 250, isActive: true },
  { id: '6ab414edcaebc69792e1def6', name: 'Beard', description: 'Precision beard trim & hot towel line up', durationMinutes: 20, price: 150, isActive: true },
  { id: '6ab414eecaebc69792e1def9', name: 'Fade', description: 'Skin fade with precision detailing', durationMinutes: 40, price: 300, isActive: true },
  { id: '6ab414eecaebc69792e1defc', name: 'Haircut+Beard', description: 'Complete grooming combo experience', durationMinutes: 50, price: 350, isActive: true },
];

const DEFAULT_BARBERS: PublicBarber[] = [
  { id: '6ab414e1caebc69792e1ded7', name: 'Rahul', bio: 'Specialist in modern fades & styling', experienceYears: 5, phone: '9876543210', isActive: true },
  { id: '6ab414e2caebc69792e1dedc', name: 'Amit', bio: 'Classic scissor cuts & beard sculpting', experienceYears: 3, phone: '9876543211', isActive: true },
  { id: '6ab414e4caebc69792e1dedf', name: 'Vikas', bio: 'Hot towel shave and modern styling', experienceYears: 2, phone: '9876543212', isActive: true },
];

const DEFAULT_ASSIGNMENTS: Record<string, string[]> = {
  '6ab414e1caebc69792e1ded7': ['6ab414edcaebc69792e1def3', '6ab414edcaebc69792e1def6'],
  '6ab414e2caebc69792e1dedc': ['6ab414edcaebc69792e1def3', '6ab414eecaebc69792e1defc'],
  '6ab414e4caebc69792e1dedf': ['6ab414edcaebc69792e1def3', '6ab414edcaebc69792e1def6', '6ab414eecaebc69792e1def9'],
};


function BookingFlow() {
  const searchParams = useSearchParams();
  const initialServiceId = searchParams.get('serviceId');
  const initialBarberId = searchParams.get('barberId');

  const { user, requestOtp, verifyOtp } = useAuth();

  // Data states
  const [shop, setShop] = useState<PublicShop | null>(null);
  const [services, setServices] = useState<PublicServiceItem[]>(DEFAULT_SERVICES);
  const [barbers, setBarbers] = useState<PublicBarber[]>(DEFAULT_BARBERS);
  const [barberAssignments, setBarberAssignments] = useState<Record<string, string[]>>(DEFAULT_ASSIGNMENTS);
  const [loadingInitial, setLoadingInitial] = useState(false);

  // Selection states (Preserved Booking Context)
  // Step 1: Service, Step 2: Barber, Step 3: Date & Time, Step 4: Confirm, Step 5: Success Card
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(initialServiceId);
  // Default to null = Any Barber (mandatory UX decision)
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(initialBarberId || null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);

  // Availability calculation states
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isOffDay, setIsOffDay] = useState(false);

  // OTP Auth states
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAge, setCustomerAge] = useState('');
  const [customerGender, setCustomerGender] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Booking submission states
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Persistent idempotency key per checkout attempt
  const idempotencyKeyRef = useRef<string>(`book-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

  // Load initial shop, services, barbers, and assignments
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [shopData, svcData, barberData] = await Promise.all([
          publicService.getShop().catch(() => null),
          publicService.getShopServices().catch(() => []),
          publicService.getShopBarbers().catch(() => []),
        ]);
        if (!isMounted) return;
        if (shopData) setShop(shopData);
        if (svcData.length > 0) setServices(svcData);
        if (barberData.length > 0) setBarbers(barberData);

        // Fetch assignments for each barber
        if (barberData.length > 0) {
          const assignmentMap: Record<string, string[]> = {};
          await Promise.all(
            barberData.map(async (b) => {
              try {
                const res = await publicService.getBarberServices(b.id);
                assignmentMap[b.id] = res.services.map((s) => s.id);
              } catch {
                assignmentMap[b.id] = [];
              }
            }),
          );
          if (isMounted && Object.keys(assignmentMap).length > 0) {
            setBarberAssignments(assignmentMap);
          }
        }

        // Auto-advance step if initial params are passed
        if (initialServiceId) {
          setSelectedServiceId(initialServiceId);
          if (initialBarberId) {
            setSelectedBarberId(initialBarberId);
            setStep(3);
          } else {
            setStep(2);
          }
        } else if (initialBarberId) {
          setSelectedBarberId(initialBarberId);
          setStep(1);
        }
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, [initialServiceId, initialBarberId]);

  // Barbers eligible for currently selected service
  const eligibleBarbers = useMemo(() => {
    if (!selectedServiceId) return barbers;
    return barbers.filter((b) => {
      const assignedIds = barberAssignments[b.id] || [];
      return assignedIds.includes(selectedServiceId);
    });
  }, [barbers, selectedServiceId, barberAssignments]);

  // Load availability slots whenever barber, service, or date changes on Step 3
  useEffect(() => {
    if (step === 3 && selectedServiceId && selectedDate) {
      setLoadingSlots(true);
      setSelectedSlot(null);

      if (!selectedBarberId || selectedBarberId === 'ANY') {
        // Any Barber: query union of slots across all eligible barbers
        publicService
          .getAnyBarberAvailability(selectedServiceId, selectedDate)
          .then((res) => {
            setSlots(res.slots || []);
            setIsOffDay(res.isOff || false);
          })
          .catch(() => {
            setSlots([]);
            setIsOffDay(false);
          })
          .finally(() => setLoadingSlots(false));
      } else {
        // Specific Barber: query availability for chosen barber
        publicService
          .getAvailability(selectedBarberId, selectedDate, selectedServiceId)
          .then((res) => {
            setSlots(res.slots || []);
            setIsOffDay(res.isOff || false);
          })
          .catch(() => {
            setSlots([]);
            setIsOffDay(false);
          })
          .finally(() => setLoadingSlots(false));
      }
    }
  }, [step, selectedBarberId, selectedServiceId, selectedDate]);

  // OTP Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Request OTP Handler (Email OTP linked to phone)
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setOtpError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!email || !email.includes('@')) {
      setOtpError('Please enter a valid email address to receive your verification code.');
      return;
    }

    setOtpLoading(true);
    try {
      const res: any = await requestOtp({
        phone: cleanPhone,
        email: email.trim().toLowerCase(),
        name: customerName.trim() || undefined,
        age: customerAge ? parseInt(customerAge, 10) : undefined,
        gender: customerGender || undefined,
      });

      setOtpSent(true);
      setCountdown(60);
    } catch (err: any) {
      setOtpError(err?.message || 'Failed to send verification code. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify OTP Handler
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    if (!otpCode || otpCode.trim().length < 4) {
      setOtpError('Please enter the 6-digit verification code.');
      return;
    }
    setOtpLoading(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      await verifyOtp({
        phone: cleanPhone,
        email: email.trim().toLowerCase(),
        code: otpCode.trim(),
        name: customerName.trim() || undefined,
        age: customerAge ? parseInt(customerAge, 10) : undefined,
        gender: customerGender || undefined,
      });
    } catch (err: any) {
      setOtpError(err?.message || 'Invalid or expired verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Final Appointment Booking Submission
  const handleConfirmBooking = async () => {
    if (!selectedServiceId || !selectedDate || !selectedSlot) return;

    setBookingSubmitting(true);
    setBookingError(null);

    try {
      // Build ISO date-time string in shop timezone (Asia/Kolkata +05:30)
      const dateParts = selectedDate.split('-');
      const [hour, minute] = selectedSlot.startTime.split(':');
      // Construct UTC ISO timestamp correctly for IST (+05:30)
      const slotDate = new Date(`${selectedDate}T${selectedSlot.startTime}:00+05:30`);

      const appointment = await appointmentService.create(
        {
          serviceId: selectedServiceId,
          barberId: selectedBarberId || undefined,
          startAt: slotDate.toISOString(),
        },
        idempotencyKeyRef.current,
      );

      setConfirmedAppointment(appointment);
      setStep(5);
    } catch (err: any) {
      if (err?.statusCode === 409 || err?.message?.toLowerCase().includes('time was just taken')) {
        setBookingError('That time slot was just taken by another client. Please choose another time.');
      } else {
        setBookingError(err?.message || 'Failed to confirm appointment. Please try again.');
      }
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleCopyToken = () => {
    if (confirmedAppointment?.bookingToken) {
      navigator.clipboard.writeText(confirmedAppointment.bookingToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const selectedBarber = barbers.find((b) => b.id === selectedBarberId);

  // Group slots into time-of-day categories for clean scanning
  const groupedSlots = useMemo(() => {
    const morning = slots.filter((s) => s.startTime < '12:00');
    const afternoon = slots.filter((s) => s.startTime >= '12:00' && s.startTime < '17:00');
    const evening = slots.filter((s) => s.startTime >= '17:00');
    return { morning, afternoon, evening };
  }, [slots]);

  return (
    <div className="mx-auto max-w-4xl px-3.5 sm:px-6 lg:px-8 py-5 sm:py-10">
      {/* Shop Context Header */}
      {step < 5 && (
        <div className="mb-6 text-center space-y-1.5">
          <span className="theme-badge-accent">Instant Online Booking</span>
          <h1 className="text-xl sm:text-3xl font-black text-theme-main tracking-tight">
            Reserve at {shop?.name || 'Local\'s Cut Studio'}
          </h1>
          <p className="text-xs sm:text-sm text-theme-secondary max-w-md mx-auto">
            Pick your service, date, and time. Barber selection is optional — Any Barber is selected by default.
          </p>
        </div>
      )}

      {/* STEP INDICATOR TABS */}
      {step < 5 && (
        <div className="mb-6 sm:mb-8">
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center text-xs font-semibold">
            {[
              { num: 1, label: 'Service' },
              { num: 2, label: 'Barber' },
              { num: 3, label: 'Time' },
              { num: 4, label: 'Confirm' },
            ].map((s) => {
              const isActive = step === s.num;
              const isCompleted = step > s.num;
              return (
                <div
                  key={s.num}
                  className={`flex flex-col items-center gap-1 pb-2 border-b-2 transition-all ${isActive
                      ? 'border-amber-500 accent-color font-bold'
                      : isCompleted
                        ? 'border-emerald-500 text-emerald-400'
                        : 'border-theme-light text-theme-muted'
                    }`}
                >
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    {isCompleted ? (
                      <span className="h-4 w-4 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[10px] font-bold shrink-0">
                        <Check className="h-3 w-3" />
                      </span>
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-current flex items-center justify-center text-[10px] shrink-0">
                        {s.num}
                      </span>
                    )}
                    <span className="text-[11px] sm:text-xs truncate">{s.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 1: SERVICE SELECTION */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-theme-main">Select a Service</h2>
            <span className="text-xs text-theme-muted">{services.length} available</span>
          </div>

          {loadingInitial ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-28 rounded-2xl bg-theme-surface animate-pulse border border-theme" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {services.map((svc) => {
                const isSelected = selectedServiceId === svc.id;
                return (
                  <div
                    key={svc.id}
                    onClick={() => setSelectedServiceId(svc.id)}
                    className={`theme-card cursor-pointer rounded-2xl p-5 transition-all flex flex-col justify-between ${isSelected
                        ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                        : 'hover:border-theme'
                      }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-extrabold text-lg text-theme-main">₹{svc.price}</span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-theme-surface-elevated border border-theme px-2 py-0.5 text-[11px] text-theme-muted">
                          <Clock className="h-3 w-3" />
                          <span>{svc.durationMinutes}m</span>
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-theme-main">{svc.name}</h3>
                      <p className="text-xs text-theme-secondary mt-1 line-clamp-2">
                        {svc.description || 'Signature grooming experience.'}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs font-semibold">
                      <span className={isSelected ? 'accent-color' : 'text-theme-muted'}>
                        {isSelected ? 'Selected' : 'Click to select'}
                      </span>
                      <ChevronRight className="h-4 w-4 text-theme-muted" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              disabled={!selectedServiceId}
              onClick={() => {
                // If previously selected specific barber is not eligible for new service, reset to Any Barber
                if (selectedBarberId && !eligibleBarbers.some((b) => b.id === selectedBarberId)) {
                  setSelectedBarberId(null);
                }
                setStep(2);
              }}
              className="theme-btn-primary px-6 py-2.5 text-xs sm:text-sm font-bold disabled:opacity-40 disabled:pointer-events-none"
            >
              <span>Continue to Barber</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: BARBER SELECTION (MANDATORY UX: ANY BARBER IS DEFAULT) */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-theme-main">Choose Barber Preference</h2>
              <p className="text-xs text-theme-secondary">
                Barber selection is completely optional. Any Barber gives you the fastest booking.
              </p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-theme-muted hover:text-theme-main transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Change Service</span>
            </button>
          </div>

          {/* OPTION 1: ANY BARBER (DEFAULT & FEATURED) */}
          <div
            onClick={() => setSelectedBarberId(null)}
            className={`cursor-pointer rounded-2xl p-5 sm:p-6 transition-all border flex items-start justify-between gap-4 ${selectedBarberId === null
                ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/25 shadow-lg'
                : 'border-theme bg-theme-surface hover:border-theme-secondary'
              }`}
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Users className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-theme-main">Any Barber</h3>
                  <span className="theme-badge-accent text-[10px] font-bold">Fastest Booking</span>
                </div>
                <p className="text-xs text-theme-secondary leading-relaxed max-w-xl">
                  Automatically pairs you with the first available certified barber. Unlocks the widest selection of date and time slots.
                </p>
              </div>
            </div>

            <div className="shrink-0 pt-1">
              <div
                className={`h-5 w-5 rounded-full border flex items-center justify-center transition-all ${selectedBarberId === null
                    ? 'border-amber-500 bg-amber-500 text-black'
                    : 'border-theme-muted'
                  }`}
              >
                {selectedBarberId === null && <Check className="h-3.5 w-3.5 stroke-[3]" />}
              </div>
            </div>
          </div>

          <div className="relative py-2 flex items-center justify-center">
            <div className="border-t border-theme-light w-full absolute" />
            <span className="relative bg-theme-base px-3 text-[11px] font-bold uppercase tracking-wider text-theme-muted">
              Or pick a specific barber
            </span>
          </div>

          {/* OPTION 2: SPECIFIC BARBERS LIST */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {eligibleBarbers.map((barber) => {
              const isSelected = selectedBarberId === barber.id;
              return (
                <div
                  key={barber.id}
                  onClick={() => setSelectedBarberId(barber.id)}
                  className={`theme-card cursor-pointer rounded-2xl p-5 transition-all flex flex-col justify-between ${isSelected
                      ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                      : 'hover:border-theme'
                    }`}
                >
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 font-bold text-base">
                        {barber.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-theme-main">{barber.name}</h3>
                        <span className="text-[11px] text-theme-muted">
                          {barber.experienceYears ? `${barber.experienceYears} Years Experience` : 'Stylist'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-theme-secondary line-clamp-2">
                      {barber.bio || 'Specialist barber at Local\'s Cut Studio.'}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs font-semibold pt-3 border-t border-theme-light">
                    <span className={isSelected ? 'accent-color' : 'text-theme-muted'}>
                      {isSelected ? '✓ Selected' : 'Choose barber'}
                    </span>
                    <ChevronRight className="h-4 w-4 text-theme-muted" />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1 rounded-xl border border-theme px-4 py-2 text-xs font-semibold text-theme-secondary hover:text-theme-main transition"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setStep(3)}
              className="theme-btn-primary px-6 py-2.5 text-xs sm:text-sm font-bold shadow-md"
            >
              <span>Continue to Date & Time</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DATE & TIME SLOT SELECTION */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-theme-main">Choose Date & Time Slot</h2>
              <p className="text-xs text-theme-secondary">
                Booking for <strong className="text-theme-main">{selectedService?.name}</strong> ({selectedService?.durationMinutes}m) with{' '}
                <strong className="text-theme-main">{selectedBarber ? selectedBarber.name : 'Any Barber (First Available)'}</strong>
              </p>
            </div>
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-theme-muted hover:text-theme-main transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Change Barber</span>
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="rounded-2xl border border-theme bg-theme-surface p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 accent-color" />
              <span className="text-xs font-bold uppercase text-theme-muted">Select Date</span>
            </div>
            <input
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="theme-input px-3 py-1.5 text-xs sm:text-sm font-medium w-full sm:w-auto"
            />
          </div>

          {/* Time Slots Area */}
          <div className="rounded-2xl border border-theme bg-theme-surface p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-theme-main flex items-center gap-2">
                <Clock className="h-4 w-4 accent-color" />
                <span>Available Slots for {selectedDate}</span>
              </h3>
              {!selectedBarberId && (
                <span className="text-[11px] text-theme-muted">
                  Showing combined availability across barbers
                </span>
              )}
            </div>

            {loadingSlots ? (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="h-10 rounded-xl bg-theme-surface-elevated animate-pulse border border-theme" />
                ))}
              </div>
            ) : isOffDay ? (
              <div className="p-8 text-center text-theme-muted">
                <AlertCircle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-theme-main">No working hours on this date</p>
                <p className="text-xs text-theme-muted mt-1">Please choose another date.</p>
              </div>
            ) : slots.length === 0 ? (
              <div className="p-8 text-center text-theme-muted">
                <p className="text-xs font-semibold text-theme-main">No available slots</p>
                <p className="text-xs text-theme-muted mt-1">All slots on this date are booked or shift has ended.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Morning Slots */}
                {groupedSlots.morning.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-theme-muted mb-2">Morning</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {groupedSlots.morning.map((s) => {
                        const isSelected = selectedSlot?.startTime === s.startTime;
                        const isAvail = s.status === 'AVAILABLE' || s.isAvailable === true;
                        return (
                          <button
                            key={s.startTime}
                            disabled={!isAvail}
                            onClick={() => setSelectedSlot(s)}
                            className={`rounded-xl border py-2 px-1 text-[11px] sm:text-xs font-semibold whitespace-nowrap text-center transition ${isSelected
                                ? 'border-amber-500 bg-amber-500 text-black font-bold shadow-md'
                                : isAvail
                                  ? 'border-theme bg-theme-surface-elevated text-theme-main hover:border-amber-500/40'
                                  : 'border-theme-light text-theme-muted opacity-30 cursor-not-allowed line-through'
                              }`}
                          >
                            {format12Hour(s.startTime)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Afternoon Slots */}
                {groupedSlots.afternoon.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-theme-muted mb-2">Afternoon</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {groupedSlots.afternoon.map((s) => {
                        const isSelected = selectedSlot?.startTime === s.startTime;
                        const isAvail = s.status === 'AVAILABLE' || s.isAvailable === true;
                        return (
                          <button
                            key={s.startTime}
                            disabled={!isAvail}
                            onClick={() => setSelectedSlot(s)}
                            className={`rounded-xl border py-2 px-1 text-[11px] sm:text-xs font-semibold whitespace-nowrap text-center transition ${isSelected
                                ? 'border-amber-500 bg-amber-500 text-black font-bold shadow-md'
                                : isAvail
                                  ? 'border-theme bg-theme-surface-elevated text-theme-main hover:border-amber-500/40'
                                  : 'border-theme-light text-theme-muted opacity-30 cursor-not-allowed line-through'
                              }`}
                          >
                            {format12Hour(s.startTime)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Evening Slots */}
                {groupedSlots.evening.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-theme-muted mb-2">Evening</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {groupedSlots.evening.map((s) => {
                        const isSelected = selectedSlot?.startTime === s.startTime;
                        const isAvail = s.status === 'AVAILABLE' || s.isAvailable === true;
                        return (
                          <button
                            key={s.startTime}
                            disabled={!isAvail}
                            onClick={() => setSelectedSlot(s)}
                            className={`rounded-xl border py-2 px-1 text-[11px] sm:text-xs font-semibold whitespace-nowrap text-center transition ${isSelected
                                ? 'border-amber-500 bg-amber-500 text-black font-bold shadow-md'
                                : isAvail
                                  ? 'border-theme bg-theme-surface-elevated text-theme-main hover:border-amber-500/40'
                                  : 'border-theme-light text-theme-muted opacity-30 cursor-not-allowed line-through'
                              }`}
                          >
                            {format12Hour(s.startTime)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1 rounded-xl border border-theme px-4 py-2 text-xs font-semibold text-theme-secondary hover:text-theme-main transition"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              disabled={!selectedSlot}
              onClick={() => setStep(4)}
              className="theme-btn-primary px-6 py-2.5 text-xs sm:text-sm font-bold disabled:opacity-40 disabled:pointer-events-none shadow-md"
            >
              <span>Continue to Confirmation</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: REVIEW & CONFIRM BOOKING */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-theme-main">Confirm Booking Details</h2>
            <button
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-theme-muted hover:text-theme-main transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Change Slot</span>
            </button>
          </div>

          {/* Booking Summary Card */}
          <div className="rounded-2xl border border-theme bg-theme-surface p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-theme-light pb-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-theme-muted">Studio</span>
                <p className="font-bold text-base text-theme-main">{shop?.name || 'Local\'s Cut Studio'}</p>
                <p className="text-xs text-theme-secondary">{shop?.address}, {shop?.city}</p>
              </div>
              <span className="theme-badge-accent">Confirmed Instant Booking</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase text-theme-muted">Service</span>
                <p className="text-sm font-bold text-theme-main">{selectedService?.name}</p>
                <p className="text-xs accent-color font-semibold">₹{selectedService?.price} • {selectedService?.durationMinutes} mins</p>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase text-theme-muted">Barber</span>
                <p className="text-sm font-bold text-theme-main">
                  {selectedBarber ? selectedBarber.name : 'Any Available Barber'}
                </p>
                <p className="text-xs text-theme-secondary">
                  {selectedBarber ? 'Preferred Stylist' : 'Assigned automatically'}
                </p>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <span className="text-[11px] font-bold uppercase text-theme-muted">Date & Time</span>
                <p className="text-sm font-bold text-theme-main">{selectedDate}</p>
                <p className="text-xs accent-color font-semibold">
                  {format12Hour(selectedSlot?.startTime || '')} – {format12Hour(selectedSlot?.endTime || '')}
                </p>
              </div>
            </div>
          </div>

          {/* Error message banner if booking conflict happens */}
          {bookingError && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-xs font-semibold text-theme-main">{bookingError}</p>
                <button
                  onClick={() => setStep(3)}
                  className="theme-btn-primary px-3 py-1 text-xs font-bold"
                >
                  Choose Another Slot
                </button>
              </div>
            </div>
          )}

          {/* AUTHENTICATION / VERIFICATION BLOCK */}
          {user && user.role === 'CUSTOMER' ? (
            /* User already authenticated as customer */
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-6 w-6 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm text-theme-main">Customer Verified</h4>
                    <p className="text-xs text-theme-secondary">
                      Booking for <strong className="text-theme-main">{user.name}</strong> ({user.phone || user.email})
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/20 px-2 py-1 rounded-lg">
                  READY
                </span>
              </div>

              <div className="pt-2">
                <button
                  disabled={bookingSubmitting}
                  onClick={handleConfirmBooking}
                  className="w-full theme-btn-primary py-3.5 text-sm sm:text-base font-black shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {bookingSubmitting ? (
                    <span>Confirming Appointment...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      <span>Confirm & Book Appointment</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* User not authenticated -> Email OTP inline verification linked to mobile */
            <div className="rounded-2xl border border-theme bg-theme-surface p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 accent-color" />
                <h3 className="text-sm font-bold text-theme-main">Verify to Confirm Booking</h3>
              </div>
              <p className="text-xs text-theme-secondary">
                Enter your mobile number and email. We send an instant 6-digit verification code to your email.
              </p>

              {otpError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}

              {!otpSent ? (
                <form onSubmit={handleRequestOtp} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-theme-muted mb-1.5">
                        10-Digit Mobile Number *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
                        <input
                          type="tel"
                          placeholder="e.g. 9876543210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="theme-input pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-medium w-full"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-theme-muted mb-1.5">
                        Email Address (Receives Code) *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
                        <input
                          type="email"
                          placeholder="e.g. customer@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="theme-input pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-medium w-full"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-theme-muted mb-1.5">
                      Your Full Name <span className="normal-case font-normal">(Required if first time)</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
                      <input
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="theme-input pl-10 pr-3.5 py-2 text-xs sm:text-sm font-medium w-full"
                      />
                    </div>
                  </div>

                  {/* Optional Age & Gender */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-theme-muted mb-1.5">
                        Age (Optional)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={120}
                        placeholder="e.g. 25"
                        value={customerAge}
                        onChange={(e) => setCustomerAge(e.target.value)}
                        className="theme-input px-3.5 py-2 text-xs sm:text-sm font-medium w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-theme-muted mb-1.5">
                        Gender (Optional)
                      </label>
                      <select
                        value={customerGender}
                        onChange={(e) => setCustomerGender(e.target.value)}
                        className="theme-input px-3 py-2 text-xs sm:text-sm font-medium w-full cursor-pointer"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={otpLoading}
                    className="w-full theme-btn-primary py-3 text-xs sm:text-sm font-bold disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
                  >
                    {otpLoading ? 'Sending Code...' : 'Send Email Verification Code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-theme-secondary">
                    <span>Code sent to: <strong className="text-theme-main">{email}</strong></span>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtpCode('');
                        setOtpError(null);
                      }}
                      className="accent-color font-bold hover:underline"
                    >
                      Change Details
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-theme-muted mb-1.5">
                      Enter 6-Digit Verification Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="• • • • • •"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="theme-input text-center tracking-widest text-xl font-mono font-bold py-3 w-full"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={otpLoading}
                    className="w-full theme-btn-primary py-3 text-xs sm:text-sm font-bold disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
                  >
                    {otpLoading ? 'Verifying...' : 'Verify Code & Confirm Booking'}
                  </button>

                  <div className="text-center pt-1">
                    {countdown > 0 ? (
                      <span className="text-[11px] text-theme-muted">Resend code in <strong className="font-mono text-theme-main">{countdown}s</strong></span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        className="text-[11px] font-bold accent-color hover:underline"
                      >
                        Resend Verification Code
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1 rounded-xl border border-theme px-4 py-2 text-xs font-semibold text-theme-secondary hover:text-theme-main transition"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Slot</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: CELEBRATORY BOOKING CONFIRMATION SCREEN */}
      {step === 5 && confirmedAppointment && (
        <div className="max-w-xl mx-auto space-y-6 text-center">
          <div className="space-y-2">
            <div className="h-16 w-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/20">
              <Check className="h-8 w-8 stroke-[3]" />
            </div>
            <span className="theme-badge-accent">Appointment Confirmed</span>
            <h2 className="text-2xl sm:text-3xl font-black text-theme-main tracking-tight">
              You are all set!
            </h2>
            <p className="text-xs sm:text-sm text-theme-secondary">
              A 24-hour reminder will be dispatched before your appointment.
            </p>
          </div>

          {/* Booking Token Card */}
          <div className="rounded-3xl border border-amber-500/40 bg-theme-surface p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-theme-muted">
                Your Booking Token
              </span>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono text-3xl sm:text-4xl font-black text-amber-400 tracking-widest">
                  {confirmedAppointment.bookingToken}
                </span>
                <button
                  onClick={handleCopyToken}
                  title="Copy token to clipboard"
                  className="rounded-xl border border-theme p-2 text-theme-muted hover:text-amber-400 hover:border-amber-500/50 transition"
                >
                  {copiedToken ? (
                    <Check className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-theme-muted">
                Please present this token upon arrival at the studio.
              </p>
            </div>

            <div className="border-t border-theme-light pt-4 grid grid-cols-2 gap-4 text-left text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-theme-muted">Service</span>
                <p className="font-bold text-sm text-theme-main mt-0.5">
                  {confirmedAppointment.serviceNameSnapshot}
                </p>
                <p className="text-theme-secondary">
                  ₹{confirmedAppointment.servicePriceSnapshot} • {confirmedAppointment.serviceDurationSnapshot}m
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-theme-muted">Barber</span>
                <p className="font-bold text-sm text-theme-main mt-0.5">
                  {confirmedAppointment.barberNameSnapshot}
                </p>
                <p className="text-theme-secondary">Master Barber</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-theme-muted">Date</span>
                <p className="font-bold text-sm text-theme-main mt-0.5">
                  {new Date(confirmedAppointment.startAt).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-theme-muted">Time</span>
                <p className="font-bold text-sm accent-color mt-0.5">
                  {new Date(confirmedAppointment.startAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </p>
              </div>
            </div>

            {/* Calendar Download Button */}
            <div className="pt-2">
              <button
                onClick={() => downloadIcsFile(confirmedAppointment)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-theme bg-theme-surface-elevated py-2.5 text-xs font-bold text-theme-main hover:border-amber-500/50 transition shadow-sm"
              >
                <Download className="h-4 w-4" />
                <span>Add to Calendar (.ics)</span>
              </button>
            </div>
          </div>

          {/* Action Links */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/customer/appointments"
              className="w-full sm:w-auto theme-btn-primary px-6 py-2.5 text-xs sm:text-sm font-bold shadow-md"
            >
              View My Appointments
            </Link>
            <button
              onClick={() => {
                setStep(1);
                setSelectedServiceId(null);
                setSelectedBarberId(null);
                setSelectedSlot(null);
                setConfirmedAppointment(null);
                idempotencyKeyRef.current = `book-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
              }}
              className="w-full sm:w-auto rounded-xl border border-theme px-6 py-2.5 text-xs sm:text-sm font-bold text-theme-secondary hover:text-theme-main hover:border-theme transition"
            >
              Book Another Appointment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookPage() {
  return (
    <div className="min-h-screen bg-theme-base text-theme-main flex flex-col justify-between">
      <CustomerNav />
      <main className="flex-1">
        <Suspense fallback={<div className="p-12 text-center text-xs text-theme-muted">Loading booking studio...</div>}>
          <BookingFlow />
        </Suspense>
      </main>
      <CustomerFooter />
    </div>
  );
}
