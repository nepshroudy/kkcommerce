import { json } from "../utils/http.mjs";
import {
  requireProductOrderStaff,
} from "../utils/auth.mjs";

const ADMIN_TIME_ZONE = "Europe/London";

function datePartsInTimeZone(date, timeZone = ADMIN_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = Number(part.value);
    }
  }

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function isoDateFromParts({ year, month, day }) {
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function todayInTimeZone(timeZone = ADMIN_TIME_ZONE) {
  return isoDateFromParts(
    datePartsInTimeZone(new Date(), timeZone)
  );
}

function parseIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
    String(value || "")
  );

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const check = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function addCalendarDays(parts, days) {
  const date = new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day + days
    )
  );

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function localDateTimeToUtc(
  local,
  timeZone = ADMIN_TIME_ZONE
) {
  const targetAsUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour || 0,
    local.minute || 0,
    local.second || 0
  );

  let guess = targetAsUtc;

  // Iteratively correct the UTC guess until formatting it in the
  // target zone produces the requested local date/time. This keeps
  // the order-day boundary correct across GMT/BST transitions.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = datePartsInTimeZone(
      new Date(guess),
      timeZone
    );

    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second
    );

    const difference = targetAsUtc - actualAsUtc;

    if (difference === 0) break;
    guess += difference;
  }

  return new Date(guess);
}

function londonDayRange(dateString) {
  const date = parseIsoDate(dateString);

  if (!date) return null;

  const nextDate = addCalendarDays(date, 1);

  const start = localDateTimeToUtc({
    ...date,
    hour: 0,
    minute: 0,
    second: 0,
  });

  const end = localDateTimeToUtc({
    ...nextDate,
    hour: 0,
    minute: 0,
    second: 0,
  });

  return { start, end };
}

const orderInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  discount: true,
  shippingMethod: true,
  orderItems: {
    include: {
      product: true,
      variant: true,
    },
  },
};

function formatOrder(order) {
  return {
    ...order,
    items: order.orderItems || [],
  };
}

export async function adminOrdersByDateRoute(
  request,
  context
) {
  try {
    await requireProductOrderStaff(
  request,
  context.env
);

    const url = new URL(request.url);
    const requestedDate =
      url.searchParams.get("date") ||
      todayInTimeZone();

    const range = londonDayRange(requestedDate);

    if (!range) {
      return json(
        {
          message:
            "Invalid date. Use YYYY-MM-DD, for example 2026-09-03.",
        },
        400
      );
    }

    const orders =
      await context.prisma.order.findMany({
        where: {
          createdAt: {
            gte: range.start,
            lt: range.end,
          },
        },
        include: orderInclude,
        orderBy: {
          createdAt: "desc",
        },
      });

    return json(orders.map(formatOrder));
  } catch (error) {
    console.error(
      "Admin orders by date failed:",
      error
    );

    return json(
      {
        message:
          error?.message ||
          "Unable to load orders for the selected date",
      },
      error?.status || 500
    );
  }
}
