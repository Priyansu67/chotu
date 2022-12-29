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
  const { mode, challenge, verify_token: token } = req.query;

  if (mode && token) {
    if (mode === 'subscribe' && token === myToken) {
      res.status(200).send(challenge);
      console.log('Webhook subscription verified');
    } else {
      res.sendStatus(403);
      console.error('Invalid webhook subscription');
    }
  } else {
    res.sendStatus(400);
    console.error('Missing webhook parameters');
  }
});

app.post("/",async (req, res) => {
  let body = req.body;

  console.log(body.json());

  if (body.object) {
    if (
      body.entry[0].changes[0].value.message &&
      body.entry[0].changes[0].value.message[0]
    ) {
      let phone_number_id =
        process.env.MY_ID;
      let from = body.entry[0].changes[0].value.messages[0].from;
      let message = body.entry[0].changes[0].value.messages[0].text.body;
      let response;

      console.log(phone_number_id);
      console.log(from);
      console.log(message);

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

          console.log(response.data.choices[0].text)
        
    } catch (error) {
        console.log(error);
        res.status(500).send({error});
    }

      axios({
        method: "post",
        url: `https://graph.facebook.com/v15.0/${phone_number_id}/messages?access_token=${access_token}`,
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          messaging_product: "whatsapp",
          to: from,
          type: "text",
          text: {
            body: `${response.data.choices[0].text}`,
          },
        },
        
      }).then(function (response) {
        console.log(JSON.stringify(response.data));
      })
      .catch(function (error) {
        console.log(error);
      });  
    }
  }
});

app.listen(5000 || process.env.PORT, () => console.log("Server is running on port "+ process.env.PORT));
