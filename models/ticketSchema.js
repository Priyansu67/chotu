const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ticketSchema = new Schema(
  {
    ticketID: {
      type: String,
      required: true,
    },
    phone_number_id: {
      type: String,
      required: true,
    },
    conversation: [
      {
        role: {
          type: String,
          enum: ["user", "support"],
        },
        content: {
          type: String,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Ticket = mongoose.model("Ticket", ticketSchema);

module.exports = Ticket;
