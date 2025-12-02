
async function main() {
    console.log("Starting tRPC debug (fetch only)...");

    const payload = {
        "0": {
            "json": {
                "eventId": "sf-demo",
                "startupAId": "demo-1",
                "startupBId": "demo-2",
                "roundType": "Final",
                "votingWindow": 300
            }
        }
    };

    console.log("Sending payload:", JSON.stringify(payload, null, 2));

    try {
        const response = await fetch("http://localhost:3000/api/trpc/match.create?batch=1", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        console.log("Response status:", response.status);
        const text = await response.text();

        try {
            const json = JSON.parse(text);
            if (json.error) {
                console.log("Error details:", JSON.stringify(json.error, null, 2));
            } else if (json[0]?.error) {
                console.log("Batch Error details:", JSON.stringify(json[0].error, null, 2));
            } else {
                console.log("Response body:", text);
            }
        } catch (e) {
            console.log("Response body (not JSON):", text);
        }

    } catch (error) {
        console.error("Fetch error:", error);
    }
}

main();
