const express = require("express")
const app = express()
const cors = require("cors")
require("dotenv").config()
const { MongoClient, ServerApiVersion } = require("mongodb")
const port = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2gatl9i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

// Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect()
    // Send a ping to confirm a successful connection

    const userCollection = client.db("LinkUp").collection("users")
    const eventsCollection = client.db("LinkUp").collection("events")

    //users related api
    app.post("/users", async (req, res) => {
      const user = req.body
      // insert email if user does not exist
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query)

      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null })
      }

      const result = await userCollection.insertOne(user)
      res.send(result)
    })

    // POST route to save events from client-side
    app.post("/add-event", async (req, res) => {
      const newEvent = req.body // Event data sent from the client
      try {
        const result = await eventsCollection.insertOne(newEvent)
        res
          .status(201)
          .send({ success: true, message: "Event added successfully!", result })
      } catch (error) {
        console.error("Error inserting event:", error)
        res
          .status(500)
          .send({ success: false, message: "Failed to add event." })
      }
    })
    app.get("/events", async (req, res) => {
      try {
        const events = await eventsCollection.find().toArray() // Fetch all events from MongoDB
        res.status(200).send(events)
      } catch (error) {
        console.error("Error fetching events:", error)
        res
          .status(500)
          .send({ success: false, message: "Failed to fetch events." })
      }
    })

    await client.db("admin").command({ ping: 1 })
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    )
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close()
  }
}
run().catch(console.dir)

app.get("/", (req, res) => {
  res.send("LinkUp Backend is running")
})

app.listen(port, () => {
  console.log(`LinkUp Backend is running on port ${port}`)
})
