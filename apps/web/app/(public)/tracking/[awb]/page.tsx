"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { fetchPublicTrackingByAwb, PublicTrackingEvent, PublicTrackingResponse } from "@/lib/apis/shipment";
import { Card, CardContent, CardHeader, CardTitle, Badge, Separator, ScrollArea, Avatar, AvatarFallback, AvatarImage } from "@lorrigo/ui/components";
import { LorrigoLogo } from "@/components/logos/lorrigo-logo";

function formatDateTime(ts: string) {
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

function StatusBadge({ status }: { status: string }) {
  const color = useMemo(() => {
    if (!status) return "secondary" as const;
    const s = status.toUpperCase();
    if (s.includes("DELIVERED")) return "success" as const;
    if (s.includes("IN TRANSIT") || s.includes("TRANSIT")) return "default" as const;
    if (s.includes("PICKED")) return "default" as const;
    if (s.includes("OUT FOR DELIVERY") || s.includes("OUT_FOR_DELIVERY")) return "default" as const;
    if (s.includes("RTO")) return "destructive" as const;
    return "secondary" as const;
  }, [status]);
  return <Badge variant={color}>{status}</Badge>;
}

export default function PublicTrackingPage() {
  const params = useParams<{ awb: string }>();
  const awb = decodeURIComponent(params.awb || "");
  const [data, setData] = useState<PublicTrackingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const res = await fetchPublicTrackingByAwb(awb);
        if (!mounted) return;
        setData(res);
        setError(null);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.response?.data?.error || e?.message || "Failed to fetch tracking");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (awb) load();
    return () => {
      mounted = false;
    };
  }, [awb]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Tracking Results</CardTitle>
          </CardHeader>
          <CardContent>Loading...</CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Tracking Results</CardTitle>
          </CardHeader>
          <CardContent className="text-red-600">{error || "No data found"}</CardContent>
        </Card>
      </div>
    );
  }

  const sortedEvents: PublicTrackingEvent[] = [...(data.events || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const latest = sortedEvents[0];
  const latestStatus = (latest?.status || latest?.description || data.status || "").toString();
  const edd = data.edd ? new Date(data.edd).toISOString().slice(0, 10) : undefined;
  const currentLocation = latest?.location || latest?.status || "-";

  const brand = data.branding;
  const brandInitials = (brand?.name || "").split(" ").slice(0, 2).map((s) => s.charAt(0)).join("").toUpperCase() || "LR";

  return (
    <div className="container mx-auto max-w-6xl p-6">
       <LorrigoLogo className="lg:h-16 lg:w-56 mb-4" />
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Tracking Results</CardTitle>
            <StatusBadge status={latestStatus} />
          </div>
          <div className="grid w-full grid-cols-1 gap-4 text-sm text-muted-foreground sm:grid-cols-3">
            <div className="space-y-1">
              <div className="font-medium text-foreground">{data.awb}</div>
              <div className="text-xs">via {data.courier_name?.split(" ")[0] || "Courier"}</div>
            </div>
            <div className="space-y-1 sm:text-center">
              <div className="font-medium text-foreground">Current Location</div>
              <div>{currentLocation}</div>
            </div>
            <div className="space-y-1 sm:text-right">
              <div className="font-medium text-foreground">Estimated Delivery</div>
              <div>{edd || "-"}</div>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            {/* Sidebar */}
            <aside className="md:col-span-4">
              <div className="rounded-lg border bg-card p-4">
                <div className="mb-4 flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {brand?.logo_url ? <AvatarImage src={brand.logo_url} alt={brand?.name || "Brand"} /> : null}
                    <AvatarFallback>{brandInitials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-base font-semibold text-foreground">{brand?.name || "Your Company"}</div>
                    <div className="text-xs text-muted-foreground">{brand?.seller_name || brand?.user_name || brand?.hub_name || ""}</div>
                  </div>
                </div>
                <Separator />
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AWB</span>
                    <span className="font-medium">{data.awb}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Courier</span>
                    <span className="font-medium">{data.courier_name || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium">{latestStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">EDD</span>
                    <span className="font-medium">{edd || "-"}</span>
                  </div>
                </div>
              </div>
            </aside>

            {/* Timeline */}
            <section className="md:col-span-8">
              <div className="mb-4 text-lg font-semibold">Package Timeline</div>
              <ScrollArea className="h-[520px] pr-4">
                <ol className="relative border-s pl-6">
                  {sortedEvents.length === 0 && (
                    <div className="text-sm text-muted-foreground">No events available yet.</div>
                  )}
                  {sortedEvents.map((ev, idx) => {
                    const label = ev.status || ev.description || "Update";
                    const isLatest = idx === 0;
                    return (
                      <li key={`${ev.timestamp}-${idx}`} className="mb-8 ms-4">
                        <div
                          className={`absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full border ${
                            isLatest ? "bg-primary border-primary" : "bg-background"
                          }`}
                        />
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge variant={isLatest ? "default" : "secondary"}>{label}</Badge>
                          <span className="text-sm text-muted-foreground">{formatDateTime(ev.timestamp)}</span>
                        </div>
                        {ev.location && (
                          <div className="mt-1 text-sm font-medium text-foreground">{ev.location}</div>
                        )}
                        {ev.description && (
                          <div className="text-sm text-muted-foreground">{ev.description}</div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </ScrollArea>

              <div className="mt-6 text-right text-xs text-muted-foreground">
                Last updated: {new Date().toLocaleString()}
              </div>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


