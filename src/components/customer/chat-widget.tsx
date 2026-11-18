"use client";
import { InlineStatus } from "@/components/ui/data-display";
import { Button, ButtonLink, Form, Label, TextArea } from "@/components/ui/primitives";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, Send, X, RotateCcw, Square } from "lucide-react";
import { useChat } from "./chat-provider";
import { internalLink } from "@/lib/chatbot-types";

const suggestions = ["Cách đặt lịch khám", "Tìm bác sĩ", "Xem giá khám", "Thông tin liên hệ"];

/** Emphasis only. Model text stays text; raw HTML and links are not interpreted. */
export function renderAnswer(text: string) {
  return text
    .split(/(\*\*[^*\n]+\*\*)/g)
    .map((part, index) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={index}>{part.slice(2, -2)}</strong>
      ) : (
        part
      ),
    );
}
export function ChatWidget({ initialOpen = false }: { initialOpen?: boolean }) {
  const { turns, busy, send, reset, stop } = useChat();
  const [open, setOpen] = useState(initialOpen),
    [draft, setDraft] = useState(""),
    [error, setError] = useState(""),
    [resetting, setResetting] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null),
    input = useRef<HTMLTextAreaElement>(null),
    panel = useRef<HTMLElement>(null),
    bottom = useRef<HTMLDivElement>(null),
    returnFocus = useRef(false);
  useEffect(() => {
    if (open) input.current?.focus();
    else if (returnFocus.current) {
      returnFocus.current = false;
      launcher.current?.focus();
    }
  }, [open]);
  useEffect(() => {
    if (open) bottom.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [open, turns, busy]);
  function close() {
    returnFocus.current = true;
    setOpen(false);
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || busy || resetting) return;
    const text = draft;
    setDraft("");
    void send(text);
  }
  async function clear() {
    setResetting(true);
    setError("");
    try {
      await reset();
      setDraft("");
      input.current?.focus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa xóa được hội thoại.");
    } finally {
      setResetting(false);
    }
  }
  return (
    <div className="at-chat-root">
      {open && (
        <section
          ref={panel}
          className="at-chat-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-heading"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              close();
            }
            if (e.key === "Tab") {
              const nodes = panel.current?.querySelectorAll<HTMLElement>(
                "button:not(:disabled), a[href], textarea:not(:disabled)",
              );
              if (!nodes?.length) return;
              const first = nodes[0],
                last = nodes[nodes.length - 1];
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
              }
            }
          }}
        >
          <header className="at-chat-header">
            <div>
              <span className="at-chat-avatar">
                <MessageCircle size={21} />
              </span>
              <div>
                <h2 id="chat-heading">Hỏi Minh An</h2>
                <p>Hỗ trợ thông tin và đặt khám</p>
              </div>
            </div>
            <div>
              <Button
                appearance="custom"
                type="button"
                aria-label="Xóa cuộc trò chuyện"
                disabled={resetting}
                onClick={() => void clear()}
              >
                <RotateCcw size={18} />
              </Button>
              <Button
                appearance="custom"
                type="button"
                aria-label="Đóng trò chuyện"
                onClick={close}
              >
                <X size={20} />
              </Button>
            </div>
          </header>
          <div
            className="at-chat-messages"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
          >
            <div className="at-chat-welcome">
              <h3>Chào bạn, Minh An có thể giúp gì?</h3>
              <p>Hỏi về cách đặt lịch, bác sĩ, giá khám hoặc thông tin cơ sở.</p>
              <p className="at-chat-caption">
                Hội thoại lưu tối đa 24 giờ và có thể xóa bất cứ lúc nào. Nội dung cần thiết được
                gửi đến dịch vụ AI. Bạn tránh nhập thông tin cá nhân hoặc bệnh án.
              </p>
              <div className="at-chat-suggestions">
                {suggestions.map((s) => (
                  <Button
                    appearance="custom"
                    type="button"
                    key={s}
                    disabled={busy || resetting}
                    onClick={() => void send(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
            {turns.map((t) => (
              <div className="at-chat-turn" key={t.id}>
                <p className="at-chat-question">{t.question}</p>
                {t.reply && (
                  <article className="at-chat-answer">
                    <p>{renderAnswer(t.reply.answer)}</p>
                    {t.reply.sources.length > 0 && (
                      <div className="at-chat-sources">
                        <span>Nguồn tham khảo</span>
                        {t.reply.sources
                          .filter((s) => internalLink(s.url))
                          .map((s) => (
                            <ButtonLink variant="ghost" key={s.id} href={s.url} onClick={close}>
                              {s.title} ↗
                            </ButtonLink>
                          ))}
                      </div>
                    )}
                    {t.reply.actions.length > 0 && (
                      <div className="at-chat-actions">
                        {t.reply.actions
                          .filter((a) => internalLink(a.url))
                          .map((a, index) => (
                            <ButtonLink
                              variant="ghost"
                              href={a.url}
                              key={`${a.url}-${index}`}
                              onClick={close}
                            >
                              <strong>{a.label} →</strong>
                              {a.detail && <span>{a.detail}</span>}
                            </ButtonLink>
                          ))}
                      </div>
                    )}
                    {["UNAVAILABLE", "DISABLED"].includes(t.reply.status) && (
                      <small className="at-chat-caption">Đang hỗ trợ bằng hướng dẫn có sẵn.</small>
                    )}
                  </article>
                )}
                {t.error && (
                  <InlineStatus className="at-chat-error" as="div" tone="error">
                    <p>{t.error}</p>
                    <Button
                      appearance="custom"
                      type="button"
                      disabled={busy || resetting}
                      onClick={() => void send(t.question, t.id)}
                    >
                      Thử lại
                    </Button>
                  </InlineStatus>
                )}
              </div>
            ))}
            {busy && (
              <InlineStatus className="at-chat-wait" as="p" tone="info">
                <span />
                Đang tìm thông tin…
              </InlineStatus>
            )}
            {error && (
              <InlineStatus as="p" tone="error" className="at-chat-error">
                {error}
              </InlineStatus>
            )}
            <div ref={bottom} />
          </div>
          <Form className="at-chat-compose" onSubmit={submit}>
            <Label className="sr-only" htmlFor="chat-question">
              Câu hỏi của bạn
            </Label>
            <TextArea
              appearance="custom"
              ref={input}
              id="chat-question"
              rows={2}
              maxLength={2000}
              placeholder="Nhập câu hỏi của bạn…"
              value={draft}
              disabled={resetting}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  if (draft.trim() && !busy && !resetting) {
                    const text = draft;
                    setDraft("");
                    void send(text);
                  }
                }
              }}
            />
            {busy ? (
              <Button
                appearance="custom"
                type="button"
                aria-label="Dừng chờ phản hồi"
                onClick={stop}
              >
                <Square size={18} />
              </Button>
            ) : (
              <Button
                appearance="custom"
                type="submit"
                aria-label="Gửi câu hỏi"
                disabled={!draft.trim() || resetting}
              >
                <Send size={20} />
              </Button>
            )}
          </Form>
          <p className="at-chat-footer">
            Hỗ trợ dịch vụ · Liên hệ nhân viên y tế nếu cần tư vấn sức khỏe
          </p>
        </section>
      )}
      <Button
        appearance="custom"
        ref={launcher}
        type="button"
        className="at-chat-launcher"
        aria-expanded={open}
        aria-label={open ? "Đóng Hỏi Minh An" : "Mở Hỏi Minh An"}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <MessageCircle size={22} />
        <span>Hỏi Minh An</span>
      </Button>
    </div>
  );
}
