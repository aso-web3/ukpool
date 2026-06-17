import { useState, useEffect } from "react";
import { useGetPublicCurrentWeek, useSubmitAgentApplication } from "@workspace/api-client-react";
import { PublicShell } from "@/components/PublicShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CalendarClock, Award, Building2, Hash, Trophy, ArrowRight } from "lucide-react";

function Countdown({ closesAt }: { closesAt: string | null | undefined }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  if (!closesAt) return null;
  const diff = new Date(closesAt).getTime() - now;
  if (diff <= 0) return <span className="font-mono text-destructive">CLOSED</span>;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <span className="font-mono tabular-nums text-primary">
      {d}d {String(h).padStart(2, "0")}h {String(m).padStart(2, "0")}m {String(s).padStart(2, "0")}s
    </span>
  );
}

export default function PublicHome() {
  const { data: weekInfo } = useGetPublicCurrentWeek();
  const submitApp = useSubmitAgentApplication();

  const [form, setForm] = useState({ fullName: "", shopName: "", location: "", phone: "", email: "" });
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.shopName || !form.location || !form.phone || !form.email) {
      toast.error("Please fill in all fields");
      return;
    }
    submitApp.mutate(
      { data: form },
      {
        onSuccess: () => {
          toast.success("Application submitted. We'll be in touch.");
          setForm({ fullName: "", shopName: "", location: "", phone: "", email: "" });
        },
        onError: () => toast.error("Failed to submit application"),
      }
    );
  };

  const week = weekInfo?.week;

  return (
    <PublicShell>
      <section className="border-b border-border/40 py-16 md:py-24">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge variant="outline" className="border-primary/30 text-primary uppercase tracking-wider">
                DiamondPool 49 Football Pools
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
                Pick numbers.<br />
                <span className="text-primary">Win big.</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-md">
                Diamondpool 49 brings weekly football pool betting through trusted agents nationwide.
                Play NAP or PERM and win exciting payouts.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#apply">
                  <Button size="lg">Become an Agent <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </a>
                <a href="/login">
                  <Button size="lg" variant="outline">Staff Sign In</Button>
                </a>
              </div>
            </div>
            <Card className="p-6 md:p-8 border-primary/20 bg-card/60 backdrop-blur">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">This Week</div>
                  <div className="text-3xl font-bold mt-1">
                    Week #{week?.weekNumber ?? "—"}
                  </div>
                </div>
                {week ? (
                  <Badge
                    variant="outline"
                    className={
                      week.status === "open"
                        ? "border-primary text-primary"
                        : "border-muted-foreground text-muted-foreground"
                    }
                  >
                    {week.status.toUpperCase()}
                  </Badge>
                ) : (
                  <Badge variant="outline">No active week</Badge>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <CalendarClock className="h-4 w-4" /> Closes in
                  </span>
                  <Countdown closesAt={week?.closesAt} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Hash className="h-4 w-4" /> Fixtures
                  </span>
                  <span className="font-mono">49</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

<section className="border-b border-border/40 py-16">
  <div className="container max-w-5xl mx-auto px-4">
    <div className="text-center">
      <h2 className="text-3xl md:text-4xl font-bold mb-8">
        About Diamondpool 49
      </h2>

      <div className="space-y-6 text-lg text-muted-foreground leading-8 max-w-4xl mx-auto">
        <p>
          Diamondpool 49 is a trusted football pool betting platform built for players
          who enjoy weekly number-based football predictions and exciting payouts.
        </p>

        <p>
          We provide an exciting avenue for football pools stakers from any part
          of the world to take part in pool betting based on the weekly fixtures
          as published by the Pools Promoters Association in London.
        </p>

        <p>
          Through our network of authorized agents and cashiers, players can
          participate in NAP and PERM pool betting with transparent ticketing,
          reliable settlement, and secure operations.
        </p>

        <p>
          Our goal is to deliver a simple, professional, and rewarding football
          pool betting experience.
        </p>
      </div>
    </div>
  </div>
</section>

      <section className="py-16 border-b border-border/40">
        <div className="container max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">How it works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Hash, title: "Pick your numbers", body: "Choose from 49 weekly fixtures. The numbers represent matches likely to draw." },
              { icon: Award, title: "Choose a bet type", body: "NAP plays exactly 3. PERM plays many for combination wins (Under 3-6 levels)." },
              { icon: Trophy, title: "Collect winnings", body: "If your selections come in, we settle automatically. Cash collected at the shop." },
            ].map((s, i) => (
              <Card key={i} className="p-6 space-y-3">
                <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="apply" className="py-16">
        <div className="container max-w-2xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Become an agent</h2>
            <p className="text-muted-foreground">
              Apply to become a Diamondpool 49 agent and operate an authorized football pool outlet in your area.
            </p>
          </div>
          <Card className="p-6 md:p-8">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
              <div>
  <Label htmlFor="fullName">Full name</Label>
  <Input
    id="fullName"
    value={form.fullName}
    onChange={(e) =>
      setForm({ ...form, fullName: e.target.value })
    }
    placeholder="John Doe"
  />
</div>
                <div>
                  <Label htmlFor="shopName">Shop name</Label>
                  <Input id="shopName" value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} placeholder="e.g. Lucky Corner Bets" />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="State / City" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+2348012345 ..." />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@shop.com" />
                </div>
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={submitApp.isPending}>
                {submitApp.isPending ? "Submitting..." : "Submit application"}
              </Button>
            </form>
          </Card>
        </div>
      </section>
    </PublicShell>
  );
}

