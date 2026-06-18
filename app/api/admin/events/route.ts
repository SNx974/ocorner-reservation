export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function checkAdminAuth(req: NextRequest): boolean {
  const a = checkAuth(req.headers.get("x-admin-token"));
  if (!a.valid) return false;
  if (req.method !== "GET" && a.role !== "admin") return false; // moderators: read-only
  return true;
}

function slugify(s: string): string {
  return s
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "event";
}

// GET — list events with their bookings summary
export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const events = await prisma.event.findMany({
    orderBy: { eventDate: "desc" },
    include: {
      reservations: {
        where: { status: { notIn: ["cancelled", "expired"] } },
        select: { id: true, reference: true, clientName: true, clientEmail: true, clientPhone: true, playerCount: true, totalPrice: true, fullPaymentPaid: true, depositPaid: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const result = events.map(e => {
    const seats = e.reservations.reduce((s, r) => s + (r.playerCount ?? 1), 0);
    return { ...e, bookedSeats: seats, bookingCount: e.reservations.length };
  });

  return NextResponse.json(result);
}

// POST — create an event
export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { title, description, price, priceNote, eventDate, capacity, imageUrl, accentColor } = body;
  if (!title || !eventDate || price === undefined || price === "") {
    return NextResponse.json({ error: "Titre, date et prix requis" }, { status: 400 });
  }

  // Unique slug
  let slug = body.slug ? slugify(body.slug) : slugify(title);
  let n = 1;
  while (await prisma.event.findUnique({ where: { slug } })) {
    slug = `${slugify(title)}-${++n}`;
  }

  const event = await prisma.event.create({
    data: {
      slug, title,
      description: description ?? "",
      price: parseFloat(price),
      priceNote: priceNote || null,
      eventDate: new Date(eventDate),
      capacity: capacity !== undefined && capacity !== "" ? parseInt(capacity) : null,
      imageUrl: imageUrl || null,
      accentColor: accentColor || null,
      isActive: true,
    },
  });
  return NextResponse.json(event);
}

// PATCH — update an event
export async function PATCH(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.price !== undefined && body.price !== "") data.price = parseFloat(body.price);
  if (body.priceNote !== undefined) data.priceNote = body.priceNote || null;
  if (body.eventDate !== undefined && body.eventDate !== "") data.eventDate = new Date(body.eventDate);
  if (body.capacity !== undefined) data.capacity = body.capacity === "" || body.capacity === null ? null : parseInt(body.capacity);
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl || null;
  if (body.accentColor !== undefined) data.accentColor = body.accentColor || null;
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const event = await prisma.event.update({ where: { id }, data });
  return NextResponse.json(event);
}

// DELETE — remove an event (only if no bookings)
export async function DELETE(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });

  const count = await prisma.reservation.count({ where: { eventId: id } });
  if (count > 0) {
    return NextResponse.json({ error: "Impossible de supprimer : des réservations existent. Désactivez l'événement à la place." }, { status: 409 });
  }
  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
