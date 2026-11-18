"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/primitives";
const Chat = dynamic(() => import("./chat-widget").then((m) => m.ChatWidget), {
  ssr: false,
  loading: () => <span className="at-chat-loading">Đang mở trợ lý…</span>,
});
export function ChatLauncher() {
  const [started, setStarted] = useState(false);
  return started ? (
    <Chat initialOpen />
  ) : (
    <div className="at-chat-root">
      <Button
        appearance="custom"
        className="at-chat-launcher"
        onClick={() => setStarted(true)}
        aria-label="Mở Hỏi Minh An"
      >
        <MessageCircle size={24} />
        <span>Hỏi Minh An</span>
      </Button>
    </div>
  );
}
