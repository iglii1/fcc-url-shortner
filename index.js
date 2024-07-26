require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const dns = require('dns');
const urlparser = require('url');

const app = express();
const client = new MongoClient(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
const db = client.db("url_shortner");
const urls = db.collection("urls");

// Basic Configuration
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));

const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.post('/api/shorturl', async (req, res) => {
  console.log(req.body);
  const url = req.body.url;
  const hostname = urlparser.parse(url).hostname;

  try {
    // Check if the URL is valid
    dns.lookup(hostname, async (err, address) => {
      if (err || !address) {
        return res.json({ error: 'Invalid URL' });
      } else {
        try {
          // Get the count of documents in the collection
          const urlCount = await urls.countDocuments({});

          // Create a new URL document
          const urlDoc = {
            url,
            short_url: urlCount + 1, // Increment by 1 to ensure unique short URL
          };

          // Insert the new URL document into the collection
          const result = await urls.insertOne(urlDoc);
          console.log(result);

          // Respond with the original URL and its corresponding short URL
          res.json({
            original_url: url,
            short_url: urlCount + 1,
          });
        } catch (dbError) {
          console.error('Database error:', dbError);
          res.status(500).json({ error: 'Database error' });
        }
      }
    });
  } catch (dnsError) {
    console.error('DNS lookup error:', dnsError);
    res.status(500).json({ error: 'DNS lookup error' });
  }
});

app.get("/api/shorturl/:short_url" , async (req,res)=>{

  const shorturl=req.params.short_url
  const urlDoc= await urls.findOne ({short_url: +shorturl})
  res.redirect(urlDoc.url);
})

app.listen(port, async () => {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log(`Listening on port ${port}`);
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  }
});
