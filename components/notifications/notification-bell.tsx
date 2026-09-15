"use client";

import { requestJson } from "@/lib/api/client";
import type { NotificationItem } from "@/lib/notifications/types";
import { cn, formatTimestamp } from "@/lib/utils";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const result = await requestJson<{
      items: NotificationItem[];
      unread_count: number;
    }>("/api/notifications?limit=20", { notify: false });

    if (result.ok) {
      setItems(result.data.items);
      setUnread(result.data.unread_count);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, 45_000);

    function onFocus() {
      void refresh();
    }

    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function openPanel() {
    setOpen((value) => !value);
    setLoading(true);
    await refresh();
    setLoading(false);
  }

  async function markRead(id: string) {
    await requestJson(`/api/notifications/${id}/read`, {
      method: "POST",
      notify: false,
    });
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, is_read: true } : item,
      ),
    );
    setUnread((count) => Math.max(0, count - 1));
  }

  async function markAllRead() {
    await requestJson("/api/notifications/read-all", {
      method: "POST",
      notify: false,
    });
    setItems((current) => current.map((item) => ({ ...item, is_read: true })));
    setUnread(0);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => void openPanel()}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-stone-700 hover:bg-stone-100"
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        {unread > 0 ? (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-xl border border-stone-200 bg-white shadow-lg sm:w-96">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <p className="text-sm font-semibold text-stone-900">Notifications</p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs font-medium text-amber-700 hover:text-amber-800"
              >
                Mark all as read
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-stone-500">Loading...</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-stone-500">
                No notifications yet.
              </p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.action_url || "#"}
                      onClick={() => {
                        if (!item.is_read) {
                          void markRead(item.id);
                        }
                        setOpen(false);
                      }}
                      className={cn(
                        "block px-4 py-3 hover:bg-stone-50",
                        !item.is_read && "bg-amber-50/40",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-stone-900">
                          {item.title}
                        </p>
                        {!item.is_read ? (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-600" />
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-stone-600">
                        {item.message}
                      </p>
                      <p className="mt-1 text-xs text-stone-400">
                        {formatTimestamp(item.created_at)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
