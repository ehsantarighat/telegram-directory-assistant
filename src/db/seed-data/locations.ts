/**
 * Tashkent districts (tumanlar) + a few other Uzbekistan cities.
 * Used by seed.ts. Slugs are stable identifiers; UI labels live in `name`.
 */

export const uzbekistanCities = [
  { slug: "tashkent", name: "Tashkent", nameLocal: "Toshkent" },
  { slug: "samarkand", name: "Samarkand", nameLocal: "Samarqand" },
  { slug: "bukhara", name: "Bukhara", nameLocal: "Buxoro" },
  { slug: "namangan", name: "Namangan", nameLocal: "Namangan" },
  { slug: "andijan", name: "Andijan", nameLocal: "Andijon" },
  { slug: "fergana", name: "Fergana", nameLocal: "Farg'ona" },
  { slug: "nukus", name: "Nukus", nameLocal: "Nukus" },
] as const;

export const tashkentDistricts = [
  { slug: "tashkent-mirzo-ulugbek", name: "Mirzo Ulug'bek" },
  { slug: "tashkent-yunusabad", name: "Yunusabad" },
  { slug: "tashkent-chilanzar", name: "Chilanzar" },
  { slug: "tashkent-mirobod", name: "Mirobod" },
  { slug: "tashkent-yakkasaray", name: "Yakkasaray" },
  { slug: "tashkent-shaykhantakhur", name: "Shaykhantakhur" },
  { slug: "tashkent-yashnobod", name: "Yashnobod" },
  { slug: "tashkent-uchtepa", name: "Uchtepa" },
  { slug: "tashkent-sergeli", name: "Sergeli" },
  { slug: "tashkent-bektemir", name: "Bektemir" },
  { slug: "tashkent-olmazor", name: "Olmazor" },
] as const;
