"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { api } from "~/trpc/react";

interface LoginFormProps {
    role: "AUDIENCE" | "JUDGE";
}

export function LoginForm({ role }: LoginFormProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const eventIdParam = searchParams.get("eventId");

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Fetch current event if not provided in URL
    const { data: currentEvent } = api.event.getCurrent.useQuery(undefined, {
        enabled: !eventIdParam,
    });

    const eventId = eventIdParam || currentEvent?.id;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        if (!eventId) {
            setError("No active event found.");
            setLoading(false);
            return;
        }

        try {
            const result = await signIn("voter-auth", {
                name,
                email,
                role,
                eventId,
                redirect: false,
            });

            if (result?.error) {
                setError(result.error);
            } else {
                router.push("/"); // Redirect to home/attendee page
                router.refresh();
            }
        } catch (err) {
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-md mx-auto mt-10">
            <CardHeader>
                <CardTitle>{role === "JUDGE" ? "Judge Login" : "Audience Login"}</CardTitle>
                <CardDescription>
                    Enter your details to join the voting session.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="john@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <Button type="submit" className="w-full" disabled={loading || !eventId}>
                        {loading ? "Joining..." : "Join Event"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
