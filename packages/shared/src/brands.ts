export type BrandMeta = {
  id: string;
  name: string;
  domain: string;
  color: string;
  letter: string;
};

/** Brand marks for India presets — favicon domain + accent color fallback */
export const BRANDS: BrandMeta[] = [
  { id: "swiggy", name: "Swiggy", domain: "swiggy.com", color: "#FC8019", letter: "S" },
  { id: "zomato", name: "Zomato", domain: "zomato.com", color: "#E23744", letter: "Z" },
  { id: "blinkit", name: "Blinkit", domain: "blinkit.com", color: "#0C831F", letter: "B" },
  { id: "zepto", name: "Zepto", domain: "zeptonow.com", color: "#3C00FF", letter: "Z" },
  { id: "instamart", name: "Instamart", domain: "swiggy.com", color: "#F15700", letter: "I" },
  { id: "bigbasket", name: "BigBasket", domain: "bigbasket.com", color: "#84C225", letter: "Bb" },
  { id: "bookmyshow", name: "BookMyShow", domain: "bookmyshow.com", color: "#C4242B", letter: "B" },
  { id: "makemytrip", name: "MakeMyTrip", domain: "makemytrip.com", color: "#E31C25", letter: "M" },
  { id: "redbus", name: "RedBus", domain: "redbus.in", color: "#D84E55", letter: "R" },
  { id: "amazon", name: "Amazon", domain: "amazon.in", color: "#FF9900", letter: "a" },
  { id: "flipkart", name: "Flipkart", domain: "flipkart.com", color: "#2874F0", letter: "Fk" },
  { id: "uber", name: "Uber", domain: "uber.com", color: "#000000", letter: "U" },
  { id: "ola", name: "Ola", domain: "olacabs.com", color: "#000000", letter: "O" },
  { id: "netflix", name: "Netflix", domain: "netflix.com", color: "#E50914", letter: "N" },
  { id: "spotify", name: "Spotify", domain: "spotify.com", color: "#1DB954", letter: "♪" },
  { id: "swiggy-dine", name: "Swiggy Dineout", domain: "swiggy.com", color: "#FC8019", letter: "D" },
];

export function brandForName(name: string): BrandMeta | null {
  const lower = name.trim().toLowerCase();
  return (
    BRANDS.find((b) => b.name.toLowerCase() === lower || b.id === lower) ??
    BRANDS.find((b) => lower.includes(b.name.toLowerCase()) || lower.includes(b.id)) ??
    null
  );
}

export function faviconUrl(domain: string, size = 64): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}
