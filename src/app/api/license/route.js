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
          used: false,
          createdAt: new Date(),
        });
        return new Response(JSON.stringify({ license_key: newKey }), {
          status: 200,
          headers,
        });
      }
      case "validate": {
        if (!key) {
          return new Response(
            JSON.stringify({ error: "License key is required" }),
            {
              status: 400,
              headers,
            }
          );
        }
        const license = await collection.findOne({
          license_key: key,
          used: false,
        });
        if (license) {
          await collection.updateOne(
            { license_key: key },
            { $set: { used: true } }
          );
          return new Response(
            JSON.stringify({ success: "License key validated" }),
            {
              status: 200,
              headers,
            }
          );
        }
        return new Response(
          JSON.stringify({ error: "Invalid or already used license key" }),
          {
            status: 400,
            headers,
          }
        );
      }
      case "check": {
        if (!key) {
          return new Response(
            JSON.stringify({ error: "License key is required" }),
            {
              status: 400,
              headers,
            }
          );
        }
        const license = await collection.findOne({ license_key: key });
        if (license) {
          return new Response(JSON.stringify({ valid: !license.used }), {
            status: 200,
            headers,
          });
        }
        return new Response(
          JSON.stringify({ error: "License key not found" }),
          {
            status: 400,
            headers,
          }
        );
      }
      case "revoke": {
        if (!key) {
          return new Response(
            JSON.stringify({ error: "License key is required" }),
            {
              status: 400,
              headers,
            }
          );
        }
        await collection.deleteOne({ license_key: key });
        return new Response(
          JSON.stringify({ success: "License key revoked" }),
          {
            status: 200,
            headers,
          }
        );
      }
      case "list": {
        const licenses = await collection
          .find()
          .sort({ createdAt: -1 })
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers,
    });
  }
}
