import { NextResponse } from "next/server";

export type ApiSuccess<T> = {
  ok: true;
  message: string;
  data: T;
};

export type ApiError = {
  ok: false;
  message: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function apiSuccess<T>(message: string, data: T, status = 200) {
  return NextResponse.json(
    { ok: true, message, data } satisfies ApiSuccess<T>,
    { status },
  );
}

export function apiError(message: string, status = 400) {
  return NextResponse.json(
    { ok: false, message } satisfies ApiError,
    { status },
  );
}
