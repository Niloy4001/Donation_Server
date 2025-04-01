require("dotenv").config();
const express = require("express");
var jwt = require("jsonwebtoken");
var cookieParser = require("cookie-parser");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
// const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
// const stripe = require("stripe")(process.env.STRIPE_SECRETE_KEY);
const cors = require("cors");
const port = 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(
  cors({
    origin: ["http://localhost:5173", "https://hsn-tower-40.netlify.app"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.hcojg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1`;
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_pass}@cluster1.hcojg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middleware
const verifyToken = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "unAuthorized access" });
  }
  const token = req.headers.authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // users collection
    const usersCollection = client.db("Donation").collection("usersCollection");
    const eventsCollection = client.db("Donation").collection("eventsCollection");
    const paymentsCollection = client.db("Donation").collection("paymentsCollection");


    // payments details collection
    // const paymentsCollection = client
    //   .db("HSNTower")
    //   .collection("paymentsCollection");


    // verify admin middleware
    const verifyAdmin = async (req, res, next) => {
      // console.log('data from verifyToken middleware--->', req.user?.email)
      const email = req.user?.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      if (!result || result?.role !== "Admin")
        return res
          .status(403)
          .send({ message: "Forbidden Access! Admin Only Actions!" });
      next();
    };

    // verify volunteer middleware
    const verifyVolunteer = async (req, res, next) => {
      const email = req.user?.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      if (!result || result?.role !== "Volunteer")
        return res
          .status(403)
          .send({ message: "Forbidden Access! Member Only Actions!" });
      next();
    };

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1d",
      });
      res.send({ token });
    });

    // post user data to db
    app.post("/user", async (req, res) => {
    const user = req.body;
    const query = { email: user.email };
    const findUser = await usersCollection.findOne(query);
    if (!findUser) {
        const result = await usersCollection.insertOne(user);
    res.send(result);
    } else {
        res.send({ message: "User already exist" });
      }
    });

    app.patch("/user", async(req,res)=>{
      const email = req.query.email;
      const name = req.body;
      const query = {email: email}
      
      const updateDoc = {
        $set: {
          name: name.name,
        },
      };
      const result = await usersCollection.updateOne(query,updateDoc);   
      res.send(result);
    })
    
    app.get("/user", async(req,res)=>{
      const email = req.query.email;
      const name = req.body;
      const query = {email: email}
      
      const result = await usersCollection.findOne(query);   
      res.send(result);
    })

    

      

   

    // check user role from db usercollection
    app.get("/checkRole/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
      // console.log(result);
    });



    // get all events data 
    app.get("/events", async(req,res)=>{
        const result = await eventsCollection.find().toArray()
        res.send(result)
    })
    


    // Stripe Payment API Route
app.post("/create-payment-intent", async (req, res) => {
    try {
      const { amount } = req.body; // Amount in cents (100 cents = $1)
  
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100, // Convert dollars to cents
        currency: "usd",
        payment_method_types: ["card"],
      });
  
      res.send({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });


  app.post("/payments", async(req,res)=>{
    const paymentInfo = req.body;
    const result = await paymentsCollection.insertOne(paymentInfo);
    res.send(result)
  })
 
    

    

    

   
   


   
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
