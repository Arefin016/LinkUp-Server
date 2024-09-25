const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2gatl9i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect to the MongoDB cluster
    await client.connect();
    const database = client.db("linkUpDB"); 
    const eventsCollection = database.collection("events"); 

    // POST route to save events from client-side
    app.post("/add-event", async (req, res) => {
      const newEvent = req.body; // Event data sent from the client
      try {
        const result = await eventsCollection.insertOne(newEvent);
        res.status(201).send({ success: true, message: "Event added successfully!", result });
      } catch (error) {
        console.error("Error inserting event:", error);
        res.status(500).send({ success: false, message: "Failed to add event." });
      }
    });

    console.log("Successfully connected to MongoDB!");
  } catch (error) {
    console.error("Connection error:", error);
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("LinkUp Backend is running");
});

app.listen(port, () => {
  console.log(`LinkUp Backend is running on port ${port}`);
});
