import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import type { LyquidItemMeta } from "@/hooks/use-local-node-meta"



export function LyquidCard({ data }: { data: LyquidItemMeta }) {
  return (
    <Card className="rounded-2xl shadow-md border border-gray-200 mb-4">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          {data.id}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 合约地址 */}
        <div>
          <p className="text-sm text-gray-500">Contract</p>
          <p className="font-mono text-sm break-all">
            {data.latestInfo.contract}
          </p>
        </div>

        {/* Number 信息 */}
        <div>
          <p className="text-sm text-gray-500">Number</p>
          <p className="font-mono text-sm">
            image: {data.latestInfo.number.image}, var: {data.latestInfo.number.var}
          </p>
        </div>

        {/* Console 日志 */}
        {data.console?.text?.trim() && (
          <div>
            <p className="text-sm text-gray-500">Console</p>
            <pre className="bg-gray-100 rounded-md p-2 text-xs font-mono whitespace-pre-wrap">
              {data.console.text}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
