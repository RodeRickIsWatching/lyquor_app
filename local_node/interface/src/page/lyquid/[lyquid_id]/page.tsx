import { LyquidOverview } from "@/components/lyquid-overview";
import { RpcCommand } from "@/components/rpc-command";
import { LyquidStudio } from "@/components/lyquid-studio";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useParams, useSearchParams, useNavigate } from "react-router";
import { LyquidInstance } from "@/components/lyquid-instance";

export const SpecificLyquidPage = () => {
  const { lyquid_id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tabParam = searchParams.get("tab") ?? "overview";

  const handleTabChange = (value: string) => {
    searchParams.set("tab", value);
    navigate(`?${searchParams.toString()}`, { replace: true });
  };

  return (
    <Tabs
      className="pt-4 px-4 gap-4 pb-6 h-full"
      value={tabParam}
      onValueChange={handleTabChange}
    >
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="playground">Playground</TabsTrigger>
        <TabsTrigger value="studio">Studio</TabsTrigger>
        <TabsTrigger value="instance">Instance</TabsTrigger>
      </TabsList>

      <TabsContent className="[&>div]:h-full" value="overview">
        <LyquidOverview lyquid_id={lyquid_id} />
      </TabsContent>
      <TabsContent className="[&>div]:h-full" value="playground">
        <RpcCommand prefix="ly_" lyquid_id={lyquid_id} />
      </TabsContent>
      <TabsContent className="[&>div]:h-full" value="studio">
        <LyquidStudio lyquid_id={lyquid_id} />
      </TabsContent>
      <TabsContent className="[&>div]:h-full" value="instance">
        <LyquidInstance lyquid_id={lyquid_id} />
      </TabsContent>
    </Tabs>
  );
};
