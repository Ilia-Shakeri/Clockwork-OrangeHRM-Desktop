import {
  Github,
  Instagram,
  Linkedin,
  Send,
  Twitter,
  type LucideIcon,
} from "lucide-react";

export interface SocialLinkItem {
  id: string;
  label: string;
  url: string;
  icon: LucideIcon;
  handle?: string;
}

export const socialLinks: SocialLinkItem[] = [
  {
    id: "github",
    label: "GitHub",
    url: "https://github.com/Ilia-Shakeri",
    icon: Github,
    handle: "@Ilia-Shakeri",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    url: "https://www.linkedin.com/in/ilia-shakeri/",
    icon: Linkedin,
    handle: "@ilia-shakeri",
  },
  {
    id: "instagram",
    label: "Instagram",
    url: "https://www.instagram.com/_.ilia.sh._?igsh=MWllZHo3anB5enFpbA%3D%3D&utm_source=qr",
    icon: Instagram,
    handle: "@_.ilia.sh._",
  },
  {
    id: "telegram",
    label: "Telegram",
    url: "https://t.me/ilia_ssh",
    icon: Send,
    handle: "@ilia_ssh",
  },
  {
    id: "x",
    label: "X (Twitter)",
    url: "https://x.com/CodeByIlia",
    icon: Twitter,
    handle: "@CodeByIlia",
  },
];
