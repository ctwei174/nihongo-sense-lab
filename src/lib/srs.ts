export type ReviewRating = "again" | "hard" | "good" | "easy";

export type ReviewScheduleResult = {
  nextReviewAt: string;
  intervalDays: number;
  ease: number;
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function calculateNextReview({
  rating,
  currentIntervalDays,
  currentEase,
}: {
  rating: ReviewRating;
  currentIntervalDays: number | null;
  currentEase: number | null;
}): ReviewScheduleResult {
  const now = new Date();

  const interval = currentIntervalDays ?? 1;
  const ease = currentEase ?? 2.5;

  let nextIntervalDays = 1;
  let nextEase = ease;

  switch (rating) {
    case "again":
      nextIntervalDays = 1;
      nextEase = clamp(ease - 0.2, 1.3, 3.0);
      break;

    case "hard":
      nextIntervalDays = Math.max(1, Math.round(interval * 1.2));
      nextEase = clamp(ease - 0.1, 1.3, 3.0);
      break;

    case "good":
      nextIntervalDays = Math.max(3, Math.round(interval * ease));
      nextEase = ease;
      break;

    case "easy":
      nextIntervalDays = Math.max(7, Math.round(interval * ease * 1.5));
      nextEase = clamp(ease + 0.15, 1.3, 3.0);
      break;
  }

  return {
    nextReviewAt: addDays(now, nextIntervalDays).toISOString(),
    intervalDays: nextIntervalDays,
    ease: nextEase,
  };
}