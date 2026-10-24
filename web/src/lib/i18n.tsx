"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { readJSON, writeJSON } from "./storage";

export type Lang = "en" | "fil" | "id";

export const LANGS: { code: Lang; label: string; short: string }[] = [
  { code: "en", label: "English", short: "EN" },
  { code: "fil", label: "Filipino", short: "FIL" },
  { code: "id", label: "Bahasa Indonesia", short: "ID" },
];

const en = {
  yourTurn: "Your turn!",
  join: "Join this circle",
  joinWithPrepay: "Join and prepay",
  joining: "Joining…",
  joinIntro: "You've been invited to a savings circle (paluwagan / arisan).",
  joinHowDeposit: "You put in one contribution as a deposit. You get it back when the circle ends.",
  joinHowTurns: "Each round everyone pays in, and one member receives the whole pot.",
  joinHowSafe: "The pot is held by a smart contract. Nobody, not even the organiser, can take it.",
  joinNewcomer: "You're new, so you're placed last. Newcomers can't default on anyone.",
  joinFull: "This circle is full.",
  joinClosed: "Joining has closed for this circle.",
  contribute: "Pay this round",
  contributeLate: "Pay now (late, within grace)",
  contributed: "Paid for this round",
  contributeDue: "Due in",
  graceLeft: "Grace period ends in",
  prepay: "Prepay rounds",
  prepayHint: "Pay ahead on payday so you never miss a round.",
  deposit: "Deposit",
  perRound: "per round",
  pot: "Pot",
  round: "Round",
  members: "Members",
  paid: "Paid",
  pending: "Waiting",
  overdue: "Overdue",
  passport: "Savings Passport",
  passportSub: "A record of saving discipline, written by the circles themselves.",
  onTime: "On time",
  late: "Late",
  missed: "Missed",
  circlesCompleted: "Circles completed",
  circlesJoined: "Circles joined",
  onTimeRate: "On-time rate",
  tier: "Tier",
  tier0: "Newcomer",
  tier1: "Trusted saver",
  tier2: "Anchor saver",
  memberSince: "Saving since",
  lenderScan: "Lenders: scan to verify on-chain",
  noStamps: "No stamps yet. The first on-time payment adds one.",
  passportPrivacy: "Counts only. No amounts, no names, no circle lists.",
  connect: "Sign in",
  getTestMoney: "Get test money",
};

export type Dict = typeof en;

const fil: Dict = {
  yourTurn: "Giliran mo!",
  join: "Sumali sa paluwagan",
  joinWithPrepay: "Sumali at magbayad nang maaga",
  joining: "Sumasali…",
  joinIntro: "Inimbitahan ka sa isang paluwagan.",
  joinHowDeposit: "Maglalagay ka ng isang hulog bilang deposito. Ibabalik ito sa iyo pagtatapos ng paluwagan.",
  joinHowTurns: "Bawat round, lahat ay naghuhulog at isang miyembro ang tatanggap ng buong pot.",
  joinHowSafe: "Smart contract ang may hawak ng pera. Walang sinuman, kahit ang organizer, ang makakakuha nito.",
  joinNewcomer: "Bago ka pa lang, kaya nasa huli ka. Hindi makakapag-default ang bago sa kahit sino.",
  joinFull: "Puno na ang paluwagan na ito.",
  joinClosed: "Sarado na ang pagsali sa paluwagan na ito.",
  contribute: "Maghulog para sa round na ito",
  contributeLate: "Maghulog ngayon (huli, sa loob ng palugit)",
  contributed: "Bayad na para sa round na ito",
  contributeDue: "Takdang oras sa loob ng",
  graceLeft: "Matatapos ang palugit sa loob ng",
  prepay: "Magbayad nang maaga",
  prepayHint: "Magbayad nang maaga pag sweldo para hindi ka ma-late.",
  deposit: "Deposito",
  perRound: "bawat round",
  pot: "Pot",
  round: "Round",
  members: "Mga miyembro",
  paid: "Bayad na",
  pending: "Hinihintay",
  overdue: "Lampas na",
  passport: "Savings Passport",
  passportSub: "Talaan ng disiplina sa pag-iipon, isinulat mismo ng mga paluwagan.",
  onTime: "Nasa oras",
  late: "Huli",
  missed: "Hindi nakabayad",
  circlesCompleted: "Natapos na paluwagan",
  circlesJoined: "Sinalihang paluwagan",
  onTimeRate: "Porsyento sa oras",
  tier: "Antas",
  tier0: "Bago",
  tier1: "Maaasahang nag-iipon",
  tier2: "Haligi ng paluwagan",
  memberSince: "Nag-iipon mula",
  lenderScan: "Para sa nagpapautang: i-scan para i-verify on-chain",
  noStamps: "Wala pang tatak. Ang unang hulog na nasa oras ang magdadagdag nito.",
  passportPrivacy: "Bilang lamang. Walang halaga, walang pangalan, walang listahan ng paluwagan.",
  connect: "Mag-sign in",
  getTestMoney: "Kumuha ng test na pera",
};

