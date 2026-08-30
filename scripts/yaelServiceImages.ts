export const yaelServiceImages: Record<string, string> = {
  pedicure: "/assets/yael-pedicure-detail_d4a4994b.jpg",
  manicure: "/assets/yael-manicure-detail_2f9812d6.jpg",
  "mini-pedicure": "/assets/yael-service-mini-pedicure.jpg",
  "gel-polish": "/assets/yael-service-gel-polish.jpg",
  "pedicure-manicure": "/assets/yael-service-pedicure-manicure.jpg",
};

export const yaelServiceImage = (slug: string) =>
  yaelServiceImages[slug] ?? "/assets/yael-studio-atmosphere_eb67dd3d.jpg";
