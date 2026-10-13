import { Suspense } from "react";
import ProductionFormView from "@/sections/production/ProductionFormView";

export const metadata = {
  title: "Production",
};

export default function ProductionPage() {
  return (
    <Suspense fallback={null}>
      <ProductionFormView />
    </Suspense>
  );
}
