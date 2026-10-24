"use client";

/**
 * Poll details route entry point
 *
 * URL: /polls/[id]
 * Extracts the poll ID from the route parameters and passes it to PollDetail.
 * Uses React.use() to unwrap the asynchronous params in Next.js 15.
 */

import React, { use } from "react";
import PollDetail from "@/components/polls/PollDetail";
import { Alert } from "@/components/ui/Alert";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PollDetailPage({ params }: PageProps) {
  // Next.js 15: params is a Promise; unwrap it with use()
  const { id } = use(params);

  // Try to convert the ID to a bigint
  let pollId: number;
  try {
    pollId = Number(id);
  } catch {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <Alert variant="error" title="Invalid poll ID">
          “{id}” is not a valid poll ID.
          <Link href="/polls" className="text-blue-500 underline ml-2">
            Back to polls
          </Link>
        </Alert>
      </div>
    );
  }

  return <PollDetail pollId={pollId} />;
}
