import { Suspense } from "react";
import BinCardView from "@/sections/bin-card/BinCardView";

export default function MaterialBinPage() {
  return (
    <Suspense fallback={null}>
      <BinCardView />
    </Suspense>
  );
}
