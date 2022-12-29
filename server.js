import { Configuration } from "openai";
import { OpenAIApi } from "openai";
import express from 'express';
import bodyParser from "body-parser";
import axios from "axios";
import cors from 'cors';
import * as dotenv from "dotenv";

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const app = express();
app.use(cors());
app.use(express.json());

//Whatsapp Part

app.use(bodyParser.json());

const access_token = process.env.ACCESS_TOKEN;
const my_token = process.env.MY_TOKEN;

app.get("/", (req, res) => {
    res.send("Hey, I am working");
});


app.get("/webhook", (req, res) => {
  let mode = req.query["hub.mode"];
  let challenge = req.query["hub.challenge"];
  let token = req.query["hub.verify_token"];

  if (mode && token) {
    if (mode === "subscribe" && token === my_token) {
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

app.post("/webhook",async (req, res) => {
  let body = req.body;

  console.log(body.json());

  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0].value.message &&
      body.entry[0].changes[0].value.message[0]
    ) {
      let phone_number_id =
        body.entry[0].changes[0].value.metadata.phone_number_id;
      let from = body.entry[0].changes[0].value.messages[0].from;
      let message = body.entry[0].changes[0].value.messages[0].text.body;
      let response;

      try {
        const prompt = message;
        response = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: `${prompt}`,
            temperature: 0.7,
            max_tokens: 5000,
            top_p: 1,
            frequency_penalty: 0.6,
            presence_penalty: 0.3,
          });
        
    } catch (error) {
        console.log(error);
        res.status(500).send({error});
    }

      axios({
        method: "post",
        url: `https://graph.facebook.com/v15.0/${phone_number_id}/messages?access_token=${access_token}`,
        data: {
          messaging_product: "whatsapp",
          to: from,
          text: {
            body: response.data.choices[0].text,
          },
        },
        headers: {
          "Content-Type": "application/json",
        },
      });

      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  }
});

app.listen(5000 || process.env.PORT, () => console.log("webhook is listening"));
