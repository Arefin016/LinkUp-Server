const express = require("express")
const app = express()
const cors = require("cors")
const jwt = require("jsonwebtoken")
require("dotenv").config()
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb")
const port = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// MongoDB Connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hrdcqgm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

// Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

// Middleware to set the Keep-Alive header
app.use((req, res, next) => {
  res.setHeader("Connection", "keep-alive")
  res.setHeader("Keep-Alive", "timeout=5, max=1000")
  next()
})

// Ensure MongoDB connection is reused and available
async function run() {
  try {
    // Connecting to MongoDB
    // await client.connect()

    const userCollection = client.db("LinkUp").collection("users")
    const eventsCollection = client.db("LinkUp").collection("events")
    const reviewCollection = client.db("LinkUp").collection("reviews")

    console.log("Successfully connected to MongoDB!")

    //jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      })
      res.send({ token })
    })

    //middlewares
    const verifyToken = (req, res, next) => {
      console.log("inside verify token", req.headers.authorization)
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" })
      }
      const token = req.headers.authorization.split(" ")[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" })
        }
        req.decoded = decoded
        next()
      })
    }

    // use verify  admin after verify token
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded?.email
      const query = { email: email }
      const user = await userCollection.findOne(query)
      const isAdmin = user?.role === "admin"
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" })
      }
      next()
    }

    //Users related api
    //Get the all user
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" })
      }
      const query = { email: email }
      const user = await userCollection.findOne(query)
      let admin = false
      if (user) {
        admin = user?.role === "admin"
      }
      res.send({ admin })
    })

    // POST: Add new user
    app.post("/users", async (req, res) => {
      const user = req.body
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query)

      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null })
      }

      const result = await userCollection.insertOne(user)
      res.send(result)
    })

    // make a admin
    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id
        const filter = { _id: new ObjectId(id) }
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        }
        const result = await userCollection.updateOne(filter, updatedDoc)
        res.send(result)
      }
    )

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query)
      res.send(result)
    })

    // POST: Add a new event
    app.post("/add-event", async (req, res) => {
      const newEvent = req.body
      try {
        const result = await eventsCollection.insertOne(newEvent)
        res.status(201).send({
          success: true,
          message: "Event added successfully!",
          result,
        })
      } catch (error) {
        console.error("Error inserting event:", error)
        res
          .status(500)
          .send({ success: false, message: "Failed to add event." })
      }
    })

    // GET: Fetch all events
    app.get("/events", async (req, res) => {
      try {
        const events = await eventsCollection.find().toArray()
        res.status(200).send(events)
      } catch (error) {
        console.error("Error fetching events:", error)
        res.status(500).send({
          success: false,
          message: "Failed to fetch events.",
        })
      }
    })

    // PUT: Update an event by its ID
    app.put("/events/:id", async (req, res) => {
      const { id } = req.params
      const updatedEvent = req.body

      try {
        const result = await eventsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedEvent }
        )
        if (result.modifiedCount > 0) {
          res.send({ success: true, message: "Event updated successfully" })
        } else {
          res
            .status(404)
            .send({ success: false, message: "Event not found or not updated" })
        }
      } catch (error) {
        console.error("Error updating event:", error)
        res
          .status(500)
          .send({ success: false, message: "Failed to update event" })
      }
    })

    // DELETE: Cancel (Delete) an event by its ID
    app.delete("/events/:id", async (req, res) => {
      const { id } = req.params

      try {
        const result = await eventsCollection.deleteOne({
          _id: new ObjectId(id),
        })
        if (result.deletedCount > 0) {
          res.send({ success: true, message: "Event canceled successfully" })
        } else {
          res.status(404).send({
            success: false,
            message: "Event not found or already deleted",
          })
        }
      } catch (error) {
        console.error("Error deleting event:", error)
        res
          .status(500)
          .send({ success: false, message: "Failed to cancel event" })
      }
    })

    //  review section post

    app.post("/reviews", async (req, res) => {
      const item = req.body
      const result = await reviewCollection.insertOne(item)
      res.send(result)
    })
    // review get

    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray()
      res.send(result)
    })
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error)
  }
}

// Run the MongoDB and Express server
run().catch(console.dir)

// Default route for testing
app.get("/", (req, res) => {
  res.send("LinkUp Backend is running")
})

// Start the server and configure Keep-Alive settings
const server = app.listen(port, () => {
  console.log(`LinkUp Backend is running on port ${port}`)
})

server.keepAliveTimeout = 5000
server.headersTimeout = 10000
