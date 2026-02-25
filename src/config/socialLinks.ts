import {
  Github,
  Instagram,
  Linkedin,
  Mail,
  Send,
  X,
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
    id: "gmail",
    label: "Gmail",
    url: "mailto:iliashkr@gmail.com",
    icon: Mail,
    handle: "iliashkr@gmail.com",
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
    label: "X",
    url: "https://x.com/CodeByIlia",
    icon: X,
    handle: "@CodeByIlia",
  },
  {
    id: "instagram",
    label: "Instagram",
    url: "https://www.instagram.com/_.ilia.sh._?igsh=MWllZHo3anB5enFpbA%3D%3D&utm_source=qr",
    icon: Instagram,
    handle: "@_.ilia.sh._",
  },
];
