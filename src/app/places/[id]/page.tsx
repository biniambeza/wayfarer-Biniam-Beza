import { Suspense } from "react";
import { PlaceDetail, PlaceDetailSkeleton } from "@/components/place-detail";

export default function PlacePage() {
  return (
    <Suspense fallback={<PlaceDetailSkeleton />}>
      <PlaceDetail />
    </Suspense>
  );
}
