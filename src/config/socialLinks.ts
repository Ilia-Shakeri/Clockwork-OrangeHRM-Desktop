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
    url: "https://www.linkedin.com/in/your-handle",
    icon: Linkedin,
    handle: "@your-handle",
  },
  {
    id: "instagram",
    label: "Instagram",
    url: "https://www.instagram.com/your-handle",
    icon: Instagram,
    handle: "@your-handle",
  },
  {
    id: "telegram",
    label: "Telegram",
    url: "https://t.me/your-handle",
    icon: Send,
    handle: "@your-handle",
  },
  {
    id: "x",
    label: "X (Twitter)",
    url: "https://x.com/your-handle",
    icon: Twitter,
    handle: "@your-handle",
  },
];
