"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Volume2, VolumeX, Maximize } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useEventStream } from "@/hooks/use-event-stream";
import { newCalls, type QueueBoardData, type QueueRoom } from "@/lib/realtime";
import styles from "./queue-board.module.css";
import { Button, Notice } from "@/components/ui";
import { InlineStatus } from "@/components/ui/data-display";

export function QueueBoard({ rooms }: { rooms: string }) {
  const cache = useQueryClient();
  const [sound, setSound] = useState(false);
  const [clock, setClock] = useState("");
  const [flashing, setFlashing] = useState<number[]>([]);
  const previous = useRef(new Map<number, string | null>());
  const initialized = useRef(false);
  const audio = useRef<AudioContext | null>(null);
  const suffix = rooms ? `?rooms=${encodeURIComponent(rooms)}` : "";
  const queryKey = ["public-queue-board", rooms];
  const polling = useRef(true);
  const board = useQuery({
    queryKey,
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<QueueBoardData>(`/api/v1/public/queue-display${suffix}`, { signal }),
    // Poll occasionally even when healthy, to apply settings changes without an event.
    refetchInterval: () => (polling.current ? 10000 : 20000),
    retry: (count, error) =>
      !(error instanceof ApiError && [400, 403].includes(error.status)) && count < 2,
  });
  const stream = useEventStream(
    board.error ? null : `/api/v1/public/queue-display/stream${suffix}`,
    () => {
      void cache.invalidateQueries({ queryKey: ["public-queue-board", rooms] });
    },
  );
  useEffect(() => {
    polling.current = stream.polling;
  }, [stream.polling]);
  useEffect(() => {
    const timer = setInterval(
      () => setClock(new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })),
      1000,
    );
    return () => {
      clearInterval(timer);
      window.speechSynthesis?.cancel();
      void audio.current?.close();
    };
  }, []);
  useEffect(() => {
    if (board.error) {
      initialized.current = false;
      window.speechSynthesis?.cancel();
    }
  }, [board.error, board.data]);
  useEffect(() => {
    if (!stream.connected) initialized.current = false;
  }, [stream.connected]);
  useEffect(() => {
    if (!board.data || board.error) return;
    const result = newCalls(previous.current, board.data.rooms, initialized.current);
    previous.current = result.keys;
    initialized.current = true;
    if (!result.calls.length) return;
    const start = setTimeout(() => setFlashing(result.calls.map((room) => room.roomId)), 0);
    if (sound) {
      chime(audio.current);
      // Bound speech backlog when several rooms call together.
      if (window.speechSynthesis?.pending) window.speechSynthesis.cancel();
      result.calls.slice(0, 5).forEach(announce);
    }
    const timer = setTimeout(() => setFlashing([]), 6000);
    return () => {
      clearTimeout(start);
      clearTimeout(timer);
    };
  }, [board.data, board.error, sound]);
  async function toggleSound() {
    if (sound) {
      window.speechSynthesis?.cancel();
      setSound(false);
      return;
    }
    try {
      audio.current ??= new AudioContext();
      await audio.current.resume();
      chime(audio.current);
      setSound(true);
    } catch {
      setSound(true);
    }
  }
  return (
    <main className={styles.board}>
      <header className={styles.header}>
        <div>
          <p className={styles.brand}>
            <Image
              src="/images/brand/minh-an-logo.png"
              alt="Logo Bệnh viện Minh An"
              width={56}
              height={56}
              className={styles.brandLogo}
              unoptimized
            />
            MINH AN <span>CLINIC</span>
          </p>
          <h1>{board.data?.clinicName ?? "Bảng gọi số"}</h1>
        </div>
        <div className={styles.tools}>
          <time>{clock || "—"}</time>
          <InlineStatus>{stream.connected ? "Trực tuyến" : "Đang kết nối lại"}</InlineStatus>
          <Button appearance="custom" onClick={() => void toggleSound()} aria-pressed={sound}>
            {sound ? <VolumeX size={20} /> : <Volume2 size={20} />}{" "}
            {sound ? "Tắt âm thanh" : "Bật âm thanh"}
          </Button>
          <Button
            appearance="custom"
            onClick={() =>
              void document.documentElement.requestFullscreen?.().catch(() => undefined)
            }
          >
            <Maximize size={20} /> Toàn màn hình
          </Button>
        </div>
      </header>
      <p className={styles.title}>Mời quý khách theo dõi số thứ tự và đến đúng phòng khám</p>
      {board.error ? (
        <div className={styles.message}>
          <Notice tone="error">
            {board.error instanceof ApiError && board.error.status === 403
              ? "Màn hình gọi số đang tạm tắt."
              : "Không tải được bảng gọi số. Hệ thống sẽ tự thử lại."}
          </Notice>
          <Button appearance="custom" onClick={() => void board.refetch()}>
            Thử lại
          </Button>
        </div>
      ) : board.isPending ? (
        <p className={styles.message}>Đang tải bảng gọi số…</p>
      ) : !board.data?.rooms.length ? (
        <p className={styles.message}>Chưa có lượt chờ khám hôm nay.</p>
      ) : (
        <div className={styles.grid}>
          {board.data.rooms.map((room) => (
            <section className={styles.room} key={room.roomId}>
              <h2>{room.roomName}</h2>
              <div
                className={`${styles.current} ${flashing.includes(room.roomId) ? styles.flash : ""}`}
              >
                <p>ĐANG MỜI</p>
                <strong>{room.current?.queueNumber ?? "—"}</strong>
                <h3>{room.current?.displayName ?? "Vui lòng chờ gọi số"}</h3>
              </div>
              <div className={styles.next}>
                <p>TIẾP THEO</p>
                {room.next.length ? (
                  <ol>
                    {room.next.map((ticket) => (
                      <li key={ticket.queueNumber}>
                        <strong>{ticket.queueNumber}</strong>
                        <span>{ticket.displayName}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>Chưa có lượt tiếp theo</p>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
      <footer>Xin chuẩn bị phiếu khám khi được gọi · Chúc quý khách nhiều sức khỏe</footer>
    </main>
  );
}

function announce(room: QueueRoom) {
  if (!room.current || !window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined")
    return;
  const message = new SpeechSynthesisUtterance(
    `Mời số ${room.current.queueNumber}, ${room.current.displayName}, vào ${room.roomName}`,
  );
  message.lang = "vi-VN";
  message.rate = 0.9;
  const voice = window.speechSynthesis.getVoices().find((voice) => voice.lang.startsWith("vi"));
  if (voice) message.voice = voice;
  window.speechSynthesis.speak(message);
}

function chime(context: AudioContext | null) {
  if (!context || context.state !== "running") return;
  [659, 880].forEach((frequency, i) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.frequency.value = frequency;
    const at = context.currentTime + i * 0.22;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.12, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.45);
    oscillator.start(at);
    oscillator.stop(at + 0.5);
  });
}
