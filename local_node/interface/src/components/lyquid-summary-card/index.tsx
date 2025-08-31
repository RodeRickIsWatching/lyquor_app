import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Link } from "react-router";
import { ArrowRightIcon } from "lucide-react";

export function LyquidSummaryCard({ data }: { data: any }) {
    return (
        <Link to={`/lyquid/${data.id}`}>
            <Card className="!py-3 !gap-2 transition hover:shadow-[3px_3px_5px_1px_rgba(0,0,0,0.1)] group">
                <CardHeader className="z-10 border-b !pb-1">
                    <CardTitle className="text-sm flex items-center justify-between">
                        <p>{data.name.slice(0, 12)}...{data.name.slice(-6)}</p>
                        <div className="w-4 pl-1 overflow-hidden">
                            <div className="flex items-center w-fit transition group-hover:-translate-x-3">
                                <div className="bg-green-500 min-size-2 size-2 rounded-full animate-pulse" />
                                <ArrowRightIcon className="min-size-4 size-4 pl-1" />
                            </div>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="!pt-1 flex flex-col gap-2  [&>div]:text-right [&>div]:flex [&>div]:gap-2 [&>div]:items-start [&>div]:justify-between">
                    <div className=" gap-2 text-xs">
                        <p className="text-gray-400 font-medium">ID</p>
                        <p className="break-all">{data.id}</p>
                    </div>
                    <div className=" gap-2 text-xs">
                        <p className="text-gray-400 font-medium">Contract</p>
                        <p className="break-all">{data.contract}</p>
                    </div>

                </CardContent>
            </Card>
        </Link>
    );
}
