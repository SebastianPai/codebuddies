"use client";
import { Copy, Facebook, Link2, MessageCircle, Send, Share2 } from "lucide-react";
import { toast } from "react-toastify";
import { useTranslation } from "../../src/i18n/useTranslation";
type ShareButton = { label: string; href: string; icon: React.ReactNode };
export default function ReferralShareButtons({ code, link, message }: { code: string; link: string; message: string }) {
  const t = useTranslation();
  const encodedMessage = encodeURIComponent(`${message}\n${link}`);
  const encodedLink = encodeURIComponent(link);
  const buttons: ShareButton[] = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encodedMessage}`, icon: <MessageCircle size={16} /> },
    { label: "Telegram", href: `https://t.me/share/url?url=${encodedLink}&text=${encodeURIComponent(message)}`, icon: <Send size={16} /> },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`, icon: <Facebook size={16} /> },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${encodedMessage}`, icon: <Share2 size={16} /> },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedLink}`, icon: <Link2 size={16} /> },
  ];
  const copyCode = async () => { await navigator.clipboard.writeText(code); toast.success(t("referrals.copiedCode")); };
  const copyLink = async () => { await navigator.clipboard.writeText(link); toast.success(t("referrals.copiedLink")); };
  return <div className="flex flex-wrap gap-3"><button type="button" onClick={() => void copyCode()} className="inline-flex items-center gap-2 rounded-2xl bg-[#d5ff3f] px-4 py-3 font-bold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d5ff3f]" aria-label={t("referrals.copyCode")}><Copy size={16} />{t("referrals.copyCode")}</button><button type="button" onClick={() => void copyLink()} className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-4 py-3 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" aria-label={t("referrals.copyLink")}><Link2 size={16} />{t("referrals.copyLink")}</button>{buttons.map((button) => <a key={button.label} href={button.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 font-bold text-white transition hover:border-[#d5ff3f] hover:text-[#d5ff3f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d5ff3f]" aria-label={`${t("referrals.shareVia")} ${button.label}`}>{button.icon}{button.label}</a>)}</div>;
}
