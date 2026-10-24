export type Case = {
  place: string;
  when: string;
  headline: string;
  detail: string;
  sources: { label: string; url: string }[];
};

export const CASES: Case[] = [
  {
    place: "Kedah, Malaysia",
    when: "August 2026",
    headline: "35 police reports, about RM1.7 million",
    detail:
      "A kutu organiser couple went missing; victims aged 23 to 53 filed 35 police reports over roughly RM1.7M in “duit kutu”.",
    sources: [
      { label: "New Straits Times", url: "https://www.nst.com.my/news/nation/2026/08/1507751/duit-kutu-rm17mil-losses-35-reports-lodged" },
      { label: "The Star", url: "https://www.thestar.com.my/news/nation/2026/08/06/couple-reported-missing-detained-over-alleged-039kutu039-scam" },
    ],
  },
  {
    place: "Pasig, Philippines",
    when: "January 2024",
    headline: "NBI probe, at least ₱800 million",
    detail:
      "The NBI investigated a “paluwagan” operation that promised 40% profit and let people buy payout slots; reported sums ran from ₱800M to nearly ₱1B.",
    sources: [
      { label: "Daily Tribune", url: "https://tribune.net.ph/2024/01/08/nbi-probes-ponzi-like-scheme-in-pasig" },
      { label: "Philstar", url: "https://www.philstar.com/nation/2024/01/10/2324673/nbi-probes-p1-billion-paluwagan-scam" },
    ],
  },
  {
    place: "East Java, Indonesia",
    when: "August 2026",
    headline: "Fake online arisan, about Rp71 billion moved",
    detail:
      "Promoted by Instagram influencers, padded with made-up members, and paid early rounds on time to look real. About 140 victims.",
    sources: [
      { label: "ANTARA", url: "https://www.antaranews.com/berita/5691727/polda-jatim-ungkap-arisan-online-bodong-rp71-miliar" },
      { label: "CNN Indonesia", url: "https://www.cnnindonesia.com/nasional/20260813071833-12-1391680/arisan-online-bodong-rp71-m-di-jatim-selebgram-ikut-promosi" },
    ],
  },
];

export const OFW_SOURCE = {
  label: "PSA via GMA News",
  url: "https://www.gmanetwork.com/news/pinoyabroad/dispatch/969755/ofws-grew-to-2-19m-in-2024-psa/story/",
};
