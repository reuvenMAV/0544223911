export function calcPrice(checkin: string, checkout: string) {
  const start = new Date(checkin)
  const end = new Date(checkout)
  let weekdays = 0, weekends = 0
  const d = new Date(start)
  while (d < end) {
    const day = d.getDay()
    if (day === 5 || day === 6) weekends++
    else weekdays++
    d.setDate(d.getDate() + 1)
  }
  const base = weekdays * 600 + weekends * 750
  const cleaning = 200
  return {
    weekdays,
    weekends,
    nights: weekdays + weekends,
    total: base + cleaning,
    breakdown: { base, cleaning },
  }
}
