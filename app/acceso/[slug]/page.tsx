"use client";

import { useParams } from "next/navigation";
import { RedeemAccess } from "@/components/AuthGate";

/** Destino del link personal que Aurora manda por WhatsApp */
export default function AccessPage() {
  const { slug } = useParams<{ slug: string }>();
  return <RedeemAccess slug={slug} />;
}