const id: Dict = {
  yourTurn: "Giliranmu!",
  join: "Gabung arisan ini",
  joinWithPrepay: "Gabung dan bayar di muka",
  joining: "Sedang bergabung…",
  joinIntro: "Kamu diundang ke sebuah arisan.",
  joinHowDeposit: "Kamu menyetor satu iuran sebagai jaminan. Uangnya kembali saat arisan selesai.",
  joinHowTurns: "Setiap putaran semua anggota membayar, dan satu anggota menerima seluruh uang.",
  joinHowSafe: "Uang disimpan oleh smart contract. Tidak ada yang bisa mengambilnya, termasuk penyelenggara.",
  joinNewcomer: "Kamu anggota baru, jadi kamu mendapat giliran terakhir. Anggota baru tidak bisa merugikan siapa pun.",
  joinFull: "Arisan ini sudah penuh.",
  joinClosed: "Pendaftaran arisan ini sudah ditutup.",
  contribute: "Bayar putaran ini",
  contributeLate: "Bayar sekarang (terlambat, masih masa tenggang)",
  contributed: "Sudah bayar putaran ini",
  contributeDue: "Jatuh tempo dalam",
  graceLeft: "Masa tenggang berakhir dalam",
  prepay: "Bayar di muka",
  prepayHint: "Bayar di muka saat gajian supaya tidak pernah telat.",
  deposit: "Jaminan",
  perRound: "per putaran",
  pot: "Uang arisan",
  round: "Putaran",
  members: "Anggota",
  paid: "Lunas",
  pending: "Menunggu",
  overdue: "Terlambat",
  passport: "Paspor Tabungan",
  passportSub: "Catatan disiplin menabung, ditulis langsung oleh arisan.",
  onTime: "Tepat waktu",
  late: "Terlambat",
  missed: "Tidak bayar",
  circlesCompleted: "Arisan selesai",
  circlesJoined: "Arisan diikuti",
  onTimeRate: "Persentase tepat waktu",
  tier: "Tingkat",
  tier0: "Pendatang baru",
  tier1: "Penabung tepercaya",
  tier2: "Penabung andalan",
  memberSince: "Menabung sejak",
  lenderScan: "Untuk pemberi pinjaman: pindai untuk verifikasi on-chain",
  noStamps: "Belum ada cap. Pembayaran tepat waktu pertama akan menambahkannya.",
  passportPrivacy: "Hanya jumlah kejadian. Tanpa nominal, tanpa nama, tanpa daftar arisan.",
  connect: "Masuk",
  getTestMoney: "Ambil uang uji coba",
};

export const DICTS: Record<Lang, Dict> = { en, fil, id };

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: Dict };
const LangContext = createContext<Ctx>({ lang: "en", setLang: () => {}, t: en });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const saved = readJSON<Lang>("giliran.lang", "en");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from storage after mount
    if (saved in DICTS) setLangState(saved);
  }, []);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    writeJSON("giliran.lang", l);
    document.documentElement.lang = l === "fil" ? "fil" : l;
  }, []);
  return <LangContext.Provider value={{ lang, setLang, t: DICTS[lang] }}>{children}</LangContext.Provider>;
}

export const useI18n = () => useContext(LangContext);
