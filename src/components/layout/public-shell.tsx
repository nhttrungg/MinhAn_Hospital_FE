import "@/styles/shared/chatbot.css";
import "@/styles/areas/public.css";
import type { ReactNode } from "react";
import { PublicHeader } from "./public-header";
import { PublicFooter } from "./public-footer";
import { ChatLauncher } from "@/components/customer/chat-launcher";
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="public-site">
      <a href="#page-content" className="skip-link">
        Đến nội dung chính
      </a>
      <PublicHeader />
      <div id="page-content" tabIndex={-1}>
        {children}
      </div>
      <PublicFooter />
      <ChatLauncher />
    </div>
  );
}
