import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { QuoteWizard } from "./quote-wizard";
import { getCustomerById } from "./actions";

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { customerId } = await searchParams;
  const initialCustomer = customerId ? await getCustomerById(customerId) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10 px-4 py-3 flex items-center gap-3">
        <Link href="/quotes" className="p-2 -ml-2 text-gray-600">
          <ArrowLeftIcon size={24} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">새 견적 만들기</h1>
      </header>
      <QuoteWizard initialCustomer={initialCustomer ?? undefined} />
    </div>
  );
}
