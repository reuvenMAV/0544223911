INSERT INTO "yael_booking_services" (id, slug, "nameHe", "descriptionHe", "durationMinutes", "priceAgorot", active, "sortOrder")
VALUES
  (1, 'pedicure', 'פדיקור', 'טיפול יסודי ומפנק לכפות הרגליים.', 60, NULL, true, 1),
  (2, 'manicure', 'מניקור', 'טיפוח מדויק לידיים ולציפורניים.', 45, NULL, true, 2),
  (3, 'mini-pedicure', 'מיני פדיקור', 'רענון קצר ומדויק בין העיסוקים.', 30, NULL, true, 3),
  (4, 'gel-polish', 'לק גל', 'גימור מבריק ועמיד למראה מסודר.', 60, NULL, true, 4),
  (5, 'pedicure-manicure', 'פדיקור + מניקור', 'טיפול מלא לידיים ולרגליים.', 180, NULL, true, 5)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  "nameHe" = EXCLUDED."nameHe",
  "descriptionHe" = EXCLUDED."descriptionHe",
  "durationMinutes" = EXCLUDED."durationMinutes",
  active = EXCLUDED.active,
  "sortOrder" = EXCLUDED."sortOrder";
