const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();


require("dotenv").config();


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));


const mongoURI = process.env.MONGO_URL;
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));


const userSchema = new mongoose.Schema({
  _id: Number,
  name: String,
  email: { type: String, required: true, unique: true },
  password: String,
});
const User = mongoose.model("User", userSchema);

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "homepage.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "signup.html"));
});
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});
app.get("/videos", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "videos.html"));
});
app.get("/shorts", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "shorts.html"));
});
app.get("/feedback", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "feedback.html"));
});
app.get("/aboutme", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "about.html"));
});
app.get("/createnotes", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "createnotes.html"));
});
app.get("/savednotes", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "savednotes.html"));
});

app.get("/editnotes", (req, res) => {

  res.sendFile(path.join(__dirname, "public", "editnotes.html"));
});

const SECRET_KEY = "6Ldn_MQpAAAAAI9ClneX1OIMBZFFmlHEPbXtvEHR";
async function verifyRecaptcha(req, res, next) {
  const { recaptchaToken } = req.body;
  if (!recaptchaToken) {
    return res.status(400).send("reCAPTCHA token is missing");
  }
  try {
    const response = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      `secret=${SECRET_KEY}&response=${recaptchaToken}`,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    const data = response.data;
    if (data.success) {
      next();
    } else {
      res.status(400).send("reCAPTCHA verification failed");
    }
  } catch (error) {
    console.error("Error verifying reCAPTCHA:", error);
    res.status(500).send("Internal server error");
  }
}

app.post("/sign", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    

    const userId = await getNextSequence();

    const newUser = new User({ _id: userId, name, email, password: hashedPassword });

    await newUser.save();
    

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error signing up user:", err);
    res.status(500).json({ message: "An error occurred while signing up user" });
  }
});


app.post("/log", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: "Invalid password" });
    }
    res.json({
      success: true,
      message: `Congratulations ${user.name}, you have successfully logged in`,
      user,
    });
  } catch (error) {
    console.error("Error finding user:", error);
    res.status(500).json({ success: false, message: "An error occurred while processing your request" });
  }
});



const feedbackSchema = new mongoose.Schema({
  name: String,
  email: String,
  feedback: String,
});

const Feedback = mongoose.model("Feedback", feedbackSchema);

app.post("/submit-feedback", async (req, res) => {
  const feedbackData = req.body;

  const feedback = new Feedback(feedbackData);

  feedback
    .save()
    .then(() => {
      console.log("Feedback saved successfully");
      res.sendStatus(200);
    })
    .catch((error) => {
      console.error("Error saving feedback:", error);
      res.sendStatus(500);
    });
});
async function getNextSequence() {
  const userCount = await User.countDocuments();
  return userCount + 1;
}

const noteSchema = new mongoose.Schema({
  name: String,
  title: String,
  content: String
});
const Note = mongoose.model("Note", noteSchema);


app.post("/notes", async (req, res) => {
  try {
    const { name,title, content } = req.body;
    const newNote = new Note({ name,title, content });
    await newNote.save();
    res.status(201).send({ success: true })
  } catch (error) {
    console.error("Error creating note:", error);
    res.status(500).send("Internal server error.");
  }
});


app.get("/snotes", async (req, res) => {
  try {
    const personName = req.query.name; // Access name parameter from query string
    if (!personName) {
      return res.status(400).send("Name parameter is required.");
    }

    const notes = await Note.find({ name: personName });
    if (notes.length === 0) {
      return res.status(404).send("No notes found for this person.");
    }

    res.json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).send("Internal server error.");
  }
});


app.post("/note", async (req, res) => {
  try {
    const { name, title } = req.body;

    if (!name || !title) {
      return res.status(400).send("Both name and title parameters are required.");
    }

    const note = await Note.findOne({ name: name, title: title });
    if (!note) {
      return res.status(404).send("Note not found.");
    }
    res.json(note);
  } catch (error) {
    console.error("Error fetching note:", error);
    res.status(500).send("Internal server error.");
  }
});


app.put("/editnote", async (req, res) => {
  try {
    const { name, title, content } = req.body;

    if (!name || !title || !content) {
      return res.status(400).send("Name, title, and content parameters are required.");
    }

    const updatedNote = await Note.findOneAndUpdate(
      { name: name, title: title },
      { content: content },
      { new: true }
    );

    if (!updatedNote) {
      return res.status(404).send("Note not found.");
    }

    res.send("Note updated successfully.");
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).send("Internal server error.");
  }
});


app.delete("/note", async (req, res) => {
    try {
        const { name, title } = req.body;

        if (!name || !title) {
            return res.status(400).send("Name and title parameters are required.");
        }

        const deletedNote = await Note.findOneAndDelete({ name, title });
        if (!deletedNote) {
            return res.status(404).send("Note not found.");
        }
        res.send("Note deleted successfully.");
    } catch (error) {
        console.error("Error deleting note:", error);
        res.status(500).send("Internal server error.");
    }
});




const PORT = process.env.PORT || 3000;
app.listen(PORT);
