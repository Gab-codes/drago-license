export const runtime = "nodejs";

import crypto from "crypto";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your MongoDB URI to .env.local");
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const key = searchParams.get("key");
  const device = searchParams.get("device");

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  if (!action) {
    return new Response(JSON.stringify({ error: "Action is required" }), {
      status: 400,
      headers,
    });
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const collection = db.collection("licenses");

    switch (action) {
      case "generate": {
        const newKey = crypto.randomBytes(16).toString("hex");
        await collection.insertOne({
          license_key: newKey,
          activated: false,
          device_id: null,
          activated_at: null,
          created_at: new Date(),
        });
        return new Response(JSON.stringify({ license_key: newKey }), {
          status: 200,
          headers,
        });
      }

      case "activate": {
        if (!key || !device) {
          return new Response(
            JSON.stringify({ error: "Both key and device ID are required" }),
            { status: 400, headers }
          );
        }

        const license = await collection.findOne({
          license_key: key,
          activated: false,
        });

        if (!license) {
          return new Response(
            JSON.stringify({ error: "Invalid or already activated key" }),
            { status: 400, headers }
          );
        }

        await collection.updateOne(
          { license_key: key },
          {
            $set: {
              activated: true,
              device_id: device,
              activated_at: new Date(),
            },
          }
        );

        return new Response(
          JSON.stringify({ success: "License activated successfully" }),
          { status: 200, headers }
        );
      }

      case "validate": {
        if (!key || !device) {
          return new Response(
            JSON.stringify({ error: "Both key and device ID are required" }),
            { status: 400, headers }
          );
        }

        const license = await collection.findOne({
          license_key: key,
          activated: true,
          device_id: device,
        });

        return new Response(JSON.stringify({ valid: !!license }), {
          status: 200,
          headers,
        });
      }

      case "check": {
        if (!key) {
          return new Response(
            JSON.stringify({ error: "License key is required" }),
            { status: 400, headers }
          );
        }

        const license = await collection.findOne({ license_key: key });
        return new Response(
          JSON.stringify({
            exists: !!license,
            activated: license?.activated || false,
            device_id: license?.device_id || null,
          }),
          { status: 200, headers }
        );
      }

      case "revoke": {
        if (!key) {
          return new Response(
            JSON.stringify({ error: "License key is required" }),
            { status: 400, headers }
          );
        }

        const result = await collection.deleteOne({ license_key: key });
        return new Response(
          JSON.stringify({
            success:
              result.deletedCount > 0 ? "License revoked" : "License not found",
          }),
          { status: 200, headers }
        );
      }

      case "list": {
        const licenses = await collection
          .find()
          .project({
            _id: 0,
            license_key: 1,
            activated: 1,
            device_id: 1,
            activated_at: 1,
            created_at: 1,
          })
          .sort({ created_at: -1 })
          .toArray();
        return new Response(JSON.stringify(licenses), { status: 200, headers });
      }

      default: {
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers,
        });
      }
    }
  } catch (error) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers,
    });
  }
}
