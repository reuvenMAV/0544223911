import { useEffect, useState } from "react";
import { CalendarClock, Check, LockKeyhole, LogOut, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";

const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const statuses = { pending: "ממתין", confirmed: "מאושר", cancelled: "בוטל", completed: "הושלם" } as const;

export default function Admin() {
  const auth = trpc.auth.me.useQuery();
  const login = trpc.studio.login.useMutation({ onSuccess: () => auth.refetch() });
  const logout = trpc.studio.logout.useMutation({ onSuccess: () => auth.refetch() });
  const isAdmin = auth.data?.role === "admin";
  const appointments = trpc.admin.appointments.useQuery(undefined, { enabled: isAdmin });
  const notificationEvents = trpc.admin.notificationEvents.useQuery(undefined, { enabled: isAdmin });
  const settings = trpc.admin.settings.useQuery(undefined, { enabled: isAdmin });
  const hours = trpc.admin.hours.useQuery(undefined, { enabled: isAdmin });
  const blockedDates = trpc.admin.blockedDates.useQuery({ from: new Date(), to: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }, { enabled: isAdmin });
  const testimonials = trpc.admin.testimonials.useQuery(undefined, { enabled: isAdmin });
  const surveys = trpc.admin.surveys.useQuery(undefined, { enabled: isAdmin });
  const customers = trpc.admin.customers.useQuery(undefined, { enabled: isAdmin });
  const blockDate = trpc.admin.blockDate.useMutation({ onSuccess: () => blockedDates.refetch() });
  const saveOverride = trpc.admin.saveOverride.useMutation();
  const update = trpc.admin.updateStatus.useMutation({ onSuccess: () => appointments.refetch() });
  const saveSettings = trpc.admin.saveSettings.useMutation({ onSuccess: () => settings.refetch() });
  const saveHours = trpc.admin.saveHours.useMutation();
  const createTestimonial = trpc.admin.createTestimonial.useMutation({
    onSuccess: () => {
      testimonials.refetch();
      setTestimonialQuote("");
      setTestimonialName("");
      setTestimonialService("");
      setNotice("חוות הדעת נשמרה כטיוטה ולא תוצג עד לאישור");
    },
  });
  const approveTestimonial = trpc.admin.approveTestimonial.useMutation({ onSuccess: () => testimonials.refetch() });
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("054-806-0140");
  const [address, setAddress] = useState("אשקלון, שכונת נווה הדרים");
  const [businessName, setBusinessName] = useState("Yael Mavashev");
  const [notice, setNotice] = useState("");
  const [blockedDate, setBlockedDate] = useState("");
  const [blockedReason, setBlockedReason] = useState("");
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideStart, setOverrideStart] = useState("09:00");
  const [overrideEnd, setOverrideEnd] = useState("17:00");
  const [testimonialQuote, setTestimonialQuote] = useState("");
  const [testimonialName, setTestimonialName] = useState("");
  const [testimonialService, setTestimonialService] = useState("");

  useEffect(() => {
    if (!settings.data) return;
    setPhone(settings.data.phone || "054-806-0140");
    setAddress(settings.data.address || "אשקלון, שכונת נווה הדרים");
    setBusinessName(settings.data.businessName || "Yael Mavashev");
  }, [settings.data]);

  if (auth.isLoading) return <div className="min-h-screen bg-[#fbf9ff] p-8 text-center">טוענת…</div>;

  if (!isAdmin) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#fbf9ff] px-5">
        <Card className="w-full max-w-md border-[#eadfeb] bg-white/80">
          <CardContent className="p-8">
            <LockKeyhole className="mx-auto mb-4 size-10 text-[#9b7798]" />
            <h1 className="text-center font-serif text-3xl text-[#554b72]">האזור האישי של יעל</h1>
            <p className="mt-3 text-center leading-7 text-[#77718b]">כאן מנהלים תורים, שעות, חוות דעת וסקרים. הכניסה עם הסיסמה האישית בלבד.</p>
            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                login.mutate({ password });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="studio-password">סיסמה</Label>
                <Input id="studio-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              </div>
              {login.isError && <p className="text-sm text-red-700">הסיסמה לא נכונה.</p>}
              <Button type="submit" disabled={login.isPending || password.length < 1} className="h-12 w-full rounded-full bg-[#5c5278]">
                {login.isPending ? "נכנסת…" : "כניסה לניהול האתר"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentHours = hours.data ?? [];
  return (
    <div dir="rtl" className="min-h-screen bg-[#fbf9ff] px-5 py-8 text-[#343145] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.25em] text-[#9b7798]">PRIVATE STUDIO</p>
            <h1 className="mt-2 font-serif text-4xl text-[#554b72]">האזור האישי של יעל</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => appointments.refetch()} className="gap-2 border-[#dfd2e4]"><RefreshCw className="size-4" /> רענון</Button>
            <Button variant="outline" onClick={() => logout.mutate()} className="gap-2 border-[#dfd2e4]"><LogOut className="size-4" /> יציאה</Button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="border-[#eadfeb] bg-white/80">
            <CardHeader><CardTitle className="font-serif text-2xl font-normal text-[#554b72]">פרטי העסק</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>שם העסק</Label><Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} /></div>
              <div className="space-y-2"><Label>טלפון</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div className="space-y-2"><Label>כתובת</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
              <Button className="gap-2 rounded-full bg-[#5c5278]" onClick={() => { saveSettings.mutate({ businessName, phone, address }); setNotice("הגדרות נשמרו"); }}><Save className="size-4" /> שמירת הגדרות</Button>
              {settings.data && <p className="text-xs text-[#81788d]">אזור זמן: {settings.data.timezone} · התראות ללקוחות: מושבתות</p>}
            </CardContent>
          </Card>
          <Card className="border-[#eadfeb] bg-white/80">
            <CardHeader><CardTitle className="font-serif text-2xl font-normal text-[#554b72]">שעות פעילות</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {days.map((day, index) => {
                const item = currentHours.find((hour) => hour.dayOfWeek === index);
                return (
                  <div key={day} className="grid grid-cols-[70px_1fr_1fr_auto] items-center gap-2">
                    <span className="text-sm text-[#77718b]">{day}</span>
                    <Input type="time" defaultValue={item?.openTime?.slice(0, 5) ?? "09:00"} id={`open-${index}`} />
                    <Input type="time" defaultValue={item?.closeTime?.slice(0, 5) ?? "17:00"} id={`close-${index}`} />
                    <Button size="sm" variant="outline" className="border-[#dfd2e4]" onClick={() => {
                      const open = (document.getElementById(`open-${index}`) as HTMLInputElement).value;
                      const close = (document.getElementById(`close-${index}`) as HTMLInputElement).value;
                      saveHours.mutate({ dayOfWeek: index, openTime: open, closeTime: close, active: true });
                    }}>שמור</Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 border-[#eadfeb] bg-white/80">
          <CardHeader><CardTitle className="font-serif text-2xl font-normal text-[#554b72]">תאריכים חסומים</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input type="date" value={blockedDate} onChange={(e) => setBlockedDate(e.target.value)} />
              <Input placeholder="סיבה (אופציונלי)" value={blockedReason} onChange={(e) => setBlockedReason(e.target.value)} />
              <Button className="rounded-full bg-[#5c5278]" disabled={!blockedDate} onClick={() => { blockDate.mutate({ blockedDate: new Date(`${blockedDate}T00:00:00+03:00`), reason: blockedReason || undefined }); setBlockedDate(""); setBlockedReason(""); }}>חסימת תאריך</Button>
            </div>
            <div className="mt-4 space-y-2">
              {blockedDates.data?.map((item) => (
                <div key={item.id} className="rounded-xl bg-[#fbf9ff] px-4 py-3 text-sm">{new Date(item.blockedDate).toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem" })} · {item.reason || "חסום"}</div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 border-[#eadfeb] bg-white/80">
          <CardHeader><CardTitle className="font-serif text-2xl font-normal text-[#554b72]">חריגת זמינות ליום מסוים</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-4">
              <Input type="date" value={overrideDate} onChange={(e) => setOverrideDate(e.target.value)} />
              <Input type="time" value={overrideStart} onChange={(e) => setOverrideStart(e.target.value)} />
              <Input type="time" value={overrideEnd} onChange={(e) => setOverrideEnd(e.target.value)} />
              <Button className="rounded-full bg-[#5c5278]" disabled={!overrideDate} onClick={() => { saveOverride.mutate({ overrideDate: new Date(`${overrideDate}T00:00:00+03:00`), startTime: overrideStart, endTime: overrideEnd, active: true }); setOverrideDate(""); }}>שמירת חריגה</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 border-[#eadfeb] bg-white/80">
          <CardHeader><CardTitle className="font-serif text-2xl font-normal text-[#554b72]">תורים</CardTitle></CardHeader>
          <CardContent>
            {appointments.data?.length ? appointments.data.map((appointment) => (
              <div key={appointment.id} className="mb-3 grid gap-3 rounded-2xl border border-[#eee5ef] p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <div>
                  <p className="font-medium text-[#554b72]">{appointment.customerName}</p>
                  <p className="text-sm text-[#81788d]">{appointment.customerPhone} · {new Date(appointment.startsAtUtc).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}</p>
                </div>
                <span className="text-sm text-[#81788d]">#{appointment.id}</span>
                <Select value={appointment.status} onValueChange={(value) => update.mutate({ id: appointment.id, status: value as keyof typeof statuses })}>
                  <SelectTrigger className="w-full border-[#e8deeb] sm:w-36"><SelectValue>{statuses[appointment.status]}</SelectValue></SelectTrigger>
                  <SelectContent>{Object.entries(statuses).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )) : <p className="py-6 text-[#81788d]">עדיין אין תורים.</p>}
            {notice && <p className="mt-4 text-sm text-[#77718b]">{notice}</p>}
          </CardContent>
        </Card>

        <Card className="mt-6 border-[#eadfeb] bg-white/80">
          <CardHeader><CardTitle className="font-serif text-2xl font-normal text-[#554b72]">סקרים שהתקבלו</CardTitle></CardHeader>
          <CardContent>
            {surveys.data?.length ? surveys.data.map((survey) => (
              <div key={survey.id} className="mb-3 rounded-xl bg-[#fbf9ff] p-4 text-sm">
                <p className="font-medium text-[#554b72]">{survey.name || "ללא שם"} · דירוג {survey.rating}/5</p>
                <p className="text-[#81788d]">{survey.phone}{survey.appointmentId ? ` · תור #${survey.appointmentId}` : ""}</p>
                {survey.feedback && <p className="mt-2 leading-6 text-[#5d566c]">{survey.feedback}</p>}
              </div>
            )) : <p className="text-sm text-[#81788d]">אין סקרים עדיין. הקישור ללקוחה: /survey</p>}
          </CardContent>
        </Card>

        <Card className="mt-6 border-[#eadfeb] bg-white/80">
          <CardHeader><CardTitle className="font-serif text-2xl font-normal text-[#554b72]">ארכיון לקוחות</CardTitle></CardHeader>
          <CardContent>
            {customers.data?.length ? customers.data.map((customer) => (
              <div key={customer.phone} className="mb-3 rounded-xl bg-[#fbf9ff] p-4 text-sm">
                <p className="font-medium text-[#554b72]">{customer.name}</p>
                <p className="text-[#81788d]">{customer.phone} · ביקורים {customer.totalVisits} · חוזרת: {customer.isReturning}</p>
              </div>
            )) : <p className="text-sm text-[#81788d]">הארכיון יתמלא אחרי הרצת האוטומציה על תורים קיימים.</p>}
          </CardContent>
        </Card>

        <Card className="mt-6 border-[#eadfeb] bg-white/80">
          <CardHeader><CardTitle className="font-serif text-2xl font-normal text-[#554b72]">חוות דעת והמלצות</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-[#77718b]">רק חוות דעת אמיתיות. כל רשומה חדשה נשמרת כטיוטה עד לאישור.</p>
            <textarea value={testimonialQuote} onChange={(e) => setTestimonialQuote(e.target.value)} placeholder="תוכן חוות הדעת" className="min-h-24 w-full rounded-xl border border-[#e8deeb] bg-white p-3 text-sm" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value={testimonialName} onChange={(e) => setTestimonialName(e.target.value)} placeholder="שם הלקוחה" />
              <Input value={testimonialService} onChange={(e) => setTestimonialService(e.target.value)} placeholder="הטיפול (אופציונלי)" />
            </div>
            <Button className="gap-2 rounded-full bg-[#5c5278]" disabled={testimonialQuote.trim().length < 10 || testimonialName.trim().length < 2 || createTestimonial.isPending} onClick={() => createTestimonial.mutate({ quote: testimonialQuote, customerName: testimonialName, service: testimonialService || undefined })}>
              <Save className="size-4" /> שמירה כטיוטה
            </Button>
            {testimonials.data?.map((testimonial) => (
              <div key={testimonial.id} className="flex flex-col gap-3 rounded-xl bg-[#fbf9ff] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="leading-6 text-[#5d566c]">“{testimonial.quote}”</p>
                  <p className="mt-1 text-xs text-[#81788d]">{testimonial.customerName}{testimonial.service ? ` · ${testimonial.service}` : ""} · {testimonial.approved ? "מאושר ומוצג" : "טיוטה"}</p>
                </div>
                <Button size="sm" variant={testimonial.approved ? "outline" : "default"} onClick={() => approveTestimonial.mutate({ id: testimonial.id, approved: !testimonial.approved })} className="gap-2">
                  <Check className="size-4" /> {testimonial.approved ? "הסרת אישור" : "אישור להצגה"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mt-6 border-[#eadfeb] bg-white/80">
          <CardHeader><CardTitle className="font-serif text-2xl font-normal text-[#554b72]">אירועי התראות</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-[#81788d]">שליחת וואטסאפ מהאתר עצמו מושבתת. האוטומציה ב-n8n שולחת ליעל הודעות להעברה.</p>
            {notificationEvents.data?.length ? notificationEvents.data.map((event) => (
              <div key={event.id} className="mb-2 rounded-xl bg-[#fbf9ff] p-3 text-xs">
                <div className="flex justify-between"><span>{event.event} · {event.recipient}</span><strong>{event.status}</strong></div>
              </div>
            )) : <p className="text-sm text-[#81788d]">אין אירועי התראות.</p>}
          </CardContent>
        </Card>

        <div className="mt-5 flex items-center gap-2 text-xs text-[#81788d]">
          <CalendarClock className="size-4" /> סקר ללקוחה: https://yael.mavash.net/survey
        </div>
      </div>
    </div>
  );
}
