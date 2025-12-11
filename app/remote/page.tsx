import { RemoteControl } from "@/components/remote-control"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Remote Control | Reddit Music Player",
  description: "Control your Reddit Music Player remotely from any device.",
}

export default function RemotePage({
  searchParams,
}: {
  searchParams: { hash?: string }
}) {
  const initialHash = searchParams.hash || null

  return (
    <div className="flex-1 bg-[#111] overflow-y-auto p-4">
      <h1 className="text-white text-xl font-bold mb-4">Remote Control</h1>
      <RemoteControl initialHash={initialHash} />
    </div>
  )
}
