import { PublicTrackingEvent, PublicTrackingResponse } from '@/lib/apis/shipment';
import { Card, CardContent, CardHeader, CardTitle, Badge, Separator, ScrollArea, Avatar, AvatarFallback, AvatarImage } from '@lorrigo/ui/components';
import { LorrigoLogo } from '@/components/logos/lorrigo-logo';
import { AwbNotFound } from '@/components/awb-not-found';

// Static Generation with revalidation (SGR)
export const revalidate = 60; // Revalidate every 60 seconds

function formatDateTime(ts: string) {
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

function StatusBadge({ status }: { status: string }) {
  let color: 'success' | 'default' | 'destructive' | 'secondary' = 'secondary';
  if (status) {
    const s = status.toUpperCase();
    if (s.includes('DELIVERED')) color = 'success';
    else if (s.includes('IN TRANSIT') || s.includes('PICKED') || s.includes('OUT FOR DELIVERY')) color = 'default';
    else if (s.includes('RTO')) color = 'destructive';
  }
  return <Badge variant={color}>{status}</Badge>;
}

export async function generateMetadata({ params }: { params: Promise<{ awb: string }> }) {
  const awb = decodeURIComponent((await params).awb || '');
  try {
    const data = (await fetch(`http://localhost:8000/api/v2/shipments/public/tracking/${awb}`).then((res) => res.json())) as PublicTrackingResponse;
    console.log(data, 'data')
    return {
      title: `Tracking - ${data.awb || awb}`,
      description: `Track shipment ${data.awb || awb} via ${data.courier_name || 'Courier'}`,
    };
  } catch(e) {
    console.log(e, 'error')
    return {
      title: 'Tracking Not Found',
      description: 'No tracking information available.',
    };
  }
}

export default async function PublicTrackingPage({ params }: { params: Promise<{ awb: string }> }) {
  const awb = decodeURIComponent((await params).awb || '');

  let data: PublicTrackingResponse;
  try {
    data = (await fetch(`http://localhost:8000/api/v2/shipments/public/tracking/${awb}`).then((res) => res.json())) as PublicTrackingResponse;
  } catch (error) {
    return <AwbNotFound/>;
  }

  // if (!data || !data.events) {
  //   return <AwbNotFound />;
  // }

  const sortedEvents: PublicTrackingEvent[] = [...data.events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const latest = sortedEvents[0];
  const latestStatus = (latest?.status || latest?.description || data.status || '').toString();
  const edd = data.edd ? new Date(data.edd).toISOString().slice(0, 10) : undefined;
  const currentLocation = latest?.location || latest?.status || '-';

  const brand = data.branding;
  const brandInitials =
    (brand?.name || '')
      .split(' ')
      .slice(0, 2)
      .map((s) => s.charAt(0))
      .join('')
      .toUpperCase() || 'LR';

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <LorrigoLogo className="mb-4 lg:h-16 lg:w-56" />
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Tracking Results</CardTitle>
            <StatusBadge status={latestStatus} />
          </div>
          <div className="text-muted-foreground grid w-full grid-cols-1 gap-4 text-sm sm:grid-cols-3">
            <div className="space-y-1">
              <div className="text-foreground font-medium">{data.awb}</div>
              <div className="text-xs">via {data.courier_name?.split(' ')[0] || 'Courier'}</div>
            </div>
            <div className="space-y-1 sm:text-center">
              <div className="text-foreground font-medium">Current Location</div>
              <div>{currentLocation}</div>
            </div>
            <div className="space-y-1 sm:text-right">
              <div className="text-foreground font-medium">Estimated Delivery</div>
              <div>{edd || '-'}</div>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            {/* Sidebar */}
            <aside className="md:col-span-4">
              <div className="bg-card rounded-lg border p-4">
                <div className="mb-4 flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {brand?.logo_url ? <AvatarImage src={brand.logo_url} alt={brand?.name || 'Brand'} /> : null}
                    <AvatarFallback>{brandInitials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-foreground text-base font-semibold">{brand?.name || 'Your Company'}</div>
                    <div className="text-muted-foreground text-xs">{brand?.seller_name || brand?.user_name || brand?.hub_name || ''}</div>
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
                    <span className="font-medium">{data.courier_name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium">{latestStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">EDD</span>
                    <span className="font-medium">{edd || '-'}</span>
                  </div>
                </div>
              </div>
            </aside>

            {/* Timeline */}
            <section className="md:col-span-8">
              <div className="mb-4 text-lg font-semibold">Package Timeline</div>
              <ScrollArea className="h-[520px] pr-4">
                <ol className="relative border-s pl-6">
                  {sortedEvents.length === 0 && <div className="text-muted-foreground text-sm">No events available yet.</div>}
                  {sortedEvents.map((ev, idx) => {
                    const label = ev.status || ev.description || 'Update';
                    const isLatest = idx === 0;
                    return (
                      <li key={`${ev.timestamp}-${idx}`} className="mb-8 ms-4">
                        <div className={`absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full border ${isLatest ? 'bg-primary border-primary' : 'bg-background'}`} />
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge variant={isLatest ? 'default' : 'secondary'}>{label}</Badge>
                          <span className="text-muted-foreground text-sm">{formatDateTime(ev.timestamp)}</span>
                        </div>
                        {ev.location && <div className="text-foreground mt-1 text-sm font-medium">{ev.location}</div>}
                        {ev.description && <div className="text-muted-foreground text-sm">{ev.description}</div>}
                      </li>
                    );
                  })}
                </ol>
              </ScrollArea>

              <div className="text-muted-foreground mt-6 text-right text-xs">Last updated: {new Date().toLocaleString()}</div>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
