import { redirect } from "next/navigation";

export default async function BinCardsRootPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const cleanParams: Record<string, string> = {};
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (typeof v === "string") cleanParams[k] = v;
    });
  }
  const queryString = new URLSearchParams(cleanParams).toString();
  redirect(`/dashboard/bin-cards/material${queryString ? `?${queryString}` : ""}`);
}
