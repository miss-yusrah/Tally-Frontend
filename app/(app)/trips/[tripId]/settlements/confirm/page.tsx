import { redirect } from "next/navigation";

/** Legacy confirm route — settlements now confirm via BottomSheet on the balance dashboard. */
export default function SettlementConfirmRedirect({
  params,
}: {
  params: { tripId: string };
}) {
  redirect(`/trips/${params.tripId}/balances`);
}
